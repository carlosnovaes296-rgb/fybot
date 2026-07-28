import { WebSocket as NodeWebSocket } from 'ws';

export class DerivConnectionManager {
  private userSockets: Map<string, NodeWebSocket> = new Map();
  private userPeakProfits: Map<string, Record<string, number>> = new Map();
  // FIX: esta propriedade era usada em executeSignal() mas nunca tinha sido declarada,
  // causando um erro "Cannot read properties of undefined (reading 'set')" toda vez
  // que uma ordem era executada — o que interrompia o fluxo logo após o envio da ordem.
  private lastExecutions: Map<string, number> = new Map();
  // NOVO: guarda a última tendência de mercado (regime) reportada para cada usuário.
  // Usado em executeSignal() para só deixar abrir ordem a favor da tendência.
  private userTrend: Map<string, string> = new Map();

  constructor(
    private getUserState: (userId: string) => any,
    public addUserLog: (userId: string, msg: string) => void,
    private getUsers: () => any[]
  ) { }

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
      const appId = "33TVM6cBQ9GfSjbwQHHdE";
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
          // Tenta achar VRT primeiro (Conta Virtual Principal)
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return id.includes('VRT') || id.startsWith('VR');
          });
          // Se não achar VRT, pega qualquer outra virtual
          if (!contaAlvo) {
            contaAlvo = contasArray.find((a: any) => {
              const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
              return id.includes('VOT') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo';
            });
          }
        } else {
          // Conta Real
          contaAlvo = contasArray.find((a: any) => {
            const id = (a.loginid || a.account_id || a.id || a.client_id || "").toString().toUpperCase();
            return !(id.includes('VRT') || id.includes('VOT') || id.startsWith('VR') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo');
          });
        }

        if (!contaAlvo) {
          this.addUserLog(userId, isDemo
            ? "❌ [ERRO] Token da Conta DEMO Inválido! Crie o token no site da Deriv ENQUANTO estiver logado na sua conta VIRTUAL (VRT)."
            : "❌ [ERRO] Conta Real não encontrada neste token.");
          this.stop(userId);
          return;
        }

        // Log detalhado para sabermos o formato real que a Deriv devolveu
        this.addUserLog(userId, `🔍 Conta encontrada: ${JSON.stringify(contaAlvo)}`);

        // A API V2 da Deriv geralmente retorna o loginid como identificador principal
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
          throw new Error("Account ID missing");
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
      this.addUserLog(userId, `⚠️ Erro de rede na V2, caindo para o Fallback V3: ${e.message}`);
    }
    // ---------------------------------

    const ws = new NodeWebSocket(wsUrl, {
      headers: {
        'Origin': 'https://fybot.life',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });

    this.userSockets.set(userId, ws);
    this.userPeakProfits.set(userId, {});
    let pingInterval: NodeJS.Timeout;

    ws.on('open', () => {
      this.addUserLog(userId, `✅ [WS] Conectado à Deriv!`);
      
      // Mantém a conexão viva a cada 25 segundos
      pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      }, 25000);

      if (needsAuthCommand) {
        this.addUserLog(userId, `Autenticando via fluxo clássico V3...`);
        ws.send(JSON.stringify({ authorize: tokenToUse }));
      } else {
        // Já autorizado via OTP, iniciar inscrições direto
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

        const trade = state.trades.find((t: any) => String(t.id) === contractId);
        if (trade) {
          trade.profit = profit;

          if (isSold) {
            if (trade.status !== 'CLOSED') {
              trade.status = 'CLOSED';
              state.dailyProfit += profit;
              this.addUserLog(userId, `💵 [FECHADO] Contrato ${contractId} fechado com ${profit >= 0 ? 'LUCRO' : 'PREJUÍZO'} de $${profit.toFixed(2)}`);

              // Regra de Trava (Bloqueio) - Se a meta de 2% for batida e não houver mais ordens abertas
              const target = state.dailyProfitTarget || (state.balance * 0.05);
              if (target > 0 && state.dailyProfit >= target) {
                const openCount = state.trades.filter((t: any) => t.status === 'OPEN').length;
                if (openCount === 0) {
                  if (userId === '1') {
                    this.addUserLog(userId, `🎉 [META BATIDA] Lucro diário atingiu a meta de $${target.toFixed(2)}, mas você é o ADMIN. O robô vai continuar operando sem limites!`);
                  } else {
                    state.systemBlocked = true;

                    // Calcula o próximo horário 21h BRT
                    const now = new Date();
                    const brtString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
                    const brtNow = new Date(brtString);
                    let nextStart = new Date(brtNow);
                    nextStart.setHours(21, 0, 0, 0);
                    const day = brtNow.getDay();
                    const hours = brtNow.getHours();
                    if (day === 5 && hours >= 15) nextStart.setDate(nextStart.getDate() + 2);
                    else if (day === 6) nextStart.setDate(nextStart.getDate() + 1);
                    else if (hours >= 21) nextStart.setDate(nextStart.getDate() + 1);
                    state.blockedUntil = new Date(Date.now() + (nextStart.getTime() - brtNow.getTime())).toISOString();

                    this.addUserLog(userId, `🎉 [META BATIDA] Lucro diário atingiu a meta de $${target.toFixed(2)} e todas as ordens foram fechadas. Sistema bloqueado!`);
                  }
                }
              }
            }
          } else {
            // TRAILING STOP (PROTEÇÃO DE BANCA) - Regra 6
            // Acompanha o preço enquanto a ordem estiver no positivo. Se o lucro
            // recuar 10% em relação ao topo já alcançado, fecha automaticamente
            // para proteger o que já foi ganho (trava 90% do pico).

            const peaks = this.userPeakProfits.get(userId)!;
            if (!peaks[contractId]) peaks[contractId] = 0;

            if (profit > peaks[contractId]) {
              peaks[contractId] = profit;
            }

            // Trailing Stop Inteligente:
            // Se já passamos de $0.50 de lucro, nós acompanhamos o preço.
            // Se o lucro cair 10% do topo máximo alcançado (segurando 90% do lucro na mão), a gente corta a ordem!
            const TRAILING_RETRACEMENT = 0.10; // 10% de recuo do topo
            if (peaks[contractId] > 0.50 && profit < (peaks[contractId] * (1 - TRAILING_RETRACEMENT))) {
              this.addUserLog(userId, `🛡️ [TRAILING SL] Recuo de 10% detectado! Lucro caiu de $${peaks[contractId].toFixed(2)} para $${profit.toFixed(2)}. Fechando para proteger a banca (90% do topo)!`);
              ws.send(JSON.stringify({ sell: contractId, price: 0 }));
              peaks[contractId] = 0; // Reseta para evitar spam
            }

            // --- LÓGICA DE GRID (PREÇO MÉDIO DE RECUPERAÇÃO) ---
            const entryPrice = Number(contract.entry_spot || contract.buy_price);
            const currentSpot = Number(contract.current_spot);
            if (entryPrice > 0 && currentSpot > 0) {
              const isBuy = (contract.contract_type === 'MULTUP' || trade.type === 'BUY');
              // Variação percentual do preço CONTRA a nossa posição
              const dropPercent = isBuy ? ((entryPrice - currentSpot) / entryPrice) * 100 : ((currentSpot - entryPrice) / entryPrice) * 100;

              const openCount = state.trades.filter((t: any) => t.status === 'OPEN').length;

              if (dropPercent >= 0.02 && openCount === 1) {
                this.addUserLog(userId, `📉 [GRID NÍVEL 1] Recuo negativo atingiu 0.02% (${dropPercent.toFixed(3)}%). Disparando Ordem 2!`);
                const tpPercent = 0.0002;
                const slPercent = 0.0090; // 0.90% fixo (Maior margem)
                const engineTp = isBuy ? currentSpot * (1 + tpPercent) : currentSpot * (1 - tpPercent);
                const engineSl = isBuy ? currentSpot * (1 - slPercent) : currentSpot * (1 + slPercent);
                this.executeSignal(userId, isBuy ? 'BUY' : 'SELL', currentSpot, "Correção de Grid Nível 1", engineTp, engineSl);
              }
              else if (dropPercent >= 0.04 && openCount === 2) {
                this.addUserLog(userId, `📉 [GRID NÍVEL 2] Recuo negativo atingiu 0.04% (${dropPercent.toFixed(3)}%). Disparando Ordem 3!`);
                const tpPercent = 0.0002;
                const slPercent = 0.0090; // 0.90% fixo (Maior margem)
                const engineTp = isBuy ? currentSpot * (1 + tpPercent) : currentSpot * (1 - tpPercent);
                const engineSl = isBuy ? currentSpot * (1 - slPercent) : currentSpot * (1 + slPercent);
                this.executeSignal(userId, isBuy ? 'BUY' : 'SELL', currentSpot, "Correção de Grid Nível 2", engineTp, engineSl);
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
          // Fix: Remover trades fantasmas pendentes para não acumular se a corretora recusar
          const state = this.getUserState(userId);
          state.trades = (state.trades || []).filter((t: any) => !t.id.startsWith('PENDING_'));
        } else {
          const contractId = String(data.buy.transaction_id || data.buy.contract_id);
          console.log(`[DerivConnectionManager] Ordem aberta com sucesso para ${userId}!`);
          this.addUserLog(userId, `🚀 Ordem aberta na corretora com sucesso! ID: ${contractId}`);

          const state = this.getUserState(userId);
          const pending = state.trades.find((t: any) => String(t.id).startsWith('PENDING_'));
          if (pending) {
            pending.id = contractId;
          }
        }
      }

      // Erro genérico
      if (data.error && data.msg_type !== 'buy' && data.msg_type !== 'contract_update') {
        this.addUserLog(userId, `⚠️ [ERRO CORRETORA] (${data.msg_type}): ${data.error.message}`);
        console.error(`[DerivConnectionManager] Erro Genérico:`, data.error);
      }

      // Resposta do Contract Update
      if (data.msg_type === 'contract_update') {
        if (data.error) {
          this.addUserLog(userId, `⚠️ [AVISO] Falha ao aplicar Limites (TP/SL) na ordem: ${data.error.message}. A ordem está aberta e rodando, mas sem limite automático.`);
          console.error(`[DerivConnectionManager] Erro no contract_update:`, data.error.message);
        } else {
          this.addUserLog(userId, `✅ [SUCESSO] Take Profit e Stop Loss configurados na corretora!`);
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
      clearInterval(pingInterval);
      this.addUserLog(userId, `🚨 [ERRO WS] Falha ao conectar: ${err.message}`);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
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
  }

  public executeSignal(userId: string, direction: 'BUY' | 'SELL', price: number, reason: string, engineTp: number, engineSl: number) {
    const state = this.getUserState(userId);

    // Se o lucro de hoje já passou ou é igual à meta, garante que fique bloqueado.
    const target = state.dailyProfitTarget || (state.balance * 0.05);
    if (target > 0 && state.dailyProfit >= target && userId !== '1') {
      state.systemBlocked = true;
    }

    if (state.systemBlocked && userId !== '1') {
      this.addUserLog(userId, `🔒 Sinal de ${direction} ignorado: Sistema bloqueado.`);
      return;
    }

    // Regra 8: Trava de envio de novas ordens se lucro atingir a meta (2%)
    if (target > 0 && state.dailyProfit >= target && userId !== '1') {
      this.addUserLog(userId, `🛡️ [META PROTEGIDA] Lucro atual ($${state.dailyProfit.toFixed(2)}) atingiu a meta de 2% ($${target.toFixed(2)}). Aguardando fechamento das ordens abertas para bloquear a tela!`);
      return;
    }

    // NOVO: Filtro de Tendência - só abre ordem se a direção do sinal estiver
    // a favor do regime de mercado atual (definido pelas chamadas a handleRegimeChange).
    // Se ainda não sabemos a tendência (regime nunca reportado), deixa passar com aviso,
    // para não travar o bot logo na primeira execução.
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

    // Regra Extra: Limite máximo absoluto de ordens simultâneas travado em 1 (Grid Desativado)
    const openTradesCount = state.trades.filter((t: any) => t.status === 'OPEN').length;
    if (openTradesCount >= 1) {
      this.addUserLog(userId, `✋ [LIMITE DE ORDENS] Já existe 1 ordem aberta. Aguardando finalização para buscar nova entrada.`);
      return;
    }

    // O limite de ordens por dia foi removido a pedido do usuário.
    // O robô vai operar quantas vezes forem necessárias até bater os 2% da banca.

    const ws = this.userSockets.get(userId);
    if (!ws || ws.readyState !== NodeWebSocket.OPEN) {
      this.addUserLog(userId, `⚠️ Erro: Sinal recebido, mas WebSocket offline. Conecte o robô primeiro.`);
      return;
    }

    this.addUserLog(userId, `🚀 [SINAL RECEBIDO] ${reason}. Executando ${direction}...`);

    // Regra 5: Stake Dinâmica de 10% do Saldo (Ajustado a pedido do usuário, ordem única super agressiva)
    const balance = state.balance > 0 ? state.balance : 1000;
    const dynamicStake = Math.max(0.5, parseFloat((balance * 0.10).toFixed(2))); // Mínimo $0.50

    const contractType = direction === 'BUY' ? 'MULTUP' : 'MULTDOWN';
    const multiplierValue = 100;

    // Converte os preços absolutos de TP/SL para o valor monetário esperado pela API da Deriv
    let tpAmount = parseFloat((Math.abs((engineTp - price) / price) * dynamicStake * multiplierValue).toFixed(2));
    let slAmount = parseFloat((Math.abs((engineSl - price) / price) * dynamicStake * multiplierValue).toFixed(2));

    // A corretora Deriv exige margens financeiras seguras para o Limit Order (TP/SL)
    // Para evitar qualquer erro de limite (LimitOrderAmountTooLow), forçamos $0.50 como mínimo absoluto.
    if (tpAmount < 0.50) tpAmount = 0.50;
    if (slAmount < 0.50) slAmount = 0.50;

    // 1. Envia a Ordem de Compra Direta (Multipliers para Ouro)
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

    // Simula a adição da ordem no estado
    const realTrade = {
      id: "PENDING_" + Date.now(),
      symbol: "frxXAUUSD",
      lot: dynamicStake,
      type: direction,
      openPrice: price,
      time: new Date().toISOString(),
      status: 'OPEN',
      profit: 0,
      tp: engineTp, // Passa o TP calculado pelo Motor para o Gráfico
      sl: engineSl  // Passa o SL calculado pelo Motor para o Gráfico
    };
    state.trades.unshift(realTrade);
    this.lastExecutions.set(userId, Date.now());
  }

  public handleRegimeChange(userId: string, regime: string) {
    const state = this.getUserState(userId);
    const ws = this.userSockets.get(userId);

    // NOVO: sempre atualiza a tendência conhecida do usuário, mesmo se não houver
    // WebSocket ativo no momento — é essa informação que executeSignal() usa para
    // filtrar ordens contra-tendência.
    this.userTrend.set(userId, regime);
    this.addUserLog(userId, `🧭 [TENDÊNCIA] Regime de mercado atualizado para: ${regime}`);

    if (!ws || ws.readyState !== NodeWebSocket.OPEN) return;

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