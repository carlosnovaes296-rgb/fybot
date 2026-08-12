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

        if (contaAlvo.balance != null || contaAlvo.display_balance != null) {
          const bal = parseFloat(contaAlvo.balance || contaAlvo.display_balance);
          const state = this.getUserState(userId);
          state.balance = bal;
          state.equity = bal;
          this.addUserLog(userId, `💰 Saldo via REST capturado: ${bal}`);
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
          try {
              const otpData = JSON.parse(respText);
              magicUrl = otpData.ws_url || otpData.websocket_url || otpData.url || (otpData.data && (otpData.data.ws_url || otpData.data.url));
          } catch(e: any) { }
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
        
        if (data.msg_type === 'balance') {
           // O saldo bruto já é processado na função getBalance, não precisa logar a string no painel
        }

        if (data.msg_type === 'authorize') {
          if (data.error) {
            this.addUserLog(userId, `🚨 [ERRO AUTH] Token inválido: ${data.error.message}`);
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

            if (state.dailyProfit >= state.dailyTarget) {
              const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
              if (openTrades.length > 0) {
                const floatingPnL = openTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
                const maxAllowedLoss = -(state.dailyProfit * 0.05);
                
                if (floatingPnL <= maxAllowedLoss) {
                  const now = Date.now();
                  if (!state.lastSmartCloseTime || now - state.lastSmartCloseTime > 3000) {
                    state.lastSmartCloseTime = now;
                    this.addUserLog(userId, `🏆 [TRAVA DE PROTEÇÃO] Meta atingida e prejuízo aberto bateu 5% do lucro diário. Cortando posições!`);
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
            state.trades = (state.trades || []).filter((t: any) => !t.id.startsWith('PENDING_'));

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
  }

  public async closeTrade(userId: string, contractId: string) {
    const ws = this.userSockets.get(userId);
    if (ws && ws.readyState === 1) { 
      ws.send(JSON.stringify({ sell: Number(contractId), price: 0 }));
      this.addUserLog(userId, `🛠️ Enviando comando manual para FECHAR contrato (ID: ${contractId})...`);
      return true;
    }
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

    if (!state.initialBalance) state.initialBalance = state.balance > 0 ? state.balance : 1000;
    const dailyTarget = state.initialBalance * 0.04; 

    if (state.dailyProfit >= dailyTarget) {
      this.addUserLog(userId, `🏆 [META BATIDA] Meta diária ($${dailyTarget.toFixed(2)}) atingida. O robô parou de enviar novas ordens.`);
      return;
    }

    if (openTradesCount >= DerivConnectionManager.MAX_OPEN_ORDERS) {
      // Já existe 1 ordem aberta, modo 1x1 ignora.
      if (Math.random() < 0.2) {
          this.addUserLog(userId, `⚠️ Sinal recebido, mas já existe 1 ordem aberta. Aguardando fechamento (Modo 1x1).`);
      }
      return;
    }

    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== 1) {
      this.addUserLog(userId, `⚠️ Erro: Sinal recebido, mas WebSocket offline.`);
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
    
    let finalStake = manualStake && manualStake > 0 ? manualStake : parseFloat((balance * 0.01).toFixed(2));
    if (finalStake < 1.0) finalStake = 1.0;

    const tpDistancePct = Math.abs((engineTp - price) / price);
    let tpAmount = parseFloat((tpDistancePct * finalStake * multiplierValue).toFixed(2));
    if (tpAmount < 0.10) tpAmount = 0.10;

    const slDistancePct = Math.abs((engineSl - price) / price);
    let slAmount = parseFloat((slDistancePct * finalStake * multiplierValue).toFixed(2));
    if (slAmount < 0.10) slAmount = 0.10;

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
          take_profit: tpAmount,
          stop_loss: slAmount
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

    if (!ws || ws.readyState !== 1) return;

    const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
    for (const trade of openTrades) {
      if (regime === 'TREND_DOWN' && trade.type === 'BUY') {
        this.addUserLog(userId, `🔄 [DEFESA ABSOLUTA] Reversão para BAIXA. Cortando compras abertas!`);
        ws.send(JSON.stringify({ sell: trade.id, price: 0 }));
      } else if (regime === 'TREND_UP' && trade.type === 'SELL') {
        this.addUserLog(userId, `🔄 [DEFESA ABSOLUTA] Reversão para ALTA. Cortando vendas abertas!`);
        ws.send(JSON.stringify({ sell: trade.id, price: 0 }));
      }
    }
  }
}