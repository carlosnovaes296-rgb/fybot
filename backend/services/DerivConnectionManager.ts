import { WebSocket as NodeWebSocket } from 'ws';

export class DerivConnectionManager {
  private userSockets: Map<string, NodeWebSocket> = new Map();
  private userPeakProfits: Map<string, Record<string, number>> = new Map();
  private userTrend: Map<string, string> = new Map();
  private openContractIds: Map<string, Set<string>> = new Map();

  private manualStakes: Map<string, number> = new Map();
  private autoStakePercent: Map<string, number> = new Map();
  private userTpAnchor: Map<string, Record<string, number>> = new Map();

  // Escudo de 15 Minutos (Cooldown)
  private userCooldown: Map<string, number> = new Map();
  private static readonly COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos

  private static readonly MAX_OPEN_ORDERS = 1;

  // CORRIGIDO (bug 2/3): em vez de "sujar" trade.profit com valores sentinela (+5000/-5000)
  // para evitar re-disparo do fechamento, mantemos um Set por usuário com os IDs de
  // contratos que já receberam ordem de fechamento nesta sessão. Isso evita:
  //  - corromper somas de P&L (floatingPnL, dailyProfit) que leem trade.profit
  //  - contar essas ordens como "abertas" na checagem de DCA no mesmo tick
  private closingContractIds: Map<string, Set<string>> = new Map();

  private getUserState: (userId: string) => any;
  public addUserLog: (userId: string, msg: string) => void;
  private getUsers: () => any[];
  private engine?: any;

  constructor(
    getUserState: (userId: string) => any,
    addUserLog: (userId: string, msg: string) => void,
    getUsers: () => any[],
    engine?: any
  ) {
    this.getUserState = getUserState;
    this.addUserLog = addUserLog;
    this.getUsers = getUsers;
    this.engine = engine;
  }

  public getActiveUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public setManualStake(userId: string, amount: number | null) {
    if (amount && amount > 0) {
      this.manualStakes.set(userId, amount);
      this.addUserLog(userId, `🛠️ [LOTE MANUAL] Lote fixo definido para $${amount.toFixed(2)} por ordem.`);
    } else {
      this.manualStakes.delete(userId);
      this.addUserLog(userId, `🛠️ [LOTE AUTOMÁTICO] Voltando ao cálculo automático (% da banca).`);
    }
  }

  public setAutoStakePercent(userId: string, percent: number) {
    if (percent > 0 && percent <= 1) {
      this.autoStakePercent.set(userId, percent);
      this.addUserLog(userId, `🛠️ [RISCO] Percentual automático de lote ajustado para ${(percent * 100).toFixed(1)}% da banca.`);
    }
  }

  private getClosingSet(userId: string): Set<string> {
    if (!this.closingContractIds.has(userId)) this.closingContractIds.set(userId, new Set());
    return this.closingContractIds.get(userId)!;
  }

  // CORRIGIDO (bug 4): o código antigo lia state.dailyTarget num lugar e
  // state.dailyProfitTarget em outro para representar a MESMA meta diária de
  // lucro. Se só um dos dois campos é populado de fato pelo resto da aplicação,
  // o outro check compara com "undefined" e nunca dispara. Centralizamos aqui
  // o cálculo (mesma regra de fallback que já existia em executeSignal) para
  // que os dois pontos do código concordem sempre.
  private getDailyTarget(state: any): number {
    if (!state.initialBalance) state.initialBalance = state.balance > 0 ? state.balance : 1000;
    return state.dailyProfitTarget > 0 ? state.dailyProfitTarget : (state.initialBalance * 0.025);
  }

  public async start(userId: string) {
    this.addUserLog(userId, `[DEBUG] Start connection request received for user ${userId}`);
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) {
      this.addUserLog(userId, `[DEBUG ERROR] User ${userId} not found in getUsers()!`);
      return;
    }

    this.addUserLog(userId, `[DEBUG] User found! Mode: ${user.activeAccountType}`);

    const activeToken = user.activeAccountType === 'REAL' ? (user.derivTokenReal || user.derivToken) : (user.derivTokenDemo || user.derivToken);
    let tokenToUse = (activeToken || '').trim();

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
    let accountIdToUse: string | undefined = undefined;
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
        this.addUserLog(userId, `❌ [ERRO DE TOKEN DERIV] O Token configurado no painel é INVÁLIDO ou EXPIRADO.`);
        const stateOnFail = this.getUserState(userId);
        const u = this.getUsers().find(user => user.id === userId);
        if (stateOnFail && u && u.role === 'ADMIN') stateOnFail.botRunning = false;
        this.stop(userId);
        return;
      }

      if (resContas.status !== 200 || contasData.error) {
        const msgErro = contasData.error?.message || contasText;
        this.addUserLog(userId, `❌ [ERRO DE AUTENTICAÇÃO] A Deriv recusou o Token: ${msgErro}`);
        const stateOnFail = this.getUserState(userId);
        const u = this.getUsers().find(user => user.id === userId);
        if (stateOnFail && u && u.role === 'ADMIN') stateOnFail.botRunning = false;
        this.stop(userId);
        return;
      }

      const contasArray = contasData.accounts || contasData.data || contasData;
      if (Array.isArray(contasArray) && contasArray.length > 0) {

        // NOVO LOG PARA DEPURAR QUAIS CONTAS ESTÃO DISPONÍVEIS
        const allIds = contasArray.map((a: any) => a.loginid || a.account_id || a.id).join(', ');
        this.addUserLog(userId, `[DEBUG] Contas disponíveis no Token: ${allIds}`);

        const isDemo = user.activeAccountType === 'DEMO';
        let contaAlvo = null;
        if (isDemo) {
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return id.includes('VRT') || id.startsWith('VR') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo';
          });
        } else {
          // Prioridade 1: Conta CR (Conta Real padrão em USD)
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return id.startsWith('CR');
          });

          // Prioridade 2: Qualquer outra conta real que não seja DEMO
          if (!contaAlvo) {
            contaAlvo = contasArray.find((a: any) => {
              const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
              return !(id.includes('VRT') || id.includes('VOT') || id.startsWith('VR') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo');
            });
          }
        }

        if (!contaAlvo) {
          this.addUserLog(userId, isDemo ? "❌ [ERRO] Token da Conta DEMO Inválido!" : "❌ [ERRO] Conta Real não encontrada.");
          const stateOnFail = this.getUserState(userId);
          if (stateOnFail) stateOnFail.botRunning = false;
          this.stop(userId);
          return;
        }

        const accountId = contaAlvo.loginid || contaAlvo.account_id || contaAlvo.id || contaAlvo.client_id || contaAlvo.oauth_client_id;
        accountIdToUse = accountId;

        this.addUserLog(userId, `🔍 Conta encontrada: ${accountId} | INFO: ${JSON.stringify(contaAlvo)}`);

        // Usa ?? em vez de || para não descartar saldo == 0 (0 é falsy em ||)
        if (contaAlvo.balance != null || contaAlvo.display_balance != null) {
          const bal = parseFloat(contaAlvo.balance ?? contaAlvo.display_balance);
          if (!Number.isNaN(bal)) {
            const state = this.getUserState(userId);
            state.balance = bal;
            state.equity = bal;
            this.addUserLog(userId, `💰 Saldo via REST capturado: ${bal}`);
          }
        } else {
          this.addUserLog(userId, `⚠️ API REST não retornou saldo para a conta ${accountId}.`);
        }

        if (!accountId) {
          throw new Error("ACCOUNT_ID_MISSING");
        }

        this.addUserLog(userId, `📡 Solicitando URL Segura (OTP)...`);
        const BASE_OTP = 'https://api.derivws.com/trading/v1';

        let magicUrl = '';
        try {
          const resOtp = await fetch(`${BASE_OTP}/options/accounts/${accountIdToUse}/otp`, {
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
          try {
            const otpData = JSON.parse(respText);
            magicUrl = otpData.ws_url || otpData.websocket_url || otpData.url || (otpData.data && (otpData.data.ws_url || otpData.data.url));
          } catch (e: any) { }
        } catch (otpErr: any) { }

        if (magicUrl) {
          wsUrl = magicUrl;
          needsAuthCommand = false;
          this.addUserLog(userId, `🚀 Conectando via Rota Segura OTP V2!`);
        } else {
          this.addUserLog(userId, `🔄 Conectando via WebSocket V3 Padrão...`);
        }
      }

    } catch (e: any) {
      this.addUserLog(userId, `⚠️ Erro na autenticação. Caindo para fallback V3.`);
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
    // CORRIGIDO: garante um Set limpo de "contratos em fechamento" a cada (re)conexão
    this.closingContractIds.set(userId, new Set());

    let pingInterval: NodeJS.Timeout;
    let portfolioInterval: NodeJS.Timeout;

    ws.on('open', () => {
      this.addUserLog(userId, `✅ [WS] Conectado à Deriv! DCA API ativado.`);

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
        ws.send(JSON.stringify({ authorize: tokenToUse }));
      } else {
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ portfolio: 1 }));
        ws.send(JSON.stringify({ profit_table: 1, description: 1, limit: 100, sort: "DESC" }));
      }
    });

    ws.on('message', (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());

        // Omitimos o log no painel para não poluir com pings e portfolios a cada segundo
        console.log(`[WS] msg_type recebido: ${data.msg_type}`, data.error ? `ERRO: ${data.error.message}` : '');

        if (data.msg_type === 'authorize') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO AUTH] Token inválido: ${data.error.message}`);
            // CORRIGIDO (bug 1): sem isso, o handler 'close' via ws.close() abaixo
            // detecta state.botRunning === true e agenda reconexão automática com o
            // MESMO token inválido, criando um loop infinito de reconexões falhas.
            const stateOnAuthFail = this.getUserState(userId);
            if (stateOnAuthFail) stateOnAuthFail.botRunning = false;
            ws.close();
            return;
          }
          ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
          ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
          ws.send(JSON.stringify({ portfolio: 1 }));
          ws.send(JSON.stringify({ profit_table: 1, description: 1, limit: 100, sort: "DESC" }));
        }

        if (data.error) {
          this.addUserLog(userId, `⚠️ [DERIV API] Erro: ${data.error.message}`);
          return;
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
                type: tx.sell_price > tx.buy_price ? 'BUY' : 'SELL',
                lot: 1,
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
          state.trades.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
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
              this.addUserLog(userId, `🧹 [SISTEMA] Limpeza Automática concluída.`);
            }

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
                  openPrice: 0,
                  time: new Date((c.purchase_time || c.date_start) * 1000).toISOString(),
                  status: 'OPEN',
                  profit: 0
                });
                newOpenFound = true;
              }
            });

            if (newOpenFound) {
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

        if (data.msg_type === 'sell') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO AO VENDER] Falha ao fechar contrato: ${data.error.message}`);
            // CORRIGIDO: data.error.details.contract_id não é um campo garantido pela
            // API da Deriv — em muitos casos de erro esse objeto vem vazio, e o ID
            // ficava preso para sempre no closingSet (a ordem nunca mais seria
            // reavaliada pelo trailing/SL nem contada certo no DCA). O "echo_req" é
            // sempre devolvido, com ou sem erro, contendo a requisição original —
            // é dali que pegamos o ID de forma confiável.
            const failedId = data.echo_req?.sell;
            if (failedId != null) this.getClosingSet(userId).delete(String(failedId));
          } else if (data.sell) {
            this.addUserLog(userId, `✅ [VENDA CONFIRMADA] Contrato ${data.sell.contract_id ?? ''} enviado para fechamento com sucesso.`);
          }
        }

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

            const closingSet = this.getClosingSet(userId);

            // --- Lógica de DCA e TP/SL Global ---
            // CORRIGIDO (bug 3): exclui trades já marcadas para fechamento do cálculo de
            // "ordens abertas" usado pelo DCA — sem isso, o bot pode abrir uma nova ordem
            // DCA no mesmo tick em que está encerrando a ordem mestra.
            const openTrades = state.trades
              .filter((t: any) => t.status === 'OPEN' && !closingSet.has(String(t.id)))
              .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

            const currentSpot = contract.current_spot;
            if (openTrades.length > 0 && currentSpot) {
              const masterTrade = openTrades[0];
              const drawdownPct = masterTrade.type === 'BUY'
                ? (masterTrade.openPrice - currentSpot) / masterTrade.openPrice
                : (currentSpot - masterTrade.openPrice) / masterTrade.openPrice;

              // 1. DCA Lógica
              if (drawdownPct >= 0.0004 && openTrades.length === 1) {
                this.addUserLog(userId, `📉 [DCA] Recuo de 0.04% atingido. Abrindo Ordem 2!`);
                this.placeOrder(userId, state, masterTrade.type, currentSpot, 0, 0);
              } else if (drawdownPct >= 0.0008 && openTrades.length === 2) {
                this.addUserLog(userId, `📉 [DCA] Recuo de 0.08% atingido. Abrindo Ordem 3!`);
                this.placeOrder(userId, state, masterTrade.type, currentSpot, 0, 0);
              } else if (drawdownPct >= 0.0012 && openTrades.length === 3) {
                this.addUserLog(userId, `📉 [DCA] Recuo de 0.12% atingido. Abrindo Ordem 4!`);
                this.placeOrder(userId, state, masterTrade.type, currentSpot, 0, 0);
              }

              // 2. TP / SL Global
              const totalLot = openTrades.reduce((sum: number, t: any) => sum + t.lot, 0);
              const avgPrice = openTrades.reduce((sum: number, t: any) => sum + (t.openPrice * t.lot), 0) / totalLot;

              const profitPct = masterTrade.type === 'BUY'
                ? (currentSpot - avgPrice) / avgPrice
                : (avgPrice - currentSpot) / avgPrice;

              const now = Date.now();
              if (!state.lastSmartCloseTime || now - state.lastSmartCloseTime > 3000) {
                if (profitPct >= 0.0004) {
                  state.lastSmartCloseTime = now;
                  this.addUserLog(userId, `🏆 [TP GLOBAL] Lucro alvo atingido no Preço Médio! Fechando a cesta.`);
                  openTrades.forEach((t: any) => {
                    closingSet.add(String(t.id));
                    this.closeTrade(userId, String(t.id));
                  });
                } else if (drawdownPct >= 0.0020) {
                  state.lastSmartCloseTime = now;
                  this.addUserLog(userId, `🛑 [SL GLOBAL] Perda máxima de 0.20% atingida na Ordem Mestra. Protegendo capital!`);
                  openTrades.forEach((t: any) => {
                    closingSet.add(String(t.id));
                    this.closeTrade(userId, String(t.id));
                  });
                }
              }
            }
            // -------------------------------------

            if (state.dailyProfit >= this.getDailyTarget(state)) {
              // CORRIGIDO (bug 2): exclui trades já em fechamento — o profit delas é real,
              // não sentinela, então isso é mais para evitar contar duas vezes a mesma
              // intenção de fechamento, não para evitar corrupção (que já não existe mais).
              const openTradesForLoss = state.trades.filter((t: any) => t.status === 'OPEN' && !closingSet.has(String(t.id)));
              const floatingPnL = openTradesForLoss.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
              const maxAllowedLoss = -(state.dailyProfit * 0.05);

              if (floatingPnL <= maxAllowedLoss) {
                const now = Date.now();
                if (!state.lastSmartCloseTime || now - state.lastSmartCloseTime > 3000) {
                  state.lastSmartCloseTime = now;
                  this.addUserLog(userId, `🏆 [TRAVA DE PROTEÇÃO] Meta atingida e prejuízo aberto bateu 5% do lucro diário. Cortando posições!`);
                  openTradesForLoss.forEach((t: any) => {
                    closingSet.add(String(t.id));
                    this.closeTrade(userId, String(t.id));
                  });
                }
              }
            }

            if (isSold) {
              if (trade.status !== 'CLOSED') {
                trade.status = 'CLOSED';
                state.dailyProfit += profit;
                this.openContractIds.get(userId)?.delete(contractId);
                closingSet.delete(contractId);
                this.addUserLog(userId, `💵 [FECHADO] Contrato ${contractId} fechado com ${profit >= 0 ? 'LUCRO' : 'PREJUÍZO'} de $${profit.toFixed(2)}`);

                // Sniper 15-Minute Cooldown logic
                if (profit < 0) {
                  this.userCooldown.set(userId, Date.now() + DerivConnectionManager.COOLDOWN_MS);
                  this.addUserLog(userId, `🛡️ [ESCUDO ATIVADO] Prejuízo detectado. O robô ficará pausado por 15 minutos para proteger a banca.`);
                }
              }
            }
          }
        }

        if (data.msg_type === 'buy') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO DERIV] Falha ao abrir ordem: ${data.error.message}`);
            const state = this.getUserState(userId);
            // Remove apenas a ordem pendente mais antiga (a que efetivamente falhou),
            // não todas as pendentes — importante durante o DCA em cascata, onde pode haver
            // mais de uma ordem pendente simultaneamente.
            const pendingIdx = (state.trades || []).findIndex((t: any) => String(t.id).startsWith('PENDING_'));
            if (pendingIdx !== -1) {
              state.trades.splice(pendingIdx, 1);
            }

            if (data.error.code === 'MarketIsClosed' || data.error.subcode === 'MarketIsClosed') {
              state.botRunning = false;
            }
          } else {
            const contractId = String(data.buy.contract_id || data.buy.transaction_id);
            this.addUserLog(userId, `🚀 Ordem Sniper (1x1) aberta na corretora com sucesso! ID: ${contractId}`);

            if (!this.openContractIds.has(userId)) this.openContractIds.set(userId, new Set());
            this.openContractIds.get(userId)!.add(contractId);

            const state = this.getUserState(userId);
            const pendingTrades = state.trades
              .filter((t: any) => String(t.id).startsWith('PENDING_'))
              .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            if (pendingTrades.length > 0) {
              pendingTrades[0].id = contractId;
            }
          }
        }
      } catch (err: any) {
        console.error(`[DerivConnectionManager] Erro interno:`, err);
      }
    });

    ws.on('error', (err: any) => {
      clearInterval(pingInterval);
      clearInterval(portfolioInterval);
      if (err.message === 'WebSocket was closed before the connection was established') {
        return;
      }
      this.addUserLog(userId, `🚨 [ERRO WS] Falha ao conectar: ${err.message}`);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      clearInterval(portfolioInterval);
      this.userSockets.delete(userId);
      this.closingContractIds.delete(userId);
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
      ws.removeAllListeners('close');
      ws.close();
      this.userSockets.delete(userId);
      this.addUserLog(userId, `⏸️ Conexão WS encerrada.`);
    }
    this.userPeakProfits.delete(userId);
    this.openContractIds.delete(userId);
    this.userTpAnchor.delete(userId);
    this.closingContractIds.delete(userId);
  }

  public async closeTrade(userId: string, contractId: string) {
    // Nunca tenta vender uma ordem que ainda não recebeu ID real da corretora
    if (contractId.startsWith('PENDING_')) {
      this.addUserLog(userId, `⏳ Ordem ${contractId} ainda não confirmada pela corretora — fechamento adiado.`);
      return false;
    }

    const numericId = Number(contractId);
    if (Number.isNaN(numericId)) {
      this.addUserLog(userId, `⚠️ [ERRO] ID de contrato inválido para fechamento: ${contractId}`);
      return false;
    }

    const ws = this.userSockets.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ sell: numericId, price: 0 }));
      this.addUserLog(userId, `🛠️ Enviando comando manual para FECHAR contrato (ID: ${contractId})...`);
      return true;
    }
    // Não conseguiu enviar — libera o ID para permitir nova tentativa depois
    this.getClosingSet(userId).delete(contractId);
    return false;
  }

  public executeSignal(userId: string, direction: 'BUY' | 'SELL', price: number, reason: string, engineTp: number, engineSl: number) {
    const state = this.getUserState(userId);

    const cooldownUntil = this.userCooldown.get(userId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const minutesLeft = Math.ceil((cooldownUntil - Date.now()) / 60000);
      // Logamos apenas ocasionalmente para não spammar
      if (Math.random() < 0.2) {
        this.addUserLog(userId, `🛡️ [ESCUDO ATIVO] Sinal ignorado. Restam ${minutesLeft} min de proteção após o último loss.`);
      }
      return;
    }

    const openTradesCount = state.trades.filter((t: any) => t.status === 'OPEN').length;

    const dailyTarget = this.getDailyTarget(state);

    if (state.dailyProfit >= dailyTarget) {
      this.addUserLog(userId, `🏆 [META BATIDA] Meta diária ($${dailyTarget.toFixed(2)}) atingida. O robô aguardará as ordens abertas fecharem.`);
      return;
    }

    if (openTradesCount >= 1) {
      // Já existe 1 ordem aberta, modo DCA assumiu, o motor ignora novos sinais.
      if (Math.random() < 0.2) {
        this.addUserLog(userId, `⚠️ Sinal recebido, mas já existe 1 ordem aberta. Aguardando fechamento (Modo 1x1).`);
      }
      return;
    }

    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== ws.OPEN) {
      this.addUserLog(userId, `⚠️ Erro: Sinal recebido, mas WebSocket offline.`);
      return;
    }

    this.addUserLog(userId, `🚀 [SINAL RECEBIDO] ${reason}. Executando ordem ${direction}...`);
    this.placeOrder(userId, state, direction, price, engineTp, engineSl);
  }

  private placeOrder(userId: string, state: any, direction: 'BUY' | 'SELL', price: number, engineTp: number, engineSl: number) {
    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== ws.OPEN) return;

    const balance = state.balance > 0 ? state.balance : 1000;
    const manualStake = this.manualStakes.get(userId);
    const multiplierValue = 100;

    let dynamicStake = 10.00; // 10 dólares fixos por ordem conforme estratégia Sniper 1x1

    let finalStake = manualStake && manualStake > 0 ? manualStake : dynamicStake;

    // Arredonda para 2 casas decimais (ex: 2.05) para a API aceitar perfeitamente
    finalStake = Math.round(finalStake * 100) / 100;

    // Mantém a trava absoluta da corretora
    if (finalStake < 1.0) finalStake = 1.0;

    const contractType = direction === 'BUY' ? 'MULTUP' : 'MULTDOWN';

    // Como é DCA, enviamos a ordem SEM limites (limit_order) na Deriv.
    // O fechamento será gerenciado em memória pelo TP/SL Global.
    ws.send(JSON.stringify({
      buy: 1,
      price: finalStake,
      parameters: {
        amount: finalStake,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        multiplier: multiplierValue,
        underlying_symbol: "frxXAUUSD"
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

    if (!ws || ws.readyState !== ws.OPEN) return;

    const closingSet = this.getClosingSet(userId);
    const openTrades = state.trades.filter((t: any) => t.status === 'OPEN' && !closingSet.has(String(t.id)));
    for (const trade of openTrades) {
      // Reaproveita closeTrade() em vez de enviar "sell" manualmente,
      // garantindo conversão numérica correta do ID e proteção contra ordens "PENDING_"
      if (regime === 'TREND_DOWN' && trade.type === 'BUY') {
        this.addUserLog(userId, `🔄 [DEFESA ABSOLUTA] Reversão para BAIXA. Cortando compras abertas!`);
        closingSet.add(String(trade.id));
        this.closeTrade(userId, String(trade.id));
      } else if (regime === 'TREND_UP' && trade.type === 'SELL') {
        this.addUserLog(userId, `🔄 [DEFESA ABSOLUTA] Reversão para ALTA. Cortando vendas abertas!`);
        closingSet.add(String(trade.id));
        this.closeTrade(userId, String(trade.id));
      }
    }
  }
}