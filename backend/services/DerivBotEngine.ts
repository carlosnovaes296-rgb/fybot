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

    private candlesM15: Candle[] = [];
    private ATR_PERIOD = 14;

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
            console.log("[DerivBotEngine] Conectado. Autorizando com token da conta...");
            this.enginePingInterval = setInterval(() => {
                if (this.ws && this.ws.readyState === this.ws.OPEN) {
                    this.ws.send(JSON.stringify({ ping: 1 }));
                }
            }, 10000);

            this.isConnected = true;
            this.isAuthorized = true;
            this.requestCandleHistory();

            if (this.onLog) this.onLog('📊 Feed conectado. Carregando dados de mercado do Ouro (M1 DCA)...');
            this.ws.send(JSON.stringify({ authorize: this.currentToken.replace(/^Bearer\s+/i, '') }));
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
                    if (response.req_id === 300) {
                        this.candlesM15 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico M15: ${this.candlesM15.length} velas`);
                        if (this.candlesM15.length >= 300 && this.onLog) {
                            this.onLog(`[SYS] Histórico M15 carregado com sucesso (${this.candlesM15.length} velas)! Analisando mercado imediatamente...`);
                            this.analyzeMarket();
                        }
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
                    if (ohlcGran === 900) {
                        const isNewCandle = this.updateCandleSeries(this.candlesM15, candle);
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
            count: 350,
            style: 'candles',
            granularity: 900,
            subscribe: 1,
            req_id: 300
        }));

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
            return true;
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
        
        this.onLog?.(`🔍 Analisando mercado (M15) agora...`);

        if (this.candlesM15.length < 50) {
            this.onLog?.(`[Aguardando] Faltam velas no histórico para calcular tendência (Temos ${this.candlesM15.length})`);
            return;
        }

        const closedCandlesM15 = this.candlesM15.slice(0, -1);
        const closesM15 = closedCandlesM15.map(c => c.close);

        const ema14Series = Indicators.ema(closesM15, 14);
        const currentEma14 = ema14Series[ema14Series.length - 1];

        const ema21Series = Indicators.ema(closesM15, 21);
        const currentEma21 = ema21Series[ema21Series.length - 1];
        
        const rsiSeries = Indicators.rsi(closesM15, 14);
        const currentRsi = rsiSeries[rsiSeries.length - 1];

        const lastClosedM15 = closedCandlesM15[closedCandlesM15.length - 1];
        const currentPrice = lastClosedM15.close;

        let trend: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
        if (currentPrice > currentEma14 && currentEma14 > currentEma21) {
            trend = 'TREND_UP';
        } else if (currentPrice < currentEma14 && currentEma14 < currentEma21) {
            trend = 'TREND_DOWN';
        }

        if (trend !== this.lastTrend) {
            this.lastTrend = trend;
            if (this.onRegimeChange) this.onRegimeChange(trend);
        }

        if (!this.isWithinTradingHours()) return;

        let signal: 'BUY' | 'SELL' | null = null;
        let reason = '';

        if (trend === 'TREND_UP' && currentRsi <= 30) {
            signal = 'BUY';
            reason = `[DCA API] Compra | RSI: ${currentRsi.toFixed(1)} | EMA14 > EMA21`;
        }
        else if (trend === 'TREND_DOWN' && currentRsi >= 70) {
            signal = 'SELL';
            reason = `[DCA API] Venda | RSI: ${currentRsi.toFixed(1)} | EMA14 < EMA21`;
        }

        if (signal && this.onSignal && lastClosedM15.epoch !== this.lastSignalCandleEpoch) {
            this.lastSignalCandleEpoch = lastClosedM15.epoch;
            
            // O SL e TP individuais não são mais enviados via corretora (limit_order).
            // O DerivConnectionManager fará a gestão global da rede DCA em memória.
            this.onSignal(signal, currentPrice, reason, 0, 0);
        }
    }
}
