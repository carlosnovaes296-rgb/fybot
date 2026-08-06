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

  // Níveis de recuo para DCA de reversão
  private static readonly DCA_RETRACEMENT_LEVELS = [0.0006, 0.0010, 0.0015, 0.0020, 0.0025];
  private static readonly DCA_TP_LEVELS = [0.0005, 0.0008, 0.0013, 0.0018, 0.0022];
  private static readonly MAX_DCA_ORDERS = 6;

  private getUserState: (userId: string) => any;
  public addUserLog: (userId: string, msg: string) => void;
  private getUsers: () => any[];

  constructor(
    getUserState: (userId: string) => any,
    addUserLog: (userId: string, msg: string) => void,
    getUsers: () => any[]
  ) { 
    this.getUserState = getUserState;
    this.addUserLog = addUserLog;
    this.getUsers = getUsers;
  }

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

    const activeToken = user.activeAccountType === 'REAL' ? (user.derivTokenReal || user.derivToken) : (user.derivTokenDemo || user.derivToken);
    let tokenToUse = (activeToken || '').trim();

    // Auto-correção para colar acidental de "pat_" duplo (ex: pat_pat_...)
    while (tokenToUse.startsWith('pat_pat_')) {
      tokenToUse = tokenToUse.replace(/^pat_pat_/, 'pat_');
    }

    if (!tokenToUse) {
      this.addUserLog(userId, `⚠️ [SEM TOKEN] Nenhum token configurado para a conta ${user.activeAccountType}.`);
      return;
    }

    if (this.userSockets.has(userId)) {
      this.stop(userId);
    }

    const tokenStart = tokenToUse.substring(0, 8);
    this.addUserLog(userId, `🔄 Iniciando conexão [Modo ${user.activeAccountType}] usando Token PAT: ${tokenStart}...`);

    const appIdString = "33TVM6cBQ9GfSjbwQHHdE"; 
    let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appIdString}&l=PT`;
    let needsAuthCommand = true;
    const origin = "https://fybot.life";
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)";

    try {
      const BASE = "https://api.derivws.com/trading/v1";

      const baseHeaders = {
        'Deriv-App-ID': appIdString,
        'Origin': origin,
        'Content-Type': 'application/json',
        'User-Agent': userAgent
      };

      this.addUserLog(userId, `📡 Identificando a conta na API V2 com Token PAT...`);
      
      let authHeader = tokenToUse.startsWith('Bearer ') ? tokenToUse : `Bearer ${tokenToUse}`;
      let resContas = await fetch(`${BASE}/options/accounts`, { 
        headers: { ...baseHeaders, 'Authorization': authHeader } 
      });

      let contasText = await resContas.text();

      // Se der 401 com Bearer, tenta enviar o token PAT diretamente no cabeçalho Authorization
      if (resContas.status === 401 || contasText.includes('Invalid')) {
        authHeader = tokenToUse.replace(/^Bearer\s+/i, '');
        this.addUserLog(userId, `🔄 Tentando autorização direta do Token PAT sem o prefixo Bearer...`);
        resContas = await fetch(`${BASE}/options/accounts`, { 
          headers: { ...baseHeaders, 'Authorization': authHeader } 
        });
        contasText = await resContas.text();
      }
      
      let contasData: any;
      try {
        contasData = JSON.parse(contasText);
      } catch (err) {
        this.addUserLog(userId, `❌ [ERRO DE TOKEN DERIV] O Token configurado no painel é INVÁLIDO ou EXPIRADO. A Deriv respondeu: "${contasText.trim()}"`);
        this.addUserLog(userId, `👉 Por favor, acesse o site da Deriv (Configurações -> API Token), crie um novo Token com permissões de Leitura e Negociação e cole nas Configurações do robô.`);
        const stateOnFail = this.getUserState(userId);
        if (stateOnFail) stateOnFail.botRunning = false;
        this.stop(userId);
        return;
      }

      if (resContas.status !== 200 || contasData.error) {
        const msgErro = contasData.error?.message || contasText;
        this.addUserLog(userId, `❌ [ERRO DE AUTENTICAÇÃO] A Deriv recusou o Token: ${msgErro}`);
        const stateOnFail = this.getUserState(userId);
        if (stateOnFail) stateOnFail.botRunning = false;
        this.stop(userId);
        return;
      }

      const contasArray = contasData.accounts || contasData.data || contasData;
      if (Array.isArray(contasArray) && contasArray.length > 0) {
        const isDemo = user.activeAccountType === 'DEMO';
        let contaAlvo = null;
        if (isDemo) {
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return id.includes('VRT') || id.startsWith('VR') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo';
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
            ? "❌ [ERRO] Token da Conta DEMO Inválido! Crie o token no site da Deriv ENQUANTO estiver logado na sua conta VIRTUAL (VRT ou DOT)."
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
        }

        if (!accountId) {
          throw new Error("ACCOUNT_ID_MISSING");
        }

        this.addUserLog(userId, `📡 Solicitando URL Segura (OTP) para a conta ${accountId}...`);
        const BASE_OTP = 'https://api.derivws.com/trading/v1';
        
        let magicUrl = '';
        try {
          const resOtp = await fetch(`${BASE_OTP}/options/accounts/${accountId}/otp`, {
            method: 'POST',
            headers: { 
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Deriv-App-ID': appIdString,
              'Origin': origin,
              'User-Agent': userAgent
            },
            body: JSON.stringify({
              client_id: appIdString,
              token: tokenToUse
            })
          });
          
          const respText = await resOtp.text();
          this.addUserLog(userId, `📡 Resp OTP (${resOtp.status}): ${respText.substring(0, 200)}`);
          try {
              const otpData = JSON.parse(respText);
              if (otpData.error) {
                  this.addUserLog(userId, `⚠️ Erro V2 OTP: ${otpData.error.message || JSON.stringify(otpData.error)}`);
              }
              magicUrl = otpData.ws_url || otpData.websocket_url || otpData.url || (otpData.data && (otpData.data.ws_url || otpData.data.url));
          } catch(e: any) {
              this.addUserLog(userId, `⚠️ Falha ao parsear OTP JSON: ${e.message}`);
          }
        } catch (otpErr: any) {
          console.error("Erro OTP", otpErr);
        }

        if (magicUrl) {
          wsUrl = magicUrl;
          needsAuthCommand = false;
          this.addUserLog(userId, `🚀 Conectando via Rota Segura OTP V2!`);
        } else {
          this.addUserLog(userId, `🔄 Conectando via WebSocket V3 Padrão...`);
        }
      } else {
        throw new Error('Nenhuma conta encontrada na API V2');
      }

    } catch (e: any) {
      if (typeof e?.message === 'string' && e.message.startsWith('ACCOUNT_ID_MISSING')) {
        this.addUserLog(userId, `⚠️ Não foi possível identificar a conta, caindo para Fallback V3.`);
      } else {
        this.addUserLog(userId, `⚠️ Erro de rede na V2, caindo para o Fallback V3: ${e.message}`);
      }
    }

    const ws = new NodeWebSocket(wsUrl, {
      headers: {
        'Origin': origin,
        'User-Agent': userAgent
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

            // NOVO: Verificação inteligente de encerramento do dia (Trava Pós-Meta)
            if (state.dailyProfit >= state.dailyTarget) {
              const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
              if (openTrades.length > 0) {
                const floatingPnL = openTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
                // Se o prejuízo flutuante somado de todas as ordens abertas atingir 5% do Lucro Obtido no Dia
                const maxAllowedLoss = -(state.dailyProfit * 0.05);
                
                if (floatingPnL <= maxAllowedLoss) {
                  const now = Date.now();
                  if (!state.lastSmartCloseTime || now - state.lastSmartCloseTime > 3000) {
                    state.lastSmartCloseTime = now;
                    this.addUserLog(userId, `🏆 [TRAVA DE PROTEÇÃO] A meta do dia foi batida, mas o mercado virou! O prejuízo aberto atingiu 5% do lucro diário ($${floatingPnL.toFixed(2)}). Cortando todas as posições a mercado por segurança!`);
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
                this.addUserLog(userId, `💵 [FECHADO] Contrato ${contractId} fechado com ${profit >= 0 ? 'LUCRO' : 'PREJUÍZO'} de $${profit.toFixed(2)}`);
              }
            } else {
              // Proteção de Violinada (Stop Loss de PnL: -20% do valor da ordem)
              const stakeAmount = Number(trade.lot || 0); 
              const violinadaLimit = -(stakeAmount * 0.20); // 20% do valor da ordem
              if (stakeAmount > 0 && profit <= violinadaLimit) {
                 this.addUserLog(userId, `🚨 [VIOLINADA] A ordem ${contractId} atingiu -20% do valor da entrada. Fechando imediatamente por segurança!`);
                 ws.send(JSON.stringify({ sell: contractId, price: 0 }));
                 trade.status = 'CLOSED';
              } else {
                 // DCA Lógica (só ativada se a ordem ainda não violinou)
                 const dcaState = this.userDcaState.get(userId);
                 if (dcaState && dcaState.ordersOpened < DerivConnectionManager.MAX_DCA_ORDERS) {
                    const currentPrice = contract.current_spot || contract.entry_spot;
                    if (currentPrice) {
                       const priceDiffPct = (currentPrice - dcaState.anchorPrice) / dcaState.anchorPrice;
                       // Se o preço for contra nós
                       const isAgainstUs = dcaState.direction === 'BUY' ? priceDiffPct < 0 : priceDiffPct > 0;
                       
                       if (isAgainstUs) {
                          const dropMagnitude = Math.abs(priceDiffPct);
                          // Level index é dcaState.ordersOpened - 1
                          const targetDrop = DerivConnectionManager.DCA_RETRACEMENT_LEVELS[dcaState.ordersOpened - 1];
                          
                          if (dropMagnitude >= targetDrop) {
                             dcaState.ordersOpened++;
                             this.userDcaState.set(userId, dcaState);
                             
                             const targetTpDist = DerivConnectionManager.DCA_TP_LEVELS[dcaState.ordersOpened - 2];
                             
                             const fakeTpPrice = dcaState.direction === 'BUY' ? currentPrice * (1 + targetTpDist) : currentPrice * (1 - targetTpDist);
                             
                             this.addUserLog(userId, `📉 [DCA ATIVADO] Preço recuou -${(dropMagnitude*100).toFixed(2)}%. Abrindo Ordem ${dcaState.ordersOpened} / ${DerivConnectionManager.MAX_DCA_ORDERS} (TP: ${(targetTpDist*100).toFixed(2)}%)`);
                             
                             this.placeOrder(userId, state, dcaState.direction, currentPrice, fakeTpPrice, 0);
                          }
                       }
                    }
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

            if (data.error.code === 'MarketIsClosed' || data.error.subcode === 'MarketIsClosed') {
              this.addUserLog(userId, `🛑 [SISTEMA] Mercado fechado! O robô será pausado automaticamente para evitar repetições de tentativa.`);
              state.botRunning = false;
              this.userDcaState.delete(userId);
            } else {
              // Libera o motor se a Ordem 1 falhou
              const dcaState = this.userDcaState.get(userId);
              if (dcaState && dcaState.ordersOpened === 1) {
                this.userDcaState.delete(userId);
                this.addUserLog(userId, `🔄 [SISTEMA] Motor destravado (Ordem 1 falhou).`);
              } else if (dcaState && dcaState.ordersOpened > 1) {
                dcaState.ordersOpened--;
                this.userDcaState.set(userId, dcaState);
              }
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

    // Bloqueio de Meta Diária de 3%
    if (!state.initialBalance) state.initialBalance = state.balance > 0 ? state.balance : 1000;
    const dailyTarget = state.initialBalance * 0.03; // 3% de meta

    if (state.dailyProfit >= dailyTarget) {
      this.addUserLog(userId, `🏆 [META BATIDA] Meta diária ($${dailyTarget.toFixed(2)}) atingida. O robô parou de enviar novas ordens.`);
      return;
    }

    if (openTradesCount >= DerivConnectionManager.MAX_DCA_ORDERS) {
      this.addUserLog(userId, `⚠️ [LIMITE ORDENS] Máximo de ${DerivConnectionManager.MAX_DCA_ORDERS} ordens simultâneas atingido.`);
      return;
    }

    // Inicializar estado DCA
    if (openTradesCount === 0) {
       this.userDcaState.set(userId, {
         direction: direction,
         anchorPrice: price,
         ordersOpened: 1,
         tpDistancePct: 0.0004,
         slDistancePct: 0.10 // Violinada
       });
    }

    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== 1) {
      this.addUserLog(userId, `⚠️ Erro: Sinal recebido, mas WebSocket offline. Conecte o robô primeiro.`);
      return;
    }

    this.addUserLog(userId, `🚀 [SINAL RECEBIDO] ${reason}. Executando ordem ${direction}...`);
    this.placeOrder(userId, state, direction, price, engineTp, engineSl);
  }

  private placeOrder(userId: string, state: any, direction: 'BUY' | 'SELL', price: number, engineTp: number, engineSl: number) {
    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== 1) return;

    const balance = state.balance > 0 ? state.balance : 1000;
    const manualStake = this.manualStakes.get(userId);
    const multiplierValue = 100;
    
    // DCA Limpo: mesmo valor para todas as ordens (zero martingale)
    // Se não tem lote manual configurado no painel, usar 1% da banca (conservador)
    let finalStake = manualStake && manualStake > 0 ? manualStake : parseFloat((balance * 0.01).toFixed(2));
    if (finalStake < 1.0) finalStake = 1.0; // Mínimo absoluto na Deriv

    const tpDistancePct = Math.abs((engineTp - price) / price);
    let tpAmount = parseFloat((tpDistancePct * finalStake * multiplierValue).toFixed(2));
    if (tpAmount < 0.10) tpAmount = 0.10; // Mínimo da corretora

    const contractType = direction === 'BUY' ? 'MULTUP' : 'MULTDOWN';

    ws.send(JSON.stringify({
      buy: 1,
      price: finalStake,
      parameters: {
        amount: finalStake,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        multiplier: multiplierValue,
        underlying_symbol: "frxXAUUSD",
        limit_order: {
          take_profit: tpAmount
        }
      }
    }));

    const realTrade = {
      id: "PENDING_" + Date.now() + Math.random().toString().slice(2, 6),
      symbol: "frxXAUUSD",
      lot: finalStake,
      type: direction,
      openPrice: price,
      time: new Date().toISOString(),
      status: 'OPEN',
      profit: 0,
      tp: engineTp,
      sl: engineSl,
      atrProfitUSD: 0,
      beSet: false
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