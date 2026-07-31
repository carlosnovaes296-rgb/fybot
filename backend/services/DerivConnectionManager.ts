import { WebSocket as NodeWebSocket } from 'ws';

export class DerivConnectionManager {
  private userSockets: Map<string, NodeWebSocket> = new Map();
  private userPeakProfits: Map<string, Record<string, number>> = new Map();
  // guarda a última tendência de mercado (regime) reportada para cada usuário.
  // Usado em executeSignal() para só deixar abrir ordem a favor da tendência.
  private userTrend: Map<string, string> = new Map();
  // trava REDUNDANTE de "1 ordem por vez", que vive só dentro desta classe
  // (não depende de getUserState). Fonte da verdade vinda direto da corretora
  // (mensagens 'portfolio' e 'buy'/'proposal_open_contract').
  private openContractIds: Map<string, Set<string>> = new Map();

  // NOVO (Requisito 4): lote manual por usuário. Quando definido (> 0), tem
  // prioridade sobre o cálculo automático em % da banca. `null`/ausente = modo
  // automático.
  private manualStakes: Map<string, number> = new Map();

  // NOVO (Requisito 4): percentual da banca usado no cálculo automático de
  // lote, configurável por usuário (padrão 5%, igual ao comportamento antigo).
  private autoStakePercent: Map<string, number> = new Map();

  // NOVO (Requisito 7): valor em dólar do Take Profit atualmente registrado na
  // corretora para cada contrato aberto. É a "âncora" que só pode SUBIR — nunca
  // é reduzida, mesmo que o lucro recue (a proteção de queda é feita pelo
  // trailing de 10%, Requisito 5, que é uma trava separada).
  private userTpAnchor: Map<string, Record<string, number>> = new Map();

  // Fila de TPs pendentes, pois o DCA pode disparar ordens em sequência
  private pendingTpQueue: Map<string, number[]> = new Map();

  // NOVO (DCA - Ordens 1 a 6): estado do grid de médias por usuário.
  private userDcaState: Map<string, {
    direction: 'BUY' | 'SELL';
    anchorPrice: number;
    ordersOpened: number;
    tpDistancePct: number;
    slDistancePct: number;
    lastLogTime?: number;
  }> = new Map();

  // Níveis espaçados para suportar o TP longo de 0.50%: 0.20%, 0.40%, 0.60%, 0.80%, 1.20%
  private static readonly DCA_RETRACEMENT_LEVELS = [0.0002, 0.0004, 0.0006, 0.0008, 0.0012];
  private static readonly MAX_DCA_ORDERS = 6;

  constructor(
    private getUserState: (userId: string) => any,
    public addUserLog: (userId: string, msg: string) => void,
    private getUsers: () => any[]
  ) { }

  // NOVO (Requisito 4): define um lote manual fixo para o usuário. Passe null
  // (ou <= 0) para voltar ao modo automático (% da banca).
  public setManualStake(userId: string, amount: number | null) {
    if (amount && amount > 0) {
      this.manualStakes.set(userId, amount);
      this.addUserLog(userId, `🛠️ [LOTE MANUAL] Lote fixo definido para $${amount.toFixed(2)} por ordem.`);
    } else {
      this.manualStakes.delete(userId);
      this.addUserLog(userId, `🛠️ [LOTE AUTOMÁTICO] Voltando ao cálculo automático (% da banca).`);
    }
  }

  // NOVO (Requisito 4): permite ajustar o percentual da banca usado no cálculo
  // automático de lote (padrão 5% se nunca configurado).
  public setAutoStakePercent(userId: string, percent: number) {
    if (percent > 0 && percent <= 1) {
      this.autoStakePercent.set(userId, percent);
      this.addUserLog(userId, `🛠️ [RISCO] Percentual automático de lote ajustado para ${(percent * 100).toFixed(1)}% da banca.`);
    }
  }

  public async start(userId: string) {
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) return;

    const state = this.getUserState(userId);
    const activeToken = user.activeAccountType === 'REAL' ? user.derivTokenReal : user.derivTokenDemo;
    let tokenToUse = activeToken || user.derivToken;

    if (!tokenToUse) {
      this.addUserLog(userId, `⚠️ [SEM TOKEN] Nenhum token configurado para a conta ${user.activeAccountType}.`);
      return;
    }

    if (this.userSockets.has(userId)) {
      this.stop(userId);
    }

    const tokenStart = tokenToUse.substring(0, 8);
    this.addUserLog(userId, `🔄 Iniciando conexão [Modo ${user.activeAccountType}] usando Token: ${tokenStart}...`);

    const appId = "33TVM6cBQ9GfSjbwQHHdE";
    let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=PT`;
    let needsAuthCommand = true;
    try {
      const origin = "https://fybot.life";
      const BASE = "https://api.derivws.com/trading/v1";

      const headers = {
        'Authorization': `Bearer ${tokenToUse}`,
        'Deriv-App-ID': appId,
        'Origin': origin,
        'Content-Type': 'application/json'
      };

      this.addUserLog(userId, `📡 Identificando a conta na API V2...`);
      const resContas = await fetch(`${BASE}/options/accounts`, { headers });
      const contasData = await resContas.json();

      const contasArray = contasData.accounts || contasData.data || contasData;
      if (Array.isArray(contasArray) && contasArray.length > 0) {
        const isDemo = user.activeAccountType === 'DEMO';
        let contaAlvo = null;
        if (isDemo) {
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return id.includes('VRT') || id.startsWith('VR');
          });
          if (!contaAlvo) {
            contaAlvo = contasArray.find((a: any) => {
              const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
              return id.includes('VOT') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo';
            });
          }
        } else {
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return !(id.includes('VRT') || id.includes('VOT') || id.startsWith('VR') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo');
          });
        }

        if (!contaAlvo) {
          this.addUserLog(userId, isDemo
            ? "❌ [ERRO] Token da Conta DEMO Inválido! Crie o token no site da Deriv ENQUANTO estiver logado na sua conta VIRTUAL (VRT)."
            : "❌ [ERRO] Conta Real não encontrada neste token.");
          const stateOnFail = this.getUserState(userId);
          if (stateOnFail) stateOnFail.botRunning = false;
          this.stop(userId);
          return;
        }

        this.addUserLog(userId, `🔍 Conta encontrada: ${JSON.stringify(contaAlvo)}`);

        const accountId = contaAlvo.loginid || contaAlvo.account_id || contaAlvo.id || contaAlvo.client_id || contaAlvo.oauth_client_id;

        if (contaAlvo.balance != null) {
          const bal = parseFloat(contaAlvo.balance);
          const state = this.getUserState(userId);
          state.balance = bal;
          state.equity = bal;
          this.addUserLog(userId, `💵 Saldo inicial capturado via API: $${bal}`);
        }

        if (!accountId) {
          this.addUserLog(userId, `⚠️ Erro: Não foi possível extrair o ID da conta do objeto acima.`);
          throw new Error("ACCOUNT_ID_MISSING: Não foi possível extrair o ID da conta retornada pela Deriv.");
        }

        this.addUserLog(userId, `📡 Solicitando URL Segura (OTP) para a conta ${accountId}...`);
        const resOtp = await fetch(`${BASE}/options/accounts/${accountId}/otp`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({})
        });
        const otpData = await resOtp.json();

        const urlSegura = otpData?.data?.url || otpData.ws_url || otpData.websocket_url || otpData.url;
        if (urlSegura) {
          wsUrl = urlSegura;
          needsAuthCommand = false;
          this.addUserLog(userId, `🎉 URL Mágica Autenticada gerada! Conectando...`);
        } else {
          this.addUserLog(userId, `⚠️ Erro ao gerar OTP. Detalhes: ${JSON.stringify(otpData)}`);
        }
      } else {
        this.addUserLog(userId, `⚠️ Falha ao listar contas: ${JSON.stringify(contasData)}`);
      }
    } catch (e: any) {
      if (typeof e?.message === 'string' && e.message.startsWith('ACCOUNT_ID_MISSING')) {
        this.addUserLog(userId, `⚠️ Não foi possível identificar a conta (sem ID reconhecível), caindo para o Fallback V3.`);
      } else {
        this.addUserLog(userId, `⚠️ Erro de rede na V2, caindo para o Fallback V3: ${e.message}`);
      }
    }
    // ---------------------------------

    const ws = new NodeWebSocket(wsUrl, {
      headers: {
        'Origin': 'https://fybot.life',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });

    this.userSockets.set(userId, ws);
    if (!this.userPeakProfits.has(userId)) this.userPeakProfits.set(userId, {});
    if (!this.openContractIds.has(userId)) this.openContractIds.set(userId, new Set());
    if (!this.userTpAnchor.has(userId)) this.userTpAnchor.set(userId, {});
    if (!this.pendingTpQueue.has(userId)) this.pendingTpQueue.set(userId, []);
    let pingInterval: NodeJS.Timeout;
    let portfolioInterval: NodeJS.Timeout;

    ws.on('open', () => {
      this.addUserLog(userId, `✅ [WS] Conectado à Deriv!`);

      pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      }, 25000);

      portfolioInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ portfolio: 1 }));
        }
      }, 20000);

      if (needsAuthCommand) {
        this.addUserLog(userId, `Autenticando via fluxo clássico V3...`);
        ws.send(JSON.stringify({ authorize: tokenToUse }));
      } else {
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ portfolio: 1 }));
        ws.send(JSON.stringify({ profit_table: 1, description: 1, limit: 25 }));
      }
    });

    // ⚠️ CORREÇÃO CRÍTICA: todo o processamento de mensagem agora está dentro
    // de um try/catch. Antes, um JSON.parse ou qualquer erro inesperado aqui
    // dentro (ex: mensagem truncada/corrompida vinda da Deriv, campo undefined
    // sendo acessado, etc.) virava uma exceção NÃO TRATADA dentro do callback
    // de evento do WebSocket. Isso derruba o processo Node inteiro (crash),
    // que é exatamente o que causa o "502 Bad Gateway" do nginx quando você dá
    // F5: o nginx tenta repassar a requisição pro backend e o backend não está
    // mais rodando (ou está no meio de um restart do processo).
    ws.on('message', (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.msg_type === 'authorize') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO AUTH] Token inválido: ${data.error.message}`);
            ws.close();
            return;
          }
          ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
          ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
          ws.send(JSON.stringify({ portfolio: 1 }));
          ws.send(JSON.stringify({ profit_table: 1, description: 1, limit: 25 }));
          this.addUserLog(userId, `✅ [WS] Monitoramento de saldo e contratos ativado.`);
        }

        if (data.msg_type === 'profit_table' && data.profit_table && data.profit_table.transactions) {
          const state = this.getUserState(userId);
          data.profit_table.transactions.forEach((tx: any) => {
            const id = String(tx.contract_id);
            const exists = state.trades.find((t: any) => String(t.id) === id);
            if (!exists) {
              const rawSymbol = tx.shortcode ? tx.shortcode.split('_')[1] : '';
              const parsedSymbol = rawSymbol ? rawSymbol.replace(/frx/i, '').replace('R_', 'Volatility ') : 'XAUUSD';
              state.trades.push({
                id,
                symbol: parsedSymbol || 'UNKNOWN',
                type: tx.sell_price > tx.buy_price ? 'BUY' : 'SELL', // Approximation
                lot: 1, // We don't have lot size in profit table
                openPrice: tx.buy_price,
                time: new Date(tx.purchase_time * 1000).toISOString(),
                status: 'CLOSED',
                profit: tx.sell_price - tx.buy_price
              });
            } else if (exists.status === 'OPEN') {
              exists.status = 'CLOSED';
              exists.profit = tx.sell_price - tx.buy_price;
            }
          });
          // Sort by time
          state.trades.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
          this.addUserLog(userId, `📊 Histórico de ordens fechadas carregado da Deriv.`);
        }

        if (data.msg_type === 'portfolio') {
          const state = this.getUserState(userId);
          if (data.portfolio && data.portfolio.contracts) {
            const activeContracts = data.portfolio.contracts.map((c: any) => String(c.contract_id));

            this.openContractIds.set(userId, new Set(activeContracts));

            let ghostFound = false;

            state.trades.forEach((trade: any) => {
              if (trade.status === 'OPEN' && !activeContracts.includes(String(trade.id)) && !String(trade.id).startsWith('PENDING')) {
                trade.status = 'CLOSED';
                ghostFound = true;
              }
            });

            if (ghostFound) {
              this.addUserLog(userId, `🧹 [SISTEMA] Limpeza Automática: Ordem que fechou enquanto o bot estava offline foi removida da memória.`);
            }

            // Import active contracts that are not in state.trades
            let newOpenFound = false;
            data.portfolio.contracts.forEach((c: any) => {
              const id = String(c.contract_id);
              const exists = state.trades.find((t: any) => String(t.id) === id);
              if (!exists) {
                const rawSymbol = c.shortcode ? c.shortcode.split('_')[1] : c.symbol || '';
                const parsedSymbol = rawSymbol ? rawSymbol.replace(/frx/i, '').replace('R_', 'Volatility ') : 'XAUUSD';
                state.trades.push({
                  id,
                  symbol: parsedSymbol || 'UNKNOWN',
                  type: c.contract_type === 'CALL' || c.contract_type === 'MULTUP' ? 'BUY' : c.contract_type === 'PUT' || c.contract_type === 'MULTDOWN' ? 'SELL' : c.contract_type,
                  lot: c.buy_price,
                  openPrice: 0, // Será preenchido pelo proposal_open_contract com o entry_spot real
                  time: new Date((c.purchase_time || c.date_start) * 1000).toISOString(),
                  status: 'OPEN',
                  profit: 0
                });
                newOpenFound = true;
              }
            });

            if (newOpenFound) {
              // Sort by time
              state.trades.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            }
          }
        }

        if (data.msg_type === 'balance') {
          const state = this.getUserState(userId);
          const bal = data.balance.balance;
          state.balance = bal;
          if (!state.equity || state.trades.filter((t: any) => t.status === 'OPEN').length === 0) {
            state.equity = bal;
          }
        }

        // Monitoramento de Contratos (TP dinâmico + Trailing de proteção + Equity)
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
          const state = this.getUserState(userId);
          const contract = data.proposal_open_contract;
          const profit = contract.profit;
          const contractId = String(contract.contract_id);
          const isSold = contract.is_sold === 1;

          state.equity = state.balance + profit;

          const trade = state.trades.find((t: any) => String(t.id) === contractId);
          if (trade) {
            trade.profit = profit;

            if (!trade.openPrice || trade.openPrice === 0) {
              trade.openPrice = contract.entry_spot || contract.current_spot || 0;
            }

            // NOVO: Verificação inteligente de encerramento do dia (Smart Close / Sacrifício)
            if (state.dailyTarget && state.dailyTarget > 0 && state.dailyProfit >= state.dailyTarget) {
              const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
              if (openTrades.length > 0) {
                const floatingPnL = openTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
                // Verifica se a perda flutuante é menor que 5% do lucro do dia, OU se o flutuante está positivo
                if ((floatingPnL < 0 && Math.abs(floatingPnL) < (state.dailyProfit * 0.05)) || floatingPnL >= 0) {
                  const now = Date.now();
                  if (!state.lastSmartCloseTime || now - state.lastSmartCloseTime > 3000) {
                    state.lastSmartCloseTime = now;
                    const isLoss = floatingPnL < 0;
                    this.addUserLog(userId, `🏆 [SAQUE INTELIGENTE] Meta diária atingida! O flutuante atual ($${floatingPnL.toFixed(2)}) ${isLoss ? 'é menor que 5% do ganho do dia' : 'está positivo'}. Fechando todas as ordens abertas imediatamente para encerrar o expediente!`);
                    openTrades.forEach((t: any) => {
                      this.closeTrade(userId, String(t.id));
                    });
                  }
                }
              }
            }

            if (isSold) {
              if (trade.status !== 'CLOSED') {
                trade.status = 'CLOSED';
                state.dailyProfit += profit;
                this.openContractIds.get(userId)?.delete(contractId);
                const anchors = this.userTpAnchor.get(userId);
                if (anchors) delete anchors[contractId];
                this.addUserLog(userId, `💵 [FECHADO] Contrato ${contractId} fechado com ${profit >= 0 ? 'LUCRO' : 'PREJUÍZO'} de $${profit.toFixed(2)}`);

                const openTradesCount = state.trades.filter((t: any) => t.status === 'OPEN').length;
                if (openTradesCount === 0) {
                  if (this.userDcaState.has(userId)) {
                    this.addUserLog(userId, `🔄 [DCA] Ciclo finalizado. Robô livre para buscar nova entrada (Ordem 1).`);
                    this.userDcaState.delete(userId);
                  }
                }
              }
            } else {
              // Lógica de DCA (Ordens 2 a 6)
              let dcaState = this.userDcaState.get(userId);

              if (!dcaState) {
                const openTradesList = state.trades
                  .filter((t: any) => t.status === 'OPEN')
                  .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
                if (openTradesList.length > 0) {
                  const direction = contract.contract_type === 'MULTUP' ? 'BUY' : 'SELL';
                  // CORREÇÃO: a âncora do grid deve ser o preço de entrada da
                  // Ordem 1 (a mais ANTIGA aberta), não o entry_spot/current_spot
                  // do contrato cujo tick chegou primeiro após a reconexão (podia
                  // ser a Ordem 3, 4 etc., distorcendo o cálculo de % de recuo).
                  const oldestTrade = openTradesList[0];
                  const reconstructedAnchor = (oldestTrade && oldestTrade.openPrice)
                    ? oldestTrade.openPrice
                    : (contract.entry_spot || contract.current_spot);
                  dcaState = {
                    direction,
                    anchorPrice: reconstructedAnchor,
                    ordersOpened: openTradesList.length,
                    tpDistancePct: 0.005,
                    slDistancePct: 0.005
                  };
                  this.userDcaState.set(userId, dcaState);
                  this.addUserLog(userId, `🔄 [SISTEMA] Estado DCA reconstruído para ordem órfã após reinício (Direção: ${direction}, Ordens: ${openTradesList.length}, Âncora: ${reconstructedAnchor}).`);
                }
              }

              if (dcaState && dcaState.ordersOpened < DerivConnectionManager.MAX_DCA_ORDERS) {
                const currentSpot = contract.current_spot;

                // Captura a âncora exata no primeiro tick da Ordem 1, se ela foi criada pelo executeSignal com valor 0
                if (dcaState.ordersOpened === 1 && dcaState.anchorPrice === 0) {
                  const initialAnchor = contract.entry_spot || contract.current_spot;
                  if (initialAnchor) {
                    dcaState.anchorPrice = initialAnchor;
                    this.userDcaState.set(userId, dcaState);
                    this.addUserLog(userId, `⚓ [DCA] Âncora fixada no preço de entrada inicial: ${initialAnchor}`);
                  }
                }

                if (currentSpot && dcaState.anchorPrice > 0) {
                  const diffPct = (currentSpot - dcaState.anchorPrice) / dcaState.anchorPrice;
                  const isAgainstBuy = dcaState.direction === 'BUY' && diffPct < 0;
                  const isAgainstSell = dcaState.direction === 'SELL' && diffPct > 0;

                  const targetLevelIndex = dcaState.ordersOpened - 1; // Ordem 2 = índice 0
                  const triggerRecuo = DerivConnectionManager.DCA_RETRACEMENT_LEVELS[targetLevelIndex];

                  const now = Date.now();
                  if (!dcaState.lastLogTime || now - dcaState.lastLogTime > 15000) {
                    dcaState.lastLogTime = now;
                    this.userDcaState.set(userId, dcaState);
                    if (triggerRecuo) {
                      const isAgainst = isAgainstBuy || isAgainstSell;
                      const status = isAgainst ? 'CONTRA (Aguardando DCA)' : 'A FAVOR (Lucro)';
                      this.addUserLog(userId, `🔎 [DCA DEBUG] Ordem ${dcaState.ordersOpened} | Preço Atual: ${Number(currentSpot).toFixed(2)} | Status: ${status} | Distância: ${(Math.abs(diffPct) * 100).toFixed(4)}% | Gatilho Ordem ${dcaState.ordersOpened + 1}: ${(triggerRecuo * 100).toFixed(4)}%`);
                    }
                  }

                  if (isAgainstBuy || isAgainstSell) {
                    const absRecuo = Math.abs(diffPct);

                    if (triggerRecuo && absRecuo >= triggerRecuo) {
                      dcaState.ordersOpened++; // Incrementa antes para evitar duplo disparo
                      this.userDcaState.set(userId, dcaState);
                      this.addUserLog(userId, `⚠️ [DCA] Recuo de ${(absRecuo * 100).toFixed(2)}% atingido! Disparando Ordem ${dcaState.ordersOpened} do grid (Direção: ${dcaState.direction}).`);

                      const tpPrice = dcaState.direction === 'BUY' ? currentSpot * (1 + dcaState.tpDistancePct) : currentSpot * (1 - dcaState.tpDistancePct);
                      const slPrice = dcaState.direction === 'BUY' ? currentSpot * (1 - dcaState.slDistancePct) : currentSpot * (1 + dcaState.slDistancePct);

                      this.placeOrder(userId, state, dcaState.direction, currentSpot, tpPrice, slPrice);
                    }
                  }
                }
              }

              // Requisito 5: PROTEÇÃO DE BANCA (Trailing Stop)
              // Acompanha o preço enquanto a ordem estiver no positivo. Se o lucro
              // recuar 10% em relação ao topo já alcançado, fecha automaticamente
              // para proteger o que já foi ganho (trava 90% do pico).
              if (!this.userPeakProfits.has(userId)) {
                this.userPeakProfits.set(userId, {});
              }
              const peaks = this.userPeakProfits.get(userId)!;
              if (!peaks[contractId]) peaks[contractId] = 0;

              const numProfit = Number(profit || 0);
              const numPeak = Number(peaks[contractId] || 0);

              if (numProfit > numPeak) {
                peaks[contractId] = numProfit;
              }

              const TRAILING_RETRACEMENT = 0.10; // 10% de recuo do topo
              if (numPeak > 0.50 && numProfit < (numPeak * (1 - TRAILING_RETRACEMENT))) {
                this.addUserLog(userId, `🛡️ [TRAILING SL] Recuo de 10% detectado! Lucro caiu de $${numPeak.toFixed(2)} para $${numProfit.toFixed(2)}. Fechando para proteger a banca (90% do topo)!`);
                ws.send(JSON.stringify({ sell: contractId, price: 0 }));
                peaks[contractId] = 0; // Reseta para evitar spam
              }

              // Requisito 7: TP DINÂMICO — acompanha os picos do preço, NUNCA recua.
              // Diferente do trailing acima (que FECHA a ordem no recuo), aqui nós
              // apenas EMPURRAMOS o alvo de take_profit registrado na corretora para
              // mais longe conforme o lucro atinge novos picos. Se o lucro cair, o
              // alvo simplesmente permanece onde estava — nunca é reduzido.
              const anchors = this.userTpAnchor.get(userId) || {};
              const currentAnchor = anchors[contractId];
              if (currentAnchor !== undefined && currentAnchor > 0 && profit > 0) {
                // Quando o lucro se aproxima do alvo atual (90%+), estica o alvo mais
                // um pouco (50% do valor do alvo atual, mínimo $0.50) para deixar o
                // preço continuar correndo a favor da tendência.
                const numCurrentAnchor = Number(currentAnchor || 0);
                if (numProfit >= numCurrentAnchor * 0.9) {
                  const newAnchor = parseFloat((numCurrentAnchor + Math.max(numCurrentAnchor * 0.5, 0.50)).toFixed(2));
                  ws.send(JSON.stringify({
                    contract_update: 1,
                    contract_id: contractId,
                    limit_order: { take_profit: newAnchor }
                  }));
                  anchors[contractId] = newAnchor; // só aumenta, nunca reduz
                  this.userTpAnchor.set(userId, anchors);
                  this.addUserLog(userId, `🎯 [TP DINÂMICO] Alvo de lucro elevado de $${currentAnchor.toFixed(2)} para $${newAnchor.toFixed(2)} (acompanhando o pico do preço).`);
                }
              }
            }
          }

        }

        // Resposta da Compra
        if (data.msg_type === 'buy') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO DERIV] Falha ao abrir ordem: ${data.error.message} - DETALHES: ${JSON.stringify(data.error)}`);
            console.error(`[DerivConnectionManager] Erro na compra para ${userId}:`, data.error);
            const state = this.getUserState(userId);
            state.trades = (state.trades || []).filter((t: any) => !t.id.startsWith('PENDING_'));

            // Libera o motor se a Ordem 1 falhou
            const dcaState = this.userDcaState.get(userId);
            if (dcaState && dcaState.ordersOpened === 1) {
              this.userDcaState.delete(userId);
              this.addUserLog(userId, `🔄 [SISTEMA] Motor destravado (Ordem 1 falhou).`);
            } else if (dcaState && dcaState.ordersOpened > 1) {
              dcaState.ordersOpened--;
              this.userDcaState.set(userId, dcaState);
            }
          } else {
            const contractId = String(data.buy.contract_id || data.buy.transaction_id);
            console.log(`[DerivConnectionManager] Ordem aberta com sucesso para ${userId}!`);
            this.addUserLog(userId, `🚀 Ordem aberta na corretora com sucesso! ID: ${contractId}`);

            if (!this.openContractIds.has(userId)) this.openContractIds.set(userId, new Set());
            this.openContractIds.get(userId)!.add(contractId);

            // TP Inicial com suporte a Fila (DCA)
            const tpQueue = this.pendingTpQueue.get(userId) || [];
            if (tpQueue.length > 0) {
              const initialTp = tpQueue.shift()!;
              const anchors = this.userTpAnchor.get(userId) || {};
              anchors[contractId] = initialTp;
              this.userTpAnchor.set(userId, anchors);
              this.pendingTpQueue.set(userId, tpQueue);
            }

            const state = this.getUserState(userId);
            // CORREÇÃO: pode haver mais de uma ordem "PENDING_" ao mesmo tempo
            // quando o DCA dispara entradas em sequência rápida. Como state.trades
            // recebe cada nova ordem via unshift() (mais nova primeiro), pegar o
            // PRIMEIRO match do array pegava a ordem mais RECENTE, mas a confirmação
            // 'buy' que está chegando agora é da ordem mais ANTIGA ainda pendente
            // (respostas da Deriv chegam na mesma ordem em que foram enviadas).
            // Por isso ordenamos por tempo e pegamos a mais antiga pendente.
            const pendingTrades = state.trades
              .filter((t: any) => String(t.id).startsWith('PENDING_'))
              .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            if (pendingTrades.length > 0) {
              pendingTrades[0].id = contractId;
            }
          }
        }

        if (data.error && data.msg_type !== 'buy' && data.msg_type !== 'contract_update') {
          this.addUserLog(userId, `⚠️ [ERRO CORRETORA] (${data.msg_type}): ${data.error.message}`);
          console.error(`[DerivConnectionManager] Erro Genérico:`, data.error);
        }

        // Resposta do Contract Update (usado agora pelo TP dinâmico, Requisito 7)
        if (data.msg_type === 'contract_update') {
          if (data.error) {
            this.addUserLog(userId, `⚠️ [AVISO] Falha ao atualizar limites (TP/SL) na ordem: ${data.error.message}.`);
            console.error(`[DerivConnectionManager] Erro no contract_update:`, data.error.message);
          } else {
            this.addUserLog(userId, `✅ [SUCESSO] Take Profit atualizado na corretora!`);
          }
        }

        if (data.msg_type === 'sell') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO DERIV] Falha ao fechar ordem manualmente: ${data.error.message}`);
            console.error(`Erro ao vender: ${data.error.message}`);
          }
        }
      } catch (err: any) {
        // Antes esta exceção não era capturada e derrubava o processo Node
        // inteiro (causa raiz do 502/tela branca ao dar F5). Agora só logamos
        // e seguimos vivos — a próxima mensagem do WebSocket continua normal.
        console.error(`[DerivConnectionManager] Erro ao processar mensagem WS para ${userId}:`, err);
        this.addUserLog(userId, `⚠️ [ERRO INTERNO] Falha ao processar uma mensagem da corretora (ignorada para manter o robô no ar): ${err?.message || err}`);
      }
    });

    ws.on('error', (err: any) => {
      clearInterval(pingInterval);
      clearInterval(portfolioInterval);
      if (err.message === 'WebSocket was closed before the connection was established') {
        return; // Ignora este erro, acontece quando o usuário clica em PARAR logo após INICIAR
      }
      this.addUserLog(userId, `🚨 [ERRO WS] Falha ao conectar: ${err.message}`);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      clearInterval(portfolioInterval);
      this.userSockets.delete(userId);
      const state = this.getUserState(userId);
      if (state && state.botRunning) {
        this.addUserLog(userId, `⚠️ Conexão de envio de ordens perdida. Tentando reconectar...`);
        setTimeout(() => {
          const checkState = this.getUserState(userId);
          if (checkState && checkState.botRunning) {
            this.start(userId);
          }
        }, 5000);
      }
    });
  }

  public stop(userId: string) {
    const ws = this.userSockets.get(userId);
    if (ws) {
      ws.close();
      this.userSockets.delete(userId);
      this.addUserLog(userId, `⏸️ Conexão WS encerrada.`);
    }
    this.userPeakProfits.delete(userId);
    this.openContractIds.delete(userId);
    this.userTpAnchor.delete(userId);
    this.pendingTpQueue.delete(userId);
    this.userDcaState.delete(userId);
  }

  public async closeTrade(userId: string, contractId: string) {
    const ws = this.userSockets.get(userId);
    if (ws && ws.readyState === 1) { // 1 = OPEN
      ws.send(JSON.stringify({ sell: Number(contractId), price: 0 }));
      this.addUserLog(userId, `🛠️ Enviando comando manual para FECHAR contrato (ID: ${contractId})...`);
      return true;
    }
    this.addUserLog(userId, `⚠️ [AVISO] Botão FECHAR ignorado pois o robô parece estar desconectado da corretora no momento.`);
    return false;
  }

  public executeSignal(userId: string, direction: 'BUY' | 'SELL', price: number, reason: string, engineTp: number, engineSl: number) {
    const state = this.getUserState(userId);

    const openTradesCount = state.trades.filter((t: any) => t.status === 'OPEN').length;

    // DEBUG: Vamos printar exatamente o que o motor de ordens está vendo
    this.addUserLog(userId, `🛠️ [DEBUG EXEC] Sinal recebido: ${direction} | Ordens abertas: ${openTradesCount} | DCA Ativo: ${this.userDcaState.has(userId)}`);

    // Bloqueio de Meta Diária
    if (state.dailyTarget && state.dailyTarget > 0 && state.dailyProfit >= state.dailyTarget) {
      this.addUserLog(userId, `🏆 [META BATIDA] Meta diária ($${state.dailyTarget.toFixed(2)}) atingida. O robô não abrirá novas ordens iniciais hoje.`);
      return;
    }

    // Requisito 6: Filtro de Tendência - só abre ordem se a direção do sinal
    // estiver a favor do regime de mercado atual (definido via handleRegimeChange,
    // alimentado pelo cruzamento EMA8/EMA21 do motor). Nunca abre contra a tendência.
    const trend = this.userTrend.get(userId);
    if (trend) {
      const trendFavorsBuy = trend === 'TREND_UP' || trend === 'LATERAL';
      const trendFavorsSell = trend === 'TREND_DOWN' || trend === 'LATERAL';
      if ((direction === 'BUY' && !trendFavorsBuy) || (direction === 'SELL' && !trendFavorsSell)) {
        this.addUserLog(userId, `⛔ [CONTRA-TENDÊNCIA] Sinal de ${direction} ignorado: tendência atual é ${trend}.`);
        return;
      }
    } else {
      this.addUserLog(userId, `⚠️ [TENDÊNCIA DESCONHECIDA] Ainda não recebi o regime de mercado. Permitindo sinal de ${direction} por padrão.`);
    }

    if (openTradesCount > 0 || this.userDcaState.has(userId)) {
      // Ignorando sinal do motor pois já estamos com grid rodando (Ordem 1 já foi feita).
      return;
    }

    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== 1) {
      this.addUserLog(userId, `⚠️ Erro: Sinal recebido, mas WebSocket offline. Conecte o robô primeiro.`);
      return;
    }

    this.addUserLog(userId, `🚀 [SINAL RECEBIDO] ${reason}. Executando Ordem 1 (${direction})...`);

    // Inicia o Grid de DCA guardando o estado do ciclo
    this.userDcaState.set(userId, {
      direction,
      anchorPrice: 0, // Será atualizado com o entry_spot exato no primeiro tick do contrato
      ordersOpened: 1,
      tpDistancePct: Math.abs((engineTp - price) / price),
      slDistancePct: Math.abs((engineSl - price) / price)
    });

    this.placeOrder(userId, state, direction, price, engineTp, engineSl);
  }

  private placeOrder(userId: string, state: any, direction: 'BUY' | 'SELL', price: number, engineTp: number, engineSl: number) {
    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== 1) return;

    const balance = state.balance > 0 ? state.balance : 1000;
    const manualStake = this.manualStakes.get(userId);
    // O usuário solicitou que o lote seja fixo, abandonando o cálculo de % da banca.
    // Lote fixo padrão será 5.00 a pedido do usuário.
    const dynamicStake = manualStake && manualStake > 0
      ? parseFloat(manualStake.toFixed(2))
      : 5.00;

    const contractType = direction === 'BUY' ? 'MULTUP' : 'MULTDOWN';
    const multiplierValue = 100;

    let tpAmount = parseFloat((Math.abs((engineTp - price) / price) * dynamicStake * multiplierValue).toFixed(2));
    let slAmount = parseFloat((Math.abs((engineSl - price) / price) * dynamicStake * multiplierValue).toFixed(2));

    // A Deriv exige um mínimo absoluto de 0.10 USD para qualquer Take Profit ou Stop Loss (LimitOrderAmountTooLow).
    // Se o cálculo matemático for menor que 0.10, temos que forçar 0.10 para a ordem ser aceita.
    if (tpAmount < 0.10) tpAmount = 0.10;
    if (slAmount < 0.10) slAmount = 0.10;

    if (slAmount > dynamicStake) {
      this.addUserLog(userId, `⚠️ [AJUSTE SL] Stop Loss ($${slAmount.toFixed(2)}) excedia o stake ($${dynamicStake.toFixed(2)}). Ajustado.`);
      slAmount = dynamicStake;
    }

    const queue = this.pendingTpQueue.get(userId) || [];
    queue.push(tpAmount);
    this.pendingTpQueue.set(userId, queue);

    ws.send(JSON.stringify({
      buy: 1,
      price: dynamicStake,
      parameters: {
        amount: dynamicStake,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        multiplier: multiplierValue,
        underlying_symbol: "frxXAUUSD",
        limit_order: {
          take_profit: tpAmount,
          stop_loss: slAmount
        }
      }
    }));

    const realTrade = {
      id: "PENDING_" + Date.now() + Math.random().toString().slice(2, 6),
      symbol: "frxXAUUSD",
      lot: dynamicStake,
      type: direction,
      openPrice: price,
      time: new Date().toISOString(),
      status: 'OPEN',
      profit: 0,
      tp: engineTp,
      sl: engineSl
    };
    state.trades.unshift(realTrade);
  }

  public handleRegimeChange(userId: string, regime: string) {
    const state = this.getUserState(userId);
    const ws = this.userSockets.get(userId);

    this.userTrend.set(userId, regime);
    this.addUserLog(userId, `🧭 [TENDÊNCIA] Regime de mercado atualizado para: ${regime}`);

    if (!ws || ws.readyState !== 1) return;

    const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
    for (const trade of openTrades) {
      if (regime === 'TREND_DOWN' && trade.type === 'BUY') {
        this.addUserLog(userId, `🔄 [DEFESA ABSOLUTA] Reversão Forte detectada para BAIXA. Cortando compras abertas imediatamente para estancar perdas!`);
        ws.send(JSON.stringify({ sell: trade.id, price: 0 }));
      } else if (regime === 'TREND_UP' && trade.type === 'SELL') {
        this.addUserLog(userId, `🔄 [DEFESA ABSOLUTA] Reversão Forte detectada para ALTA. Cortando vendas abertas imediatamente para estancar perdas!`);
        ws.send(JSON.stringify({ sell: trade.id, price: 0 }));
      }
    }
  }
}