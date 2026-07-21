import { WebSocket as NodeWebSocket } from 'ws';

export class DerivConnectionManager {
  private userSockets: Map<string, NodeWebSocket> = new Map();
  private userPeakProfits: Map<string, Record<string, number>> = new Map();

  constructor(
    private getUserState: (userId: string) => any,
    private addUserLog: (userId: string, msg: string) => void,
    private getUsers: () => any[]
  ) {}

  public async start(userId: string) {
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) return;
    
    const state = this.getUserState(userId);
    const activeToken = user.activeAccountType === 'REAL' ? user.derivTokenReal : user.derivTokenDemo;
    let tokenToUse = activeToken || user.derivToken;

    if (!tokenToUse) {
      this.addUserLog(userId, `⚠️ [SEM TOKEN] Nenhum token ${user.activeAccountType} configurado. Vá em Configurações e salve seu Token Deriv!`);
      return;
    }

    if (this.userSockets.has(userId)) {
      this.stop(userId);
    }

    this.addUserLog(userId, `🔄 Conectando WebSocket Contínuo para conta ${user.activeAccountType}...`);

    let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=36544&l=PT`;
    let needsAuthCommand = true;

    const ws = new NodeWebSocket(wsUrl, {
      headers: { 
        'Origin': 'https://app.deriv.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });

    this.userSockets.set(userId, ws);
    this.userPeakProfits.set(userId, {});

    ws.on('open', () => {
      this.addUserLog(userId, `✅ [WS] Conectado à Deriv. Autenticando...`);
      if (needsAuthCommand) {
        ws.send(JSON.stringify({ authorize: tokenToUse }));
      } else {
        // Já autorizado via OTP
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
      }
    });

    ws.on('message', (msg: any) => {
      const data = JSON.parse(msg.toString());
      
      if (data.msg_type === 'authorize') {
        if (data.error) {
          this.addUserLog(userId, `🚨 [ERRO AUTH] Token inválido: ${data.error.message}`);
          ws.close();
          return;
        }
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
        this.addUserLog(userId, `✅ [WS] Monitoramento de saldo e contratos ativado.`);
      }

      // Atualiza Saldo
      if (data.msg_type === 'balance') {
        const bal = data.balance.balance;
        state.balance = bal;
        if (!state.equity || state.trades.filter((t: any) => t.status === 'OPEN').length === 0) {
            state.equity = bal;
        }
      }

      // Monitoramento de Contratos (Violinada + Equity)
      if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
        const contract = data.proposal_open_contract;
        const profit = contract.profit;
        const contractId = String(contract.contract_id);
        const isSold = contract.is_sold === 1;

        // Atualiza Equity globalmente
        state.equity = state.balance + profit;

        const trade = state.trades.find((t: any) => t.id === contractId || t.id.startsWith("PENDING_"));
        if (trade) {
          trade.id = contractId; // Fixes pending ID
          trade.profit = profit;
          
          if (isSold) {
            trade.status = 'CLOSED';
            state.dailyProfit += profit;
            this.addUserLog(userId, `💵 [FECHADO] Contrato ${contractId} fechado com ${profit >= 0 ? 'LUCRO' : 'PREJUÍZO'} de $${profit.toFixed(2)}`);
          } else {
            // TRAILING STOP (VIOLINADA) - Regra 6
            const peaks = this.userPeakProfits.get(userId)!;
            if (!peaks[contractId]) peaks[contractId] = 0;
            
            if (profit > peaks[contractId]) {
              peaks[contractId] = profit;
            }

            // Se o pico for maior que $0.50 (pra não ser tão sensível) e lucro cair 20% do pico (mantendo 80%)
            if (peaks[contractId] > 0.50 && profit < (peaks[contractId] * 0.8)) {
                this.addUserLog(userId, `🛡️ [VIOLINADA PROTEGIDA] Lucro caiu de $${peaks[contractId].toFixed(2)} para $${profit.toFixed(2)}. Fechando ordem para garantir 80%!`);
                ws.send(JSON.stringify({ sell: contractId, price: 0 }));
                peaks[contractId] = 0; // Reseta para evitar spam
            }
          }
        }
      }
      
      // Resposta da Compra
      if (data.msg_type === 'buy') {
        if (data.error) {
          this.addUserLog(userId, `🚨 [ERRO DERIV] Falha ao abrir ordem: ${data.error.message}`);
        } else {
          this.addUserLog(userId, `✅ [ORDEM ABERTA] Contrato ${data.buy.contract_id} aberto na Deriv!`);
        }
      }
      
      // Resposta da Venda
      if (data.msg_type === 'sell') {
         if (data.error) {
             console.error(`Erro ao vender: ${data.error.message}`);
         }
      }
    });

    ws.on('error', (err: any) => {
      this.addUserLog(userId, `🚨 [ERRO WS] Falha ao conectar: ${err.message}`);
    });
    
    ws.on('close', () => {
        this.userSockets.delete(userId);
    });
  }

  public stop(userId: string) {
    const ws = this.userSockets.get(userId);
    if (ws) {
      ws.close();
      this.userSockets.delete(userId);
      this.addUserLog(userId, `⏸️ Conexão WS encerrada.`);
    }
  }

  public executeSignal(userId: string, direction: 'BUY' | 'SELL', price: number, reason: string, engineTp: number, engineSl: number) {
    const state = this.getUserState(userId);
    if (state.systemBlocked) {
        this.addUserLog(userId, `🔒 Sinal de ${direction} ignorado: Sistema bloqueado.`);
        return;
    }

    // Regra 8: Trava se lucro >= 80% da meta (ex: Meta = 2%, Trava = 1.6%)
    const target = state.dailyProfitTarget || (state.balance * 0.02);
    if (target > 0 && state.dailyProfit >= target * 0.8) {
        this.addUserLog(userId, `🛡️ [META PROTEGIDA] Lucro atual ($${state.dailyProfit.toFixed(2)}) atingiu >= 80% da meta ($${target.toFixed(2)}). Sinal bloqueado para esperar fechamento das abertas!`);
        return;
    }

    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== NodeWebSocket.OPEN) {
      this.addUserLog(userId, `⚠️ Erro: Sinal recebido, mas WebSocket offline. Conecte o robô primeiro.`);
      return;
    }

    this.addUserLog(userId, `🚀 [SINAL RECEBIDO] ${reason}. Executando ${direction}...`);

    // Regra 5: Stake Dinâmica de 1% do Saldo
    const balance = state.balance > 0 ? state.balance : 1000;
    const dynamicStake = Math.max(0.5, parseFloat((balance * 0.01).toFixed(2))); // Mínimo $0.50

    // O Motor envia PREÇOS (ex: 785.40), mas a Deriv exige VALORES EM DÓLAR para o Multiplicador!
    const multiplier = 100;
    const tpDiff = Math.abs(engineTp - price);
    const slDiff = Math.abs(engineSl - price);
    
    // Converte a diferença de preço para lucro em dólar: (Diferença / Preço) * Stake * Multiplicador
    let tpAmount = parseFloat(((tpDiff / price) * dynamicStake * multiplier).toFixed(2));
    let slAmount = parseFloat(((slDiff / price) * dynamicStake * multiplier).toFixed(2));
    
    // Segurança da Deriv: Stop Loss não pode ser maior que a banca apostada (Stake)
    if (slAmount > dynamicStake) {
        slAmount = dynamicStake;
    }
    // Garante um TP/SL mínimo de 10% do stake para evitar rejeição por ser muito perto
    tpAmount = Math.max(tpAmount, parseFloat((dynamicStake * 0.1).toFixed(2)));
    slAmount = Math.max(slAmount, parseFloat((dynamicStake * 0.1).toFixed(2)));

    const contractType = direction === 'BUY' ? 'MULTUP' : 'MULTDOWN';

    ws.send(JSON.stringify({
      buy: 1,
      price: dynamicStake, 
      parameters: {
        amount: dynamicStake,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        multiplier: 100,
        symbol: "frxXAUUSD",
        limit_order: {
          take_profit: tpAmount,
          stop_loss: slAmount
        }
      }
    }));
    
    // Simula a adição da ordem no estado
    // tpPrice e slPrice já estão vindo como parâmetros engineTp e engineSl!
    // Não precisamos recalcular aqui.
    const realTrade = {
        id: "PENDING_" + Date.now(),
        symbol: "frxXAUUSD",
        lot: dynamicStake,
        type: direction,
        openPrice: price,
        time: new Date().toISOString(),
        status: 'OPEN',
        profit: 0,
        tp: engineTp, // UI espera o Preço
        sl: engineSl  // UI espera o Preço
    };
    state.trades.unshift(realTrade);
  }

  public handleRegimeChange(userId: string, regime: string) {
    const state = this.getUserState(userId);
    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== NodeWebSocket.OPEN) return;

    const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
    for (const trade of openTrades) {
      if (trade.profit > 0) {
        if (regime === 'TREND_DOWN' && trade.type === 'BUY') {
          this.addUserLog(userId, `🔄 [REVERSÃO] Tendência mudou para BAIXA. Fechando ordem de COMPRA no lucro de $${trade.profit.toFixed(2)} para proteger ganho!`);
          ws.send(JSON.stringify({ sell: trade.id, price: 0 }));
        } else if (regime === 'TREND_UP' && trade.type === 'SELL') {
          this.addUserLog(userId, `🔄 [REVERSÃO] Tendência mudou para ALTA. Fechando ordem de VENDA no lucro de $${trade.profit.toFixed(2)} para proteger ganho!`);
          ws.send(JSON.stringify({ sell: trade.id, price: 0 }));
        }
      }
    }
  }
}
