import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators, type Candle } from './Indicators.ts';

export class DerivBotEngineEMA {
    private ws: NodeWebSocket | null = null;

    // App ID registrado em https://api.deriv.com/dashboard
    private appId = process.env.DERIV_APP_ID || '33TVM6cBQ9GfSjbwQHHdE';
    private symbol = 'frxXAUUSD';
    private isConnected = false;
    private isAuthorized = false;
    private currentToken = '';
    public riskProfile?: string = 'CONSERVATIVE';
    public isAdmin: boolean = false;

    // Offset do fuso horario (em horas) usado no filtro de horario de operacao.
    // Ex.: -3 para horario de Brasilia. Ajuste conforme necessario.
    private readonly UTC_OFFSET_HOURS = -3;
    private readonly TRADING_START_HOUR = 21;
    private readonly TRADING_END_HOUR = 17;

    private maxHistory: number = 300;
    private enginePingInterval: NodeJS.Timeout | null = null;
    // [CORRIGIDO] pongTimeout precisa viver no escopo da instancia, nao dentro de connectWithToken,
    // senao cada nova conexao perde a referencia do timeout anterior e o watchdog nunca funciona.
    private pongTimeout: NodeJS.Timeout | null = null;
    private readonly PONG_TIMEOUT_MS = 15000;

    private candlesM15: Candle[] = [];
    private ATR_PERIOD = 14;

    private lastTrend: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
    private lastSignalTime: number = 0;
    private lastMonitorLogTime = 0;

    public currentEma8: number = 0;
    public currentEma21: number = 0;

    public getMarketState() {
        if (this.candlesM15.length < 3) return null;

        // Retorna as 3 últimas velas fechadas para análise de exaustão
        const len = this.candlesM15.length;
        // len - 1 = vela atual (aberta), len - 2 = última fechada
        const lastClosedCandle = this.candlesM15[len - 2];
        const prevCandle1 = this.candlesM15[len - 3];
        const prevCandle2 = this.candlesM15[len - 4] || prevCandle1;

        return {
            ema8: this.currentEma8,
            ema21: this.currentEma21,
            lastClosedCandle,
            prevCandle1,
            prevCandle2
        };
    }

    public onSignal?: (direction: 'BUY' | 'SELL', price: number, reason: string, tp: number, sl: number) => void;
    public onRegimeChange?: (regime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL') => void;
    public onLog?: (msg: string) => void;
    public onAuthorized?: (accountInfo: any) => void;

    public disconnect() {
        if (this.ws) {
            console.log('[DerivBotEngine] Forcando desconexao via comando do usuario...');
            const wsRef = this.ws;
            // [CORRIGIDO] o listener de 'close' agora e registrado ANTES do terminate(),
            // evitando a corrida em que o evento poderia disparar antes do handler existir.
            wsRef.on('close', () => {
                if (this.enginePingInterval) clearInterval(this.enginePingInterval);
                if (this.pongTimeout) clearTimeout(this.pongTimeout);
                this.isConnected = false;
                this.isAuthorized = false;
            });
            wsRef.terminate();
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
        // Deriv WebSocket API requires app_id to be a valid numeric integer (e.g., 1089).
        // Using a custom string API key here will cause the WebSocket to reject with 401.
        let finalWsUrl = `wss://ws.derivws.com/websockets/v3?app_id=1089&l=PT`;
        let isMagic = false;

        if (this.currentToken) {
            try {
                const origin = 'https://fybot.life';
                const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
                const baseHeaders = {
                    'Deriv-App-ID': this.appId,
                    'Origin': origin,
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent
                };

                let authHeader = this.currentToken.startsWith('Bearer ') ? this.currentToken : `Bearer ${this.currentToken}`;
                let resContas = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                    headers: { ...baseHeaders, 'Authorization': authHeader }
                });

                if (resContas.status === 401) {
                    authHeader = this.currentToken.replace(/^Bearer\s+/i, '');
                    console.log("[DerivBotEngine] Tentando autorização direta do Token PAT sem o prefixo Bearer...");
                    resContas = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                        headers: { ...baseHeaders, 'Authorization': authHeader }
                    });
                }

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
                        const otpUrl = `https://api.derivws.com/trading/v1/options/accounts/${foundAccountId}/otp`;
                        const otpBody = {
                            client_id: this.appId,
                            token: this.currentToken.replace(/^Bearer\s+/i, '')
                        };
                        console.log(`[DerivBotEngine] Solicitando OTP em: ${otpUrl} com body:`, otpBody);
                        
                        const resOtp = await fetch(otpUrl, {
                            method: 'POST',
                            headers: { ...baseHeaders, 'Authorization': authHeader },
                            body: JSON.stringify(otpBody)
                        });

                        console.log(`[DerivBotEngine] Resposta OTP Status: ${resOtp.status}`);
                        const respText = await resOtp.text();
                        console.log(`[DerivBotEngine] Resposta OTP Body:`, respText);

                        if (resOtp.ok) {
                            try {
                                const otpData = JSON.parse(respText);
                                const magicUrl = otpData.ws_url || otpData.websocket_url || otpData.url || (otpData.data && (otpData.data.ws_url || otpData.data.url));
                                if (magicUrl) {
                                    finalWsUrl = magicUrl;
                                    isMagic = true;
                                    console.log("[DerivBotEngine] URL OTP obtida com sucesso!");
                                }
                            } catch (e) {
                                console.error("[DerivBotEngine] Erro no JSON do OTP", e);
                            }
                        }
                    } else {
                        console.log("[DerivBotEngine] Nenhuma conta alvo encontrada.");
                    }
                } else {
                    const errorText = await resContas.text();
                    console.log(`[DerivBotEngine] Erro ao buscar contas. Status: ${resContas.status}, Body: ${errorText}`);
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
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }

        this.ws.on('open', () => {
            console.log("[DerivBotEngine] Conectado. Autorizando com token da conta...");
            this.enginePingInterval = setInterval(() => {
                if (this.ws && this.ws.readyState === this.ws.OPEN) {
                    this.ws.send(JSON.stringify({ ping: 1 }));
                    // [CORRIGIDO] agora o watchdog realmente arma um timeout: se o 'pong'
                    // (msg_type 'ping' de resposta) nao chegar a tempo, forcamos o terminate()
                    // do socket para acionar a reconexao automatica no handler de 'close'.
                    if (this.pongTimeout) clearTimeout(this.pongTimeout);
                    this.pongTimeout = setTimeout(() => {
                        console.warn('[DerivBotEngine] Pong nao recebido a tempo. Encerrando socket para reconectar...');
                        if (this.onLog) this.onLog('⚠️ Sem resposta do servidor (pong). Reiniciando conexao...');
                        this.ws?.terminate();
                    }, this.PONG_TIMEOUT_MS);
                }
            }, 10000);

            // [CORRIGIDO] isConnected passa a refletir apenas que o socket abriu.
            // isAuthorized so vira true quando a Deriv confirmar o 'authorize' na mensagem,
            // e requestCandleHistory() so e chamado apos essa confirmacao (ver 'message' abaixo).
            this.isConnected = true;

            if (this.onLog) this.onLog('📊 Feed conectado. Autorizando conta...');
            if (this.ws && this.ws.readyState === this.ws.OPEN) {
                this.ws.send(JSON.stringify({ authorize: this.currentToken.replace(/^Bearer\s+/i, '') }));
            }
        });

        this.ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);

                if (response.msg_type === 'ping') {
                    // Resposta (pong) do servidor ao nosso ping
                    if (this.pongTimeout) {
                        clearTimeout(this.pongTimeout);
                        this.pongTimeout = null;
                    }
                    return;
                }

                if (response.error) {
                    console.error('[DerivBotEngine] Erro da Deriv:', response.error);
                    if (this.onLog) this.onLog(`[SYS] Erro Deriv: ${response.error.message || JSON.stringify(response.error)}`);
                    if (response.msg_type === 'authorize') {
                        // [CORRIGIDO] antes disso o socket ficava pendurado (isConnected=true,
                        // isAuthorized=false, sem tentativa de reconexao). Agora forcamos o
                        // terminate() para cair no fluxo padrao de reconexao em 5s.
                        this.isAuthorized = false;
                        console.error('[DerivBotEngine] Falha na autorizacao. Encerrando socket para nova tentativa...');
                        this.ws?.terminate();
                    }
                    return;
                }

                if (response.msg_type === 'authorize') {
                    this.isAuthorized = true;
                    console.log(`[DerivBotEngine] Autorizado com sucesso. Conta: ${response.authorize?.loginid}`);
                    if (this.onLog) this.onLog(`✅ Conta autorizada: ${response.authorize?.loginid}`);
                    if (this.onAuthorized) this.onAuthorized(response.authorize);
                    // [CORRIGIDO] o historico de velas so e pedido depois da autorizacao confirmada,
                    // e nao mais otimisticamente no 'open'.
                    this.requestCandleHistory();
                    return;
                }

                if (response.msg_type === 'candles') {
                    const mappedCandles = response.candles.map((c: any) => ({
                        epoch: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close
                    }));
                    if (response.req_id === 300) {
                        this.candlesM15 = mappedCandles;
                        console.log(`[DerivBotEngine] Carregado historico M15: ${this.candlesM15.length} velas`);
                        if (this.candlesM15.length > 50 && this.onLog) {
                            this.onLog(`[SYS] Histórico M15 carregado! Analisando mercado imediatamente...`);
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
                        this.updateCandleSeries(this.candlesM15, candle);
                        this.analyzeMarket(); // Analisa em todo tick para entradas rápidas
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
            if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
                this.pongTimeout = null;
            }
            console.log('[DerivBotEngine] Conexao com feed fechada. Tentando reconectar em 5s...');
            if (this.onLog) this.onLog(`⚠️ Conexao com feed perdida. Reconectando em 5s...`);
            this.isConnected = false;
            this.isAuthorized = false;
            this.ws = null;
            setTimeout(() => {
                if (this.currentToken) this.connectWithToken(this.currentToken);
            }, 5000);
        });

        this.ws.on('error', (err: any) => {
            if (this.enginePingInterval) clearInterval(this.enginePingInterval);
            if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
                this.pongTimeout = null;
            }
            console.error('[DerivBotEngine] Erro no socket de feed:', err.message);
            try {
                if (this.ws && this.ws.readyState !== 3) {
                    this.ws.terminate();
                }
            } catch (e) {
                // Ignore terminate errors
            }
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
            // [CORRIGIDO] estava assinando ticks de 'R_100' (Indice de Volatilidade),
            // sem relacao com o ativo operado. Corrigido para o simbolo real do robo.
            if (this.ws?.readyState === 1) {
                this.ws?.send(JSON.stringify({
                    ticks: this.symbol,
                    subscribe: 1,
                    req_id: 9999
                }));
            }
        }, 1000);
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

    private analyzeMarket() {
        if (!this.isAuthorized) return;

        this.onLog?.(`🔍 Analisando mercado (M15) agora...`);

        if (this.candlesM15.length < 50) {
            this.onLog?.(`[Aguardando] Faltam velas no histórico para calcular tendência M15`);
            return;
        }

        const closedCandlesM15 = this.candlesM15.slice(0, -1);
        const closesM15 = closedCandlesM15.map(c => c.close);
        const ema8M15 = Indicators.ema(closesM15, 8)[closesM15.length - 1];
        const ema21M15 = Indicators.ema(closesM15, 21)[closesM15.length - 1];
        this.currentEma8 = ema8M15;
        this.currentEma21 = ema21M15;

        const lastClosedM15 = closedCandlesM15[closedCandlesM15.length - 1];
        
        // Usa o preço real da vela atual (aberta) para disparar entradas no exato momento
        const currentUnclosedCandle = this.candlesM15[this.candlesM15.length - 1];
        const currentPrice = currentUnclosedCandle.close;

        let trendM15: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
        if (ema8M15 > ema21M15) trendM15 = 'TREND_UP';
        else if (ema8M15 < ema21M15) trendM15 = 'TREND_DOWN';

        if (trendM15 !== this.lastTrend) {
            this.lastTrend = trendM15;
            if (this.onRegimeChange) this.onRegimeChange(trendM15);
        }

        const now = Date.now();
        const shouldLog = now - this.lastMonitorLogTime > 60000;
        
        // --- Filtro de Horário Operacional ---
        const d = new Date();
        const localTimeMs = d.getTime() + (this.UTC_OFFSET_HOURS * 3600000);
        const localDate = new Date(localTimeMs);
        const currentDay = localDate.getUTCDay(); // 0=Domingo, 1=Segunda ... 5=Sexta, 6=Sábado
        const currentHour = localDate.getUTCHours();
        
        const isTimeValid = (currentHour >= this.TRADING_START_HOUR || currentHour <= this.TRADING_END_HOUR) && (currentDay >= 1 && currentDay <= 5);
        
        // --- Filtro de Mercado Lateral (Boca de Jacaré) ---
        const emaDist = Math.abs(ema8M15 - ema21M15);
        const isLateral = emaDist < 0.50;

        if (shouldLog) { // Loga a cada 60s
            let statusLog = `M15: ${trendM15} | Preço: ${currentPrice.toFixed(2)} | EMA8: ${ema8M15.toFixed(2)} | EMA21: ${ema21M15.toFixed(2)}`;
            if (!isTimeValid) statusLog = `⏳ Fora do Horário (Atual: ${currentHour}h) | ` + statusLog;
            else if (isLateral) statusLog = `🚧 Mercado Lateral (Abertura: $${emaDist.toFixed(2)}) | ` + statusLog;
            
            this.onLog?.(`🧠 [Fybot Sniper API] ${statusLog}`);
            this.lastMonitorLogTime = now;
        }

        if (!isTimeValid || isLateral) {
            return;
        }

        // --- Lógica Fybot Sniper API: Pullback na EMA 8 ---
        const MAX_PROXIMITY_USD = 7.00; // Equivalente a InpEma8ProximityPoints = 700.0 no XAUUSD (Modo Meio-Termo)
        const distAbs = Math.abs(currentPrice - ema8M15);
        const isNearEma8 = distAbs <= MAX_PROXIMITY_USD;

        let signal: 'BUY' | 'SELL' | null = null;
        let reason = '';
        let engineTp = 0;
        let engineSl = 0;

        // SL Protetivo Inicial (0.15%). O TP é 0 (livre) para o Trailing Stop gerenciar.
        const percDistSL = currentPrice * 0.0015; // 0.15%

        if (trendM15 === 'TREND_UP' && isNearEma8 && currentPrice >= ema8M15) {
            signal = 'BUY';
            reason = `[Fybot Sniper API] Compra | Pullback na EMA 8 detectado. Distância: $${distAbs.toFixed(2)}`;
            engineTp = 0; // Alvo livre
            engineSl = currentPrice - percDistSL;
        }
        else if (trendM15 === 'TREND_DOWN' && isNearEma8 && currentPrice <= ema8M15) {
            signal = 'SELL';
            reason = `[Fybot Sniper API] Venda | Pullback na EMA 8 detectado. Distância: $${distAbs.toFixed(2)}`;
            engineTp = 0; // Alvo livre
            engineSl = currentPrice + percDistSL;
        }

        if (signal && this.onSignal && (now - this.lastSignalTime) >= 5000) {
            this.lastSignalTime = now;
            this.onSignal(signal, currentPrice, reason, engineTp, engineSl);
        }
    }
}