import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators, Candle } from './Indicators.ts';

export class DerivBotEngineEMA {
    private ws: NodeWebSocket | null = null;

    // App ID registrado em https://api.deriv.com/dashboard
    private appId = '33TVM6cBQ9GfSjbwQHHdE';
    private symbol = 'frxXAUUSD';
    private isConnected = false;
    private isAuthorized = false;
    private currentToken = '';
    public riskProfile?: string = 'CONSERVATIVE';

    // Offset do fuso horario (em horas) usado no filtro de horario de operacao.
    // Ex.: -3 para horario de Brasilia. Ajuste conforme necessario.
    private readonly UTC_OFFSET_HOURS = -3;
    private readonly TRADING_START_HOUR = 6;
    private readonly TRADING_END_HOUR = 17;

    private maxHistory: number = 300;
    private enginePingInterval: NodeJS.Timeout | null = null;

    private ohlcM5: Record<string, Candle> = {};

    private candlesH1: Candle[] = [];
    private candlesM5: Candle[] = [];

    // Periodos da estrategia
    private readonly EMA_TREND = 21;    // H1 (Média Móvel de Tendência principal)
    private readonly EMA_CONFIRM = 8;   // H1 (Média Móvel de Confirmação rápida)
    private readonly RSI_PERIOD = 14;   // M5
    private readonly ATR_PERIOD = 14;   // M5
    private readonly BREAKOUT_PERIOD = 10; // M5

    private lastTrend: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
    private lastSignalCandleEpoch: number | null = null;
    private lastMonitorLogTime = 0;

    public onSignal?: (direction: 'BUY' | 'SELL', price: number, reason: string, tp: number, sl: number) => void;
    public onRegimeChange?: (regime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL') => void;
    public onLog?: (msg: string) => void;
    public onAuthorized?: (accountInfo: any) => void;

    public disconnect() {
        if (this.ws) {
            console.log('[DerivBotEngine] Forcando desconexao via comando do usuario...');
            this.ws.terminate();
            this.ws.on('close', () => {
                if (this.enginePingInterval) clearInterval(this.enginePingInterval);
                this.isConnected = false;
                this.isAuthorized = false;
            });
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthorized = false;
    }

    public async connectWithToken(token: string, force: boolean = false) {
        if (this.isConnected && !force) return;
        if (force && this.isConnected) {
            this.disconnect();
        }
        this.currentToken = token;

        console.log(`[DerivBotEngine] Conectando ao feed da Deriv (app_id=${this.appId})...`);
        let finalWsUrl = `wss://ws.derivws.com/websockets/v3?app_id=33TVM6cBQ9GfSjbwQHHdE&l=PT`;
        let isMagic = false;

        if (this.currentToken) {
            try {
                const authHeader = this.currentToken.startsWith('Bearer ') ? this.currentToken : `Bearer ${this.currentToken}`;
                const resContas = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                    headers: {
                        'Deriv-App-ID': this.appId,
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    }
                });

                if (resContas.ok) {
                    const contasData = await resContas.json();
                    const contasArray = contasData.accounts || contasData.data || contasData;
                    // Pega a primeira conta real disponível ou qualquer conta se não houver real
                    let contaAlvo = null;
                    if (Array.isArray(contasArray) && contasArray.length > 0) {
                        contaAlvo = contasArray.find(a => {
                            const id = (a.loginid || a.account_id || a.id || "").toString().toUpperCase();
                            return !id.includes('VRT') && !id.startsWith('VR') && !id.includes('VOT') && !id.startsWith('DOT') && a.is_virtual !== 1 && a.is_virtual !== true && a.account_type !== 'demo';
                        });
                        if (!contaAlvo) contaAlvo = contasArray[0];
                    }

                    const foundAccountId = contaAlvo ? (contaAlvo.loginid || contaAlvo.account_id || contaAlvo.id) : null;

                    if (foundAccountId) {
                        const resOtp = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${foundAccountId}/otp`, {
                            method: 'POST',
                            headers: {
                                'Deriv-App-ID': this.appId,
                                'Authorization': authHeader,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                client_id: this.appId,
                                token: this.currentToken.replace(/^Bearer\s+/i, '')
                            })
                        });

                        if (resOtp.ok) {
                            const otpData = await resOtp.json();
                            const magicUrl = otpData.ws_url || otpData.websocket_url || otpData.url || (otpData.data && (otpData.data.ws_url || otpData.data.url));
                            if (magicUrl) {
                                finalWsUrl = magicUrl;
                                isMagic = true;
                                console.log("[DerivBotEngine] URL OTP obtida com sucesso!");
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[DerivBotEngine] Erro ao obter OTP via REST:", err);
            }
        }

        console.log(`[DerivBotEngine] Conectando WebSocket na URL: ${isMagic ? 'URL Segura (Oculta)' : finalWsUrl}`);

        this.ws = new NodeWebSocket(finalWsUrl, {
            headers: {
                'Origin': 'https://fybot.life',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
            }
        });

        if (this.enginePingInterval) {
            clearInterval(this.enginePingInterval);
        }

        let pongTimeout: NodeJS.Timeout;

        this.ws.on('open', () => {
            // Envia um ping imediato para garantir que a Deriv mantenha a conexão
            if (this.ws?.readyState === 1) {
                this.ws.send(JSON.stringify({ ping: 1 }));
            }

            this.enginePingInterval = setInterval(() => {
                if (this.ws?.readyState === 1) {
                    this.ws.send(JSON.stringify({ ping: 1 }));
                }
            }, 25000);

            this.isConnected = true;
            console.log(`[DerivBotEngine] Feed conectado. Autenticando...`);
            this.isAuthorized = true;
            this.requestCandleHistory(); // Pede o histórico
        });

        this.ws.on('message', (data: string) => {
            try {
                // LOG RAW DATA PARA DESCOBRIR O MISTÉRIO!
                console.log('[DEBUG-FEED-RAW]', data.toString().substring(0, 150));
                if (this.onLog && data.toString().includes('error')) this.onLog(`[SYS] Feed Raw Error: ${data.toString().substring(0, 100)}`);
                
                const response = JSON.parse(data);

                if (response.msg_type === 'ping') {
                    clearTimeout(pongTimeout);
                    return;
                }

                if (response.error) {
                    console.error('[DerivBotEngine] Erro da Deriv:', response.error);
                    if (this.onLog) this.onLog(`[SYS] Erro Deriv: ${response.error.message || JSON.stringify(response.error)}`);
                    // se a autorizacao falhou, nao ha por que manter o socket aberto tentando operar
                    if (response.msg_type === 'authorize') {
                        this.isAuthorized = false;
                    }
                    return;
                }

                if (response.msg_type === 'authorize') {
                    this.isAuthorized = true;
                    console.log(`[DerivBotEngine] Autorizado com sucesso. Conta: ${response.authorize?.loginid}`);
                    if (this.onLog) this.onLog(`✅ Conta autorizada: ${response.authorize?.loginid}`);
                    if (this.onAuthorized) this.onAuthorized(response.authorize);
                    return;
                }

                if (response.msg_type === 'candles') {
                    const mappedCandles = response.candles.map((c: any) => ({
                        epoch: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close
                    }));
                    if (response.req_id === 3600) {
                        this.candlesH1 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico H1: ${this.candlesH1.length} velas`);
                        if (this.onLog) this.onLog(`[SYS] Histórico H1 carregado: ${this.candlesH1.length}/205 velas necessárias`);
                    } else if (response.req_id === 300) {
                        this.candlesM5 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico M5: ${this.candlesM5.length} velas`);
                        if (this.onLog) this.onLog(`[SYS] Histórico M5 carregado: ${this.candlesM5.length}/55 velas necessárias`);
                    }
                }

                if (response.msg_type === 'ohlc') {
                    const ohlc = response.ohlc;
                    const candle: Candle = {
                        epoch: ohlc.open_time,
                        open: Number(ohlc.open),
                        high: Number(ohlc.high),
                        low: Number(ohlc.low),
                        close: Number(ohlc.close)
                    };

                    const ohlcGran = Number(ohlc.granularity);
                    if (ohlcGran === 3600) {
                        this.updateCandleSeries(this.candlesH1, candle);
                    } else if (ohlcGran === 300) {
                        const isNewCandle = this.updateCandleSeries(this.candlesM5, candle);
                        // Apenas analisar o mercado se uma nova vela fechou no M5
                        if (isNewCandle) {
                            this.analyzeMarket();
                        }
                    }
                }
            } catch (err) {
                console.error('[DerivBotEngine] Erro ao parsear mensagem:', err);
            }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
            const reasonStr = reason ? reason.toString() : 'Desconhecido';
            console.log(`[DerivBotEngine] Conexao com feed fechada. Codigo: ${code}, Motivo: ${reasonStr}`);
            if (this.enginePingInterval) clearInterval(this.enginePingInterval);
            console.log('[DerivBotEngine] Conexao com feed fechada. Tentando reconectar em 5s...');
            if (this.onLog) this.onLog(`⚠️ Conexao com feed perdida. Reconectando em 5s...`);
            this.isConnected = false;
            this.isAuthorized = false;
            setTimeout(() => {
                if (this.currentToken) this.connectWithToken(this.currentToken);
            }, 5000);
        });

        this.ws.on('error', (err) => {
            if (this.enginePingInterval) clearInterval(this.enginePingInterval);
            console.error('[DerivBotEngine] Erro no socket de feed:', err);
            this.ws?.terminate();
        });
    }

    private requestCandleHistory() {
        this.ws?.send(JSON.stringify({
            ticks_history: this.symbol,
            end: 'latest',
            count: 250,
            style: 'candles',
            granularity: 3600, // H1
            subscribe: 0, // 0 para evitar erro de "already subscribed" (M5 terá a assinatura)
            req_id: 3600
        }));

        // Pequeno atraso para evitar "Rate Limit" ou desconexão por excesso de inscrições simultâneas
        setTimeout(() => {
            this.ws?.send(JSON.stringify({
                ticks_history: this.symbol,
                end: 'latest',
                count: 100,
                style: 'candles',
                granularity: 300, // M5
                subscribe: 1,
                req_id: 300
            }));

            // ATENÇÃO: Assinatura fantasma de R_100 (Índice de Volatilidade)
            // Se o Ouro não suportar streaming, a Deriv fecha a conexão em 18s por ociosidade.
            // O R_100 mantém a conexão ativa eternamente!
            this.ws?.send(JSON.stringify({
                ticks: 'R_100',
                subscribe: 1,
                req_id: 9999
            }));
        }, 2000);
    }

    private updateCandleSeries(series: Candle[], newCandle: Candle): boolean {
        if (series.length === 0) {
            series.push(newCandle);
            return false;
        }
        const lastCandle = series[series.length - 1];
        if (newCandle.epoch === lastCandle.epoch) {
            series[series.length - 1] = newCandle;
            return false;
        } else if (newCandle.epoch > lastCandle.epoch) {
            series.push(newCandle);
            if (series.length > 500) series.shift();
            return true; // Retorna true se fechou a vela anterior e abriu uma nova
        }
        return false;
    }

    private isWithinTradingHours(): boolean {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const adjustedHour = (utcHour + this.UTC_OFFSET_HOURS + 24) % 24;
        const day = now.getUTCDay(); // 0 = Domingo, 6 = Sabado

        // Nao opera final de semana
        if (day === 0 || day === 6) {
            return false;
        }

        // Pausa especifica das 17:00 as 20:59 (volta as 21:00)
        if (adjustedHour >= 17 && adjustedHour < 21) {
            return false;
        }

        return true;
    }

    private analyzeMarket() {
        if (!this.isAuthorized) return; // seguranca extra: nunca opera sem autorizacao confirmada
        if (this.candlesH1.length < this.EMA_TREND + 5) return;
        if (this.candlesM5.length < this.EMA_CONFIRM + 5) return;

        // Sempre usar a ultima vela FECHADA para tomar decisao (evita repainting)
        const closedCandlesH1 = this.candlesH1.slice(0, -1);
        const closedCandlesM5 = this.candlesM5.slice(0, -1);

        const closesH1 = closedCandlesH1.map(c => c.close);
        const closesM5 = closedCandlesM5.map(c => c.close);

        // EMA de tendencia (200) e EMA de confirmacao (50) calculadas no MESMO timeframe (H1),
        // para que a comparacao "EMA50 > EMA200" faca sentido.
        const emaTrendSeries = Indicators.ema(closesH1, this.EMA_TREND);
        const emaConfirmSeries = Indicators.ema(closesH1, this.EMA_CONFIRM);
        const rsiSeries = Indicators.rsi(closesM5, this.RSI_PERIOD);

        const currentEmaTrend = emaTrendSeries[emaTrendSeries.length - 1];
        const currentEmaConfirm = emaConfirmSeries[emaConfirmSeries.length - 1];
        const currentRsi = rsiSeries[rsiSeries.length - 1];

        const lastClosedM5 = closedCandlesM5[closedCandlesM5.length - 1];
        const currentPrice = lastClosedM5.close;

        // ATR calculation
        const atrSeries = Indicators.atr(closedCandlesM5, this.ATR_PERIOD);
        const currentAtr = atrSeries[atrSeries.length - 1] || (currentPrice * 0.003);

        // Breakout levels
        const prev10Candles = closedCandlesM5.slice(-this.BREAKOUT_PERIOD - 1, -1);
        const resistance = Indicators.highestHigh(prev10Candles, this.BREAKOUT_PERIOD);
        const support = Indicators.lowestLow(prev10Candles, this.BREAKOUT_PERIOD);

        // Define tendencia com base no preco vs EMA200 (H1)
        let trend: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
        if (currentPrice > currentEmaTrend) trend = 'TREND_UP';
        else if (currentPrice < currentEmaTrend) trend = 'TREND_DOWN';

        if (trend !== this.lastTrend) {
            this.lastTrend = trend;
            this.onRegimeChange?.(trend);
        }

        const nowLog = Date.now();
        if (nowLog - this.lastMonitorLogTime >= 60000) {
            this.lastMonitorLogTime = nowLog;
            this.onLog?.(`🧠 [Sniper V2] Tend H1: ${trend} | Preco: ${currentPrice.toFixed(2)} | EMA50(H1): ${currentEmaConfirm.toFixed(2)} | RSI(M5): ${currentRsi.toFixed(1)}`);
        }

        // Trava de horario inteligente (pausa das 17h as 21h)
        if (!this.isWithinTradingHours()) {
           return;
        }

        let signal: 'BUY' | 'SELL' | null = null;
        let reason = '';

        if (
            trend === 'TREND_UP' &&
            currentRsi >= 50
        ) {
            signal = 'BUY';
            reason = `[Sniper V2] Compra Confirmada | RSI: ${currentRsi.toFixed(1)} | Tendencia Alta`;
        }
        else if (
            trend === 'TREND_DOWN' &&
            currentRsi <= 50
        ) {
            signal = 'SELL';
            reason = `[Sniper V2] Venda Confirmada | RSI: ${currentRsi.toFixed(1)} | Tendencia Baixa`;
        }

        if (!signal) return;

        // One Shot: evita enviar sinal repetido na mesma vela
        const currentCandleEpoch = lastClosedM5.epoch;
        if (currentCandleEpoch === this.lastSignalCandleEpoch) return;
        this.lastSignalCandleEpoch = currentCandleEpoch;

        // TP Fixo da Ordem 1: 0.04%
        const tpDistance = currentPrice * 0.0004;

        let tpPrice = 0, slPrice = 0;
        if (signal === 'BUY') {
            tpPrice = parseFloat((currentPrice + tpDistance).toFixed(2));
            // SL price = 0 para usar a trava inteligente de PnL no servidor
            slPrice = 0;
        } else {
            tpPrice = parseFloat((currentPrice - tpDistance).toFixed(2));
            slPrice = 0;
        }

        this.onLog?.(`🔥 Sinal Disparado: ${signal} em ${currentPrice.toFixed(2)} | TP: ${tpPrice.toFixed(2)} (0.04%)`);
        // A API original onSignal envia (direction, price, reason, tp, sl).
        this.onSignal?.(signal, currentPrice, reason, tpPrice, slPrice);
    }
}
