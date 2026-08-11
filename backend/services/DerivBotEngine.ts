import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators } from './Indicators.ts';
import type { Candle } from './Indicators.ts';

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

    private candlesM1: Candle[] = [];

    // Periodos da estrategia (Sniper M1)
    private readonly EMA_TREND = 21;    // M1
    private readonly RSI_PERIOD = 14;   // M1

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
        let clean = (token || '').trim();
        while (clean.startsWith('pat_pat_')) {
            clean = clean.replace(/^pat_pat_/, 'pat_');
        }
        this.currentToken = clean;

        console.log(`[DerivBotEngine] Conectando ao feed da Deriv (app_id=${this.appId})...`);
        if (this.onLog) this.onLog(`📡 Conectando ao feed da Deriv...`);

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
            console.log(`[DerivBotEngine] Feed conectado. Carregando dados de mercado...`);
            if (this.onLog) this.onLog(`📊 Feed conectado. Carregando dados de mercado do Ouro (M1 Sniper)...`);

            this.isAuthorized = true;
            this.requestCandleHistory();
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
                    if (this.onLog) this.onLog(`[SYS] Erro Deriv: ${response.error.message || JSON.stringify(response.error)}`);
                    if (response.msg_type === 'authorize') {
                        this.isAuthorized = false;
                        if (this.onLog) this.onLog(`⚠️ Token da conta inválido: ${response.error.message}.`);
                    } else if (response.error.message && response.error.message.includes('frxXAUUSD is invalid')) {
                        console.warn('[DerivBotEngine] Símbolo de Ouro indisponível temporariamente na Deriv');
                    }
                    return;
                }

                if (response.msg_type === 'authorize') {
                    this.isAuthorized = true;
                    if (this.onLog) this.onLog(`✅ Conta autorizada: ${response.authorize?.loginid}`);
                    if (this.onAuthorized) this.onAuthorized(response.authorize);
                }

                if (response.msg_type === 'candles') {
                    const mappedCandles = response.candles.map((c: any) => ({
                        epoch: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close
                    }));
                    if (response.req_id === 60) {
                        this.candlesM1 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico M1: ${this.candlesM1.length} velas`);
                        if (this.onLog) this.onLog(`[SYS] Histórico M1 (Sniper) carregado: ${this.candlesM1.length} velas`);
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
                    if (ohlcGran === 60) {
                        const isNewCandle = this.updateCandleSeries(this.candlesM1, candle);
                        // Apenas analisar o mercado se uma nova vela fechou no M1
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
            if (this.onLog) this.onLog(`⚠️ Conexao Deriv fechada. Código: ${code} | Motivo: ${reasonStr}`);
            this.isConnected = false;
            this.isAuthorized = false;
            setTimeout(() => {
                if (this.currentToken) this.connectWithToken(this.currentToken);
            }, 5000);
        });

        this.ws.on('error', (err: any) => {
            if (this.enginePingInterval) clearInterval(this.enginePingInterval);
            console.error('[DerivBotEngine] Erro no socket de feed:', err);
            if (this.onLog) this.onLog(`⚠️ Erro no feed de mercado: ${err?.message || err}`);
            this.ws?.terminate();
        });
    }

    private requestCandleHistory() {
        this.ws?.send(JSON.stringify({
            ticks_history: this.symbol,
            end: 'latest',
            count: 300,
            style: 'candles',
            granularity: 60, // M1
            subscribe: 1,
            req_id: 60
        }));

        // ATENÇÃO: Assinatura fantasma de R_100 (Índice de Volatilidade)
        // Se o Ouro não suportar streaming, a Deriv fecha a conexão em 18s por ociosidade.
        // O R_100 mantém a conexão ativa eternamente!
        setTimeout(() => {
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
        if (!this.isAuthorized) return; 
        if (this.candlesM1.length < this.EMA_TREND + 5) return;

        // Sempre usar a ultima vela FECHADA para tomar decisao (evita repainting)
        const closedCandlesM1 = this.candlesM1.slice(0, -1);
        const closesM1 = closedCandlesM1.map(c => c.close);

        const emaTrendSeries = Indicators.ema(closesM1, this.EMA_TREND);
        const rsiSeries = Indicators.rsi(closesM1, this.RSI_PERIOD);

        const currentEmaTrend = emaTrendSeries[emaTrendSeries.length - 1];
        const currentRsi = rsiSeries[rsiSeries.length - 1];

        const lastClosedM1 = closedCandlesM1[closedCandlesM1.length - 1];
        const currentPrice = lastClosedM1.close;

        // Define tendencia com base no preco vs EMA21 (M1)
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
            this.onLog?.(`🧠 [Sniper V3] Tend M1: ${trend} | Preço: ${currentPrice.toFixed(2)} | EMA21: ${currentEmaTrend.toFixed(2)} | RSI: ${currentRsi.toFixed(1)}`);
        }

        if (!this.isWithinTradingHours()) {
           return;
        }

        let signal: 'BUY' | 'SELL' | null = null;
        let reason = '';

        // Sniper Mean Reversion / Pullback Logic
        // Em M1, usamos RSI 40 e 60 com EMA 21 para pegar pullbacks frequentes e seguros
        if (
            trend === 'TREND_UP' &&
            currentRsi <= 40
        ) {
            signal = 'BUY';
            reason = `[Sniper M1] Compra Confirmada (Pullback) | RSI: ${currentRsi.toFixed(1)} | Tendência Alta`;
        }
        else if (
            trend === 'TREND_DOWN' &&
            currentRsi >= 60
        ) {
            signal = 'SELL';
            reason = `[Sniper M1] Venda Confirmada (Pullback) | RSI: ${currentRsi.toFixed(1)} | Tendência Baixa`;
        }

        if (!signal) return;

        // One Shot: evita enviar sinal repetido na mesma vela
        const currentCandleEpoch = lastClosedM1.epoch;
        if (currentCandleEpoch === this.lastSignalCandleEpoch) return;
        this.lastSignalCandleEpoch = currentCandleEpoch;

        // Sniper TP: 0.02% | SL: 0.30%
        const tpDistance = currentPrice * 0.0002;
        const slDistance = currentPrice * 0.0030;

        let tpPrice = 0, slPrice = 0;
        if (signal === 'BUY') {
            tpPrice = parseFloat((currentPrice + tpDistance).toFixed(2));
            slPrice = parseFloat((currentPrice - slDistance).toFixed(2));
        } else {
            tpPrice = parseFloat((currentPrice - tpDistance).toFixed(2));
            slPrice = parseFloat((currentPrice + slDistance).toFixed(2));
        }

        this.onLog?.(`🔥 Sinal Disparado: ${signal} em ${currentPrice.toFixed(2)} | TP: ${tpPrice.toFixed(2)} (0.02%) | SL: ${slPrice.toFixed(2)} (0.30%)`);
        this.onSignal?.(signal, currentPrice, reason, tpPrice, slPrice);
    }
}
