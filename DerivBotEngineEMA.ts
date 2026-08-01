import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators, Candle } from './Indicators.ts';

export class DerivBotEngineEMA {
    private ws: NodeWebSocket | null = null;

    // IMPORTANTE: use um app_id registrado por voce em https://api.deriv.com/dashboard
    // O 1089 e um app_id de demonstracao publico e pode nao ter permissao para autorizar/operar.
    private appId = '1089';
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

    private candlesH1: Candle[] = [];
    private candlesM15: Candle[] = [];

    // Periodos da estrategia
    private readonly EMA_TREND = 200;   // H1
    private readonly EMA_CONFIRM = 50;  // H1 (mesma timeframe da tendencia, para comparacao coerente)
    private readonly RSI_PERIOD = 14;   // M15
    private readonly ATR_PERIOD = 14;   // M15
    private readonly BREAKOUT_PERIOD = 10; // M15

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
        if (this.onLog) this.onLog(`📡 Conectando ao feed da Deriv...`);

        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=PT`;

        this.ws = new NodeWebSocket(wsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        let enginePingInterval: NodeJS.Timeout;
        let pongTimeout: NodeJS.Timeout;

        this.ws.on('open', () => {
            enginePingInterval = setInterval(() => {
                if (this.ws?.readyState === 1) {
                    this.ws.send(JSON.stringify({ ping: 1 }));
                    pongTimeout = setTimeout(() => {
                        console.log('[DerivBotEngine] Ping timeout! Forcando encerramento.');
                        this.ws?.terminate();
                    }, 10000);
                }
            }, 25000);

            this.isConnected = true;
            console.log(`[DerivBotEngine] Feed conectado. Autenticando...`);
            if (this.onLog) this.onLog(`🔐 Feed conectado. Autenticando conta...`);

            // Autenticacao real da Deriv: envia o token diretamente pelo WebSocket.
            this.ws?.send(JSON.stringify({ authorize: this.currentToken, req_id: 1 }));
        });

        this.ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);

                if (response.msg_type === 'ping') {
                    clearTimeout(pongTimeout);
                    return;
                }

                if (response.error) {
                    console.error('[DerivBotEngine] Erro da Deriv:', response.error);
                    if (this.onLog) this.onLog(`⚠️ Erro da Deriv: ${response.error.message ?? response.error.code}`);
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

                    // So pede o historico de velas depois de confirmar a autorizacao
                    this.requestCandleHistory();
                    return;
                }

                if (response.msg_type === 'candles') {
                    const mappedCandles = response.candles.map((c: any) => ({
                        epoch: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close
                    }));
                    if (response.req_id === 3600) {
                        this.candlesH1 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico H1: ${this.candlesH1.length} velas`);
                    } else if (response.req_id === 900) {
                        this.candlesM15 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico M15: ${this.candlesM15.length} velas`);
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

                    if (ohlc.granularity === 3600) {
                        this.updateCandleSeries(this.candlesH1, candle);
                    } else if (ohlc.granularity === 900) {
                        const isNewCandle = this.updateCandleSeries(this.candlesM15, candle);
                        // Apenas analisar o mercado se uma nova vela fechou no M15
                        if (isNewCandle) {
                            this.analyzeMarket();
                        }
                    }
                }
            } catch (err) {
                console.error('[DerivBotEngine] Erro ao parsear mensagem:', err);
            }
        });

        this.ws.on('close', () => {
            clearInterval(enginePingInterval);
            clearTimeout(pongTimeout);
            console.log('[DerivBotEngine] Conexao com feed fechada. Tentando reconectar em 5s...');
            if (this.onLog) this.onLog(`⚠️ Conexao com feed perdida. Reconectando em 5s...`);
            this.isConnected = false;
            this.isAuthorized = false;
            setTimeout(() => {
                if (this.currentToken) this.connectWithToken(this.currentToken);
            }, 5000);
        });

        this.ws.on('error', (err) => {
            clearInterval(enginePingInterval);
            clearTimeout(pongTimeout);
            console.error('[DerivBotEngine] Erro no socket de feed:', err);
            this.ws?.terminate();
        });
    }

    private requestCandleHistory() {
        // Historico H1 (para EMA 200 e EMA 50 de tendencia)
        this.ws?.send(JSON.stringify({
            ticks_history: this.symbol,
            end: 'latest',
            count: 250,
            style: 'candles',
            granularity: 3600, // H1
            subscribe: 1,
            req_id: 3600
        }));

        // Historico M15 (para confirmacao e entradas)
        this.ws?.send(JSON.stringify({
            ticks_history: this.symbol,
            end: 'latest',
            count: 100,
            style: 'candles',
            granularity: 900, // M15
            subscribe: 1,
            req_id: 900
        }));
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
        // Usa hora UTC + offset configurado, em vez da hora local da maquina/servidor,
        // para nao depender de onde o processo Node esta hospedado.
        const now = new Date();
        const utcHour = now.getUTCHours();
        const adjustedHour = (utcHour + this.UTC_OFFSET_HOURS + 24) % 24;
        return adjustedHour >= this.TRADING_START_HOUR && adjustedHour < this.TRADING_END_HOUR;
    }

    private analyzeMarket() {
        if (!this.isAuthorized) return; // seguranca extra: nunca opera sem autorizacao confirmada
        if (this.candlesH1.length < this.EMA_TREND + 5) return;
        if (this.candlesM15.length < this.EMA_CONFIRM + 5) return;

        // Sempre usar a ultima vela FECHADA para tomar decisao (evita repainting)
        const closedCandlesH1 = this.candlesH1.slice(0, -1);
        const closedCandlesM15 = this.candlesM15.slice(0, -1);

        const closesH1 = closedCandlesH1.map(c => c.close);
        const closesM15 = closedCandlesM15.map(c => c.close);

        // EMA de tendencia (200) e EMA de confirmacao (50) calculadas no MESMO timeframe (H1),
        // para que a comparacao "EMA50 > EMA200" faca sentido.
        const emaTrendSeries = Indicators.ema(closesH1, this.EMA_TREND);
        const emaConfirmSeries = Indicators.ema(closesH1, this.EMA_CONFIRM);
        const rsiSeries = Indicators.rsi(closesM15, this.RSI_PERIOD);

        const currentEmaTrend = emaTrendSeries[emaTrendSeries.length - 1];
        const currentEmaConfirm = emaConfirmSeries[emaConfirmSeries.length - 1];
        const currentRsi = rsiSeries[rsiSeries.length - 1];

        const lastClosedM15 = closedCandlesM15[closedCandlesM15.length - 1];
        const currentPrice = lastClosedM15.close;

        // ATR calculation
        const atrSeries = Indicators.atr(closedCandlesM15, this.ATR_PERIOD);
        const currentAtr = atrSeries[atrSeries.length - 1] || (currentPrice * 0.003);

        // Breakout levels
        const prev10Candles = closedCandlesM15.slice(-this.BREAKOUT_PERIOD - 1, -1);
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
            this.onLog?.(`🧠 [Sniper V2] Tend H1: ${trend} | Preco: ${currentPrice.toFixed(2)} | EMA50(H1): ${currentEmaConfirm.toFixed(2)} | RSI(M15): ${currentRsi.toFixed(1)}`);
        }

        if (!this.isWithinTradingHours()) {
            return;
        }

        let signal: 'BUY' | 'SELL' | null = null;
        let reason = '';

        if (
            trend === 'TREND_UP' &&
            currentEmaConfirm > currentEmaTrend &&
            currentRsi >= 55 && currentRsi <= 70 &&
            currentPrice > resistance
        ) {
            signal = 'BUY';
            reason = `[Sniper V2] Compra Confirmada | RSI: ${currentRsi.toFixed(1)} | Rompeu Resistencia: ${resistance.toFixed(2)}`;
        }
        else if (
            trend === 'TREND_DOWN' &&
            currentEmaConfirm < currentEmaTrend &&
            currentRsi >= 30 && currentRsi <= 45 &&
            currentPrice < support
        ) {
            signal = 'SELL';
            reason = `[Sniper V2] Venda Confirmada | RSI: ${currentRsi.toFixed(1)} | Rompeu Suporte: ${support.toFixed(2)}`;
        }

        if (!signal) return;

        // One Shot: evita enviar sinal repetido na mesma vela
        const currentCandleEpoch = lastClosedM15.epoch;
        if (currentCandleEpoch === this.lastSignalCandleEpoch) return;
        this.lastSignalCandleEpoch = currentCandleEpoch;

        // SL = ATR * 2
        // TP = ATR * 3
        const slDistance = currentAtr * 2;
        const tpDistance = currentAtr * 3;

        let tpPrice = 0, slPrice = 0;
        if (signal === 'BUY') {
            tpPrice = parseFloat((currentPrice + tpDistance).toFixed(2));
            slPrice = parseFloat((currentPrice - slDistance).toFixed(2));
        } else {
            tpPrice = parseFloat((currentPrice - tpDistance).toFixed(2));
            slPrice = parseFloat((currentPrice + slDistance).toFixed(2));
        }

        this.onLog?.(`🔥 Sinal Disparado: ${signal} em ${currentPrice.toFixed(2)} | SL: ${slPrice.toFixed(2)} | TP: ${tpPrice.toFixed(2)}`);
        this.onSignal?.(signal, currentPrice, reason, tpPrice, slPrice);
    }
}
