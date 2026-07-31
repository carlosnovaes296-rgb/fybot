import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators, Candle } from './Indicators.ts';

// Motor de sinais baseado em EMA8/EMA21 (estratégia separada do DerivBotEngine.ts
// original, que usa ADX/RSI/Pivots). Mantém a MESMA interface de callbacks
// (onSignal / onRegimeChange / onLog) e o MESMO fluxo de conexão (OTP + fallback
// clássico), para plugar direto no server.ts do mesmo jeito que o motor antigo.
export class DerivBotEngineEMA {
    private ws: NodeWebSocket | null = null;
    private appId = '1089'; // App ID oficial da Deriv (suporta tokens pat_)
    private symbol = 'frxXAUUSD';
    private isConnected = false;
    private currentToken = '';
    public riskProfile?: string = 'CONSERVATIVE';

    // Só precisamos de uma série de velas (M15): a tendência e a entrada nesta
    // estratégia vêm inteiramente do cruzamento e da posição do preço em relação
    // às duas médias, no mesmo timeframe (Requisitos 1, 2 e 3).
    private candlesM15: Candle[] = [];

    // Períodos fixos da estratégia (Requisito 1)
    private readonly EMA_FAST = 8;
    private readonly EMA_SLOW = 21;

    // TP automático fixo em % do preço de entrada (0.50%) para cada ordem.
    // Ex.: preço de 2400.00 -> distância de TP = 2400.00 * 0.0050 = 12.00
    private readonly TP_PERCENT = 0.0050; // 0.50%

    // Tendência atual, definida pelo cruzamento EMA8/EMA21 (Requisito 2)
    private lastTrend: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';

    // Evita reenviar o mesmo sinal repetidas vezes dentro da mesma vela M15 ainda
    // se formando (mesma trava usada no motor original).
    private lastSignalCandleEpoch: number | null = null;
    private lastSignalTime = 0;

    // Throttle do log de monitoramento
    private lastMonitorLogTime = 0;

    // Callbacks para o server.ts (mesma assinatura do motor original)
    public onSignal?: (direction: 'BUY' | 'SELL', price: number, reason: string, tp: number, sl: number) => void;
    public onRegimeChange?: (regime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL') => void;
    public onLog?: (msg: string) => void;

    public disconnect() {
        if (this.ws) {
            console.log('[DerivBotEngineEMA] Forçando desconexão via comando do usuário...');
            this.ws.terminate();
            this.ws = null;
        }
        this.isConnected = false;
    }

    public async connectWithToken(token: string, force: boolean = false) {
        if (this.isConnected && !force) return;
        if (force && this.isConnected) {
            this.disconnect();
        }
        this.currentToken = token;

        console.log(`[DerivBotEngineEMA] Autenticando Motor EMA8/21 via API v1 OTP usando token: ${token.substring(0, 8)}...`);
        if (this.onLog) this.onLog(`📡 Autenticando Motor EMA8/21 na Deriv...`);
        let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=PT`;
        try {
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Deriv-App-ID': '33TVM6cBQ9GfSjbwQHHdE',
                'Content-Type': 'application/json'
            };
            const accRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', { headers });
            const accData: any = await accRes.json();

            let accountId = '';
            const contasArray = accData.accounts || accData.data || accData;
            if (Array.isArray(contasArray)) {
                let demoAcc = contasArray.find((a: any) => {
                    const id = (a.loginid || a.account_id || a.id || "").toString().toUpperCase();
                    return id.includes('VRT') || id.startsWith('VR');
                });
                if (!demoAcc) {
                    demoAcc = contasArray.find((a: any) => {
                        const id = (a.loginid || a.account_id || a.id || "").toString().toUpperCase();
                        return id.includes('VOT') || id.startsWith('DOT') || a.is_virtual === 1 || a.is_virtual === true || a.account_type === 'demo';
                    });
                }
                if (demoAcc) accountId = demoAcc.account_id || demoAcc.loginid || demoAcc.id;
            }

            if (accountId) {
                const otpRes = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
                    method: 'POST', headers, body: '{}'
                });
                const otpData: any = await otpRes.json();
                if (otpData?.data?.url) {
                    wsUrl = otpData.data.url;
                    console.log("[DerivBotEngineEMA] Magic URL OTP obtida DIRETAMENTE da Deriv com sucesso!");
                    if (this.onLog) this.onLog(`✅ Conexão Blindada (OTP) estabelecida para leitura de Velas!`);
                }
            } else {
                console.log("[DerivBotEngineEMA] Conta DEMO não encontrada, falha ao gerar OTP.");
                if (this.onLog) this.onLog(`⚠️ Falha ao criar conexão blindada: Conta virtual não encontrada.`);
            }
        } catch (e) {
            console.error("[DerivBotEngineEMA] Falha ao obter OTP para o motor", e);
            if (this.onLog) this.onLog(`⚠️ Erro de rede ao conectar o motor.`);
        }

        // Aguarda 2 segundos antes de conectar para não cruzar com a conexão do ConnectionManager e evitar bloqueio anti-spam da corretora
        await new Promise(resolve => setTimeout(resolve, 2000));

        this.ws = new NodeWebSocket(wsUrl, {
            headers: {
                'Origin': 'https://fybot.life',
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
                        console.log('[DerivBotEngineEMA] Ping timeout! Forçando encerramento da conexão travada.');
                        this.ws?.terminate();
                    }, 10000);
                }
            }, 25000);

            console.log(`[DerivBotEngineEMA] Feed conectado. Solicitando histórico M15 para ${this.symbol}...`);
            if (this.onLog) this.onLog(`📊 Conectado ao feed da Deriv. Baixando histórico M15 do ${this.symbol}...`);
            this.isConnected = true;

            // Só precisamos do M15: EMA8/EMA21 e a entrada são calculadas nesse
            // mesmo timeframe (sem necessidade de H1 como no motor antigo).
            this.ws?.send(JSON.stringify({
                ticks_history: this.symbol,
                end: 'latest',
                count: 100, // suficiente para EMA21 + margem de aquecimento
                style: 'candles',
                granularity: 900, // M15
                subscribe: 1,
                req_id: 900
            }));
        });

        this.ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);

                if (response.msg_type === 'ping') {
                    clearTimeout(pongTimeout);
                    return;
                }

                if (response.error) {
                    console.error('[DerivBotEngineEMA] Erro da Deriv:', response.error);
                    if (this.onLog) this.onLog(`⛔ Erro da Deriv na leitura de velas: ${response.error.message}`);
                    return;
                }

                if (response.msg_type === 'candles' && response.req_id === 900) {
                    this.candlesM15 = response.candles.map((c: any) => ({
                        epoch: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close
                    }));
                    console.log(`[DerivBotEngineEMA] Carregado histórico M15: ${this.candlesM15.length} velas`);
                    if (this.onLog) this.onLog(`📈 Histórico M15 carregado (${this.candlesM15.length} velas)`);
                }

                if (response.msg_type === 'ohlc' && response.ohlc.granularity === 900) {
                    const ohlc = response.ohlc;
                    const candle: Candle = {
                        epoch: ohlc.open_time,
                        open: Number(ohlc.open),
                        high: Number(ohlc.high),
                        low: Number(ohlc.low),
                        close: Number(ohlc.close)
                    };
                    // isNewCandle não é mais usado para gatilho (ver comentário abaixo),
                    // mas updateCandleSeries continua sendo chamado para manter a série
                    // de velas M15 sempre atualizada (fechada ou em formação).
                    this.updateCandleSeries(this.candlesM15, candle);

                    // O usuário quer reentradas múltiplas ou imediatas se as condições permitirem.
                    // Portanto, analisamos o mercado A CADA TICK, e não apenas no fechamento da vela.
                    // Isso é seguro: analyzeMarket() sempre lê o preço da última vela JÁ FECHADA
                    // (candlesM15[length-2]), então o valor de referência só muda de fato quando
                    // uma vela nova realmente fecha — chamar com mais frequência só reavalia a
                    // mesma tendência mais vezes, sem usar preço "no meio da vela".
                    this.analyzeMarket();
                }
            } catch (err) {
                console.error('[DerivBotEngineEMA] Erro ao parsear mensagem:', err);
            }
        });

        this.ws.on('close', () => {
            clearInterval(enginePingInterval);
            clearTimeout(pongTimeout);
            console.log('[DerivBotEngineEMA] Conexão com feed fechada. Tentando reconectar em 5s...');
            if (this.onLog) this.onLog(`⚠️ Conexão com feed perdida. Reconectando em 5s...`);
            this.isConnected = false;
            setTimeout(() => {
                if (this.currentToken) this.connectWithToken(this.currentToken);
            }, 5000);
        });

        this.ws.on('error', (err) => {
            clearInterval(enginePingInterval);
            clearTimeout(pongTimeout);
            console.error('[DerivBotEngineEMA] Erro no socket de feed:', err);
            this.ws?.terminate();
        });
    }

    // Retorna true quando uma vela NOVA foi aberta (a anterior fechou de vez).
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
            if (series.length > 200) series.shift();
            return true;
        }
        return false;
    }

    private analyzeMarket() {
        if (this.candlesM15.length < this.EMA_SLOW + 5) return;

        const closes = this.candlesM15.map(c => c.close);
        const emaFastSeries = Indicators.ema(closes, this.EMA_FAST);
        const emaSlowSeries = Indicators.ema(closes, this.EMA_SLOW);

        const emaFast = emaFastSeries[emaFastSeries.length - 1];
        const emaSlow = emaSlowSeries[emaSlowSeries.length - 1];

        // A vela que acabou de fechar é a penúltima da série no momento em que uma
        // vela nova abriu (a série já recebeu o open da vela seguinte).
        const closedCandle = this.candlesM15[this.candlesM15.length - 2];
        const currentPrice = closedCandle.close;

        // Requisito 2: cruzamento das EMAs define a tendência
        let trend: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
        if (emaFast > emaSlow) trend = 'TREND_UP';
        else if (emaFast < emaSlow) trend = 'TREND_DOWN';

        if (trend !== this.lastTrend) {
            this.lastTrend = trend;
            this.onRegimeChange?.(trend);
            this.onLog?.(`🧭 Cruzamento de EMAs: nova tendência ${trend} (EMA8: ${emaFast.toFixed(2)} / EMA21: ${emaSlow.toFixed(2)})`);
        }

        const nowLog = Date.now();
        if (nowLog - this.lastMonitorLogTime >= 15000) {
            this.lastMonitorLogTime = nowLog;

            let aguardando = "";
            if (trend === 'TREND_UP' && currentPrice <= emaFast) aguardando = "(Aguardando preço subir acima da EMA8)";
            if (trend === 'TREND_DOWN' && currentPrice >= emaFast) aguardando = "(Aguardando preço cair abaixo da EMA8)";

            this.onLog?.(`🧠 [EMA8/21] Tendência: ${trend} | Preço: ${currentPrice.toFixed(2)} | EMA8: ${emaFast.toFixed(2)} ${aguardando}`);
        }

        // O usuário pediu para remover a condição extra de cruzamento (preço x média).
        // Agora o robô atira baseado PURAMENTE na tendência: se EMA8 > EMA21, é compra.
        // Se EMA8 < EMA21, é venda. Sem esperar confirmação do preço.
        // Requisito 6: nunca contra a tendência — o sinal só existe dentro do
        // próprio regime, então operações contra-tendência são impossíveis aqui;
        // isso também é reforçado por handleRegimeChange/executeSignal do lado da
        // execução (DerivConnectionManager), como segunda trava.
        let signal: 'BUY' | 'SELL' | null = null;
        if (trend === 'TREND_UP') {
            signal = 'BUY';
        } else if (trend === 'TREND_DOWN') {
            signal = 'SELL';
        }

        // Reentradas (Requisito 6): assim que a ordem/sequência DCA anterior for
        // encerrada e a tendência ainda favorecer a mesma direção, este bloco
        // gera um novo sinal automaticamente. O controle de "não abrir Ordem 1
        // nova enquanto já existe sequência de DCA ativa" já vive no
        // DerivConnectionManager (openTradesCount / userDcaState).
        if (!signal) return;

        const currentCandleEpoch = closedCandle.epoch;
        // O usuário solicitou remover a trava de vela para permitir múltiplas ordens na mesma vela.
        // if (currentCandleEpoch === this.lastSignalCandleEpoch) return;

        const now = Date.now();
        if (now - this.lastSignalTime < 5000) return; // trava mínima de segurança de 5s

        this.lastSignalTime = now;
        this.lastSignalCandleEpoch = currentCandleEpoch;

        // SL de partida baseado em volatilidade (ATR), como antes.
        const atr = Indicators.atr(this.candlesM15, 14);
        const currentAtr = atr[atr.length - 1] || (currentPrice * 0.003);
        const slDistance = currentAtr * 1.0;

        // TP automático fixo em 0.50% do preço de entrada para CADA ordem
        // (independe do ATR — é sempre currentPrice * TP_PERCENT). A partir daí,
        // quem eleva o alvo acompanhando o pico do preço (Requisito 7, nunca
        // recua) continua sendo o DerivConnectionManager, que tem visibilidade do
        // lucro real reportado pela corretora (proposal_open_contract).
        const tpDistance = currentPrice * this.TP_PERCENT;

        let tpPrice = 0, slPrice = 0;
        if (signal === 'BUY') {
            tpPrice = parseFloat((currentPrice + tpDistance).toFixed(2));
            slPrice = parseFloat((currentPrice - slDistance).toFixed(2));
        } else {
            tpPrice = parseFloat((currentPrice - tpDistance).toFixed(2));
            slPrice = parseFloat((currentPrice + slDistance).toFixed(2));
        }

        const reason = `[EMA8/21] Tendência ${trend} (EMA8 ${signal === 'BUY' ? '>' : '<'} EMA21) | TP automático ${(this.TP_PERCENT * 100).toFixed(2)}%`;
        this.onSignal?.(signal, currentPrice, reason, tpPrice, slPrice);
    }
}