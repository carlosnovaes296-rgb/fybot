import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators, Candle } from './Indicators.ts';

export class DerivBotEngine {
    private ws: NodeWebSocket | null = null;
    private appId = '1089'; // Usamos o App ID oficial da Deriv para suportar tokens pat_
    // Usando Ouro (XAUUSD)
    private symbol = 'frxXAUUSD';
    private isConnected = false;
    public riskProfile: string = 'CONSERVATIVE';
    private currentToken: string = '';
    
    // Armazenamento de Histórico OHLC
    private candlesM15: Candle[] = [];
    private candlesH1: Candle[] = [];
    
    // Cooldown para evitar spam de ordens
    private lastSignalTime: number = 0;
    
    // Callbacks to notify server.ts
    public onSignal?: (direction: 'BUY' | 'SELL', price: number, reason: string, tp: number, sl: number) => void;
    public onRegimeChange?: (regime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL') => void;
    public onLog?: (msg: string) => void;
    private lastRegime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';

    constructor() {
        // Agora aguardamos o server.ts chamar connectWithToken(token) passando um PAT token válido.
    }

    public async connectWithToken(token: string) {
        if (this.isConnected) return;
        this.currentToken = token;
        
        console.log(`[DerivBotEngine] Autenticando Motor via API v1 OTP usando token: ${token.substring(0,8)}...`);
        if (this.onLog) this.onLog(`📡 Autenticando Motor de Análise na Deriv...`);
        let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=PT`;
        try {
             // Buscar accounts para descobrir account_id e gerar OTP direto na Deriv
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
                 // Pega a conta DEMO para operar os testes (Prioriza VRT)
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
                     console.log("[DerivBotEngine] Magic URL OTP obtida DIRETAMENTE da Deriv com sucesso!");
                     if (this.onLog) this.onLog(`✅ Conexão Blindada (OTP) estabelecida para leitura de Velas!`);
                 }
             } else {
                 console.log("[DerivBotEngine] Conta DEMO não encontrada, falha ao gerar OTP.");
                 if (this.onLog) this.onLog(`⚠️ Falha ao criar conexão blindada: Conta virtual não encontrada.`);
             }
        } catch(e) {
             console.error("[DerivBotEngine] Falha ao obter OTP para o motor", e);
             if (this.onLog) this.onLog(`⚠️ Erro de rede ao conectar o motor.`);
        }

        this.ws = new NodeWebSocket(wsUrl, {
            headers: { 
              'Origin': 'https://fybot.life',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        this.ws.on('open', () => {
            console.log(`[DerivBotEngine] Feed conectado e autenticado. Solicitando histórico M15 e H1 para ${this.symbol}...`);
            if (this.onLog) this.onLog(`📊 Conectado ao feed da Deriv. Baixando histórico M15 e H1 do ${this.symbol}...`);
            this.isConnected = true;
            
            // Subscreve M1 (60s) para sinais ultra-rápidos
            this.ws?.send(JSON.stringify({
                ticks_history: this.symbol,
                end: 'latest',
                count: 100, // Precisamos de pelo menos 55 para EMA e S/R
                style: 'candles',
                granularity: 60,
                subscribe: 1,
                req_id: 900 // ID mantido igual por simplicidade interna
            }));

            // Subscreve M5 (300s) para tendência
            this.ws?.send(JSON.stringify({
                ticks_history: this.symbol,
                end: 'latest',
                count: 100,
                style: 'candles',
                granularity: 300,
                subscribe: 1,
                req_id: 3600
            }));
        });

        this.ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);
                if (response.error) {
                    console.error('[DerivBotEngine] Erro da Deriv:', response.error);
                    if (this.onLog) this.onLog(`⛔ Erro da Deriv na leitura de velas: ${response.error.message}`);
                    return;
                }

                // Initial History
                if (response.msg_type === 'candles') {
                    const candles = response.candles.map((c: any) => ({
                        epoch: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close
                    }));
                    if (response.req_id === 900) {
                        this.candlesM15 = candles;
                        console.log(`[DerivBotEngine] Carregado histórico M15: ${this.candlesM15.length} velas`);
                        if (this.onLog) this.onLog(`📈 Histórico rápido carregado (${this.candlesM15.length} velas)`);
                    } else if (response.req_id === 3600) {
                        this.candlesH1 = candles;
                        console.log(`[DerivBotEngine] Carregado histórico H1: ${this.candlesH1.length} velas`);
                        if (this.onLog) this.onLog(`📈 Histórico de tendência carregado (${this.candlesH1.length} velas)`);
                    }
                }

                // Streaming Updates (OHLC)
                if (response.msg_type === 'ohlc') {
                    const ohlc = response.ohlc;
                    const candle: Candle = {
                        epoch: ohlc.open_time,
                        open: Number(ohlc.open),
                        high: Number(ohlc.high),
                        low: Number(ohlc.low),
                        close: Number(ohlc.close)
                    };

                    if (ohlc.granularity === 900) {
                        this.updateCandleSeries(this.candlesM15, candle);
                    } else if (ohlc.granularity === 3600) {
                        this.updateCandleSeries(this.candlesH1, candle);
                    }

                    // A cada tick que atualiza a vela, rodamos a lógica
                    this.analyzeMarket();
                }
            } catch (err) {
                console.error('[DerivBotEngine] Erro ao parsear mensagem:', err);
            }
        });

        this.ws.on('close', () => {
            console.log('[DerivBotEngine] Conexão com feed fechada. Tentando reconectar em 5s...');
            if (this.onLog) this.onLog(`⚠️ Conexão com feed perdida. Reconectando em 5s...`);
            this.isConnected = false;
            setTimeout(() => {
                 if (this.currentToken) this.connectWithToken(this.currentToken);
            }, 5000);
        });

        this.ws.on('error', (err) => {
            console.error('[DerivBotEngine] Erro no socket de feed:', err);
            this.ws?.close();
        });
    }

    private updateCandleSeries(series: Candle[], newCandle: Candle) {
        if (series.length === 0) {
            series.push(newCandle);
            return;
        }
        
        const lastCandle = series[series.length - 1];
        if (newCandle.epoch === lastCandle.epoch) {
            // Atualiza vela atual
            series[series.length - 1] = newCandle;
        } else if (newCandle.epoch > lastCandle.epoch) {
            // Nova vela abriu
            series.push(newCandle);
            if (series.length > 200) series.shift(); // Manter no max 200 velas na memória
        }
    }

    private analyzeMarket() {
        if (this.candlesM15.length < 50 || this.candlesH1.length < 50) {
            // console.log(`[DerivBotEngine] Aguardando dados... M15: ${this.candlesM15.length}/50 | H1: ${this.candlesH1.length}/50`);
            return;
        }

        // --- PREPARAÇÃO DE DADOS ---
        
        const currentPrice = this.candlesM15[this.candlesM15.length - 1].close;
        const pricesH1 = this.candlesH1.map(c => c.close);
        const pricesM15 = this.candlesM15.map(c => c.close);

        // --- INDICADORES H1 ---
        const atrH1 = Indicators.atr(this.candlesH1, 14);
        const adxH1 = Indicators.adx(this.candlesH1, 14);
        
        // --- INDICADORES M15 ---
        const atrM15 = Indicators.atr(this.candlesM15, 14);
        const rsiM15 = Indicators.rsi(pricesM15, 14);

        const currentAtrH1 = atrH1[atrH1.length - 1];
        const currentAtrM15 = atrM15[atrM15.length - 1];
        const currentAdx = adxH1.adx[adxH1.adx.length - 1];
        const currentPdi = adxH1.pdi[adxH1.pdi.length - 1];
        const currentNdi = adxH1.ndi[adxH1.ndi.length - 1];
        const currentRsi = rsiM15[rsiM15.length - 1];

        // --- SMART EMA (Depende do Ratio ATR) ---
        const smartEmaPeriod = this.getSmartEmaPeriod(currentAtrM15, currentAtrH1);
        const emaH1 = Indicators.ema(pricesH1, smartEmaPeriod);
        const currentEma = emaH1[emaH1.length - 1];

        // --- REGIME DE MERCADO ---
        let regime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';
        if (currentAdx > 25) { // ADX > 25 indica Tendência Forte
            if (currentPrice > currentEma && currentPdi > currentNdi) {
                regime = 'TREND_UP';
            } else if (currentPrice < currentEma && currentNdi > currentPdi) {
                regime = 'TREND_DOWN';
            }
        }

        if (regime !== this.lastRegime) {
            this.lastRegime = regime;
            if (this.onRegimeChange) {
                this.onRegimeChange(regime);
            }
        }

        // --- SUPORTE E RESISTÊNCIA (PIVOTS M15) ---
        const pivots = this.getPivots(this.candlesM15, 30);
        const nearestRes = pivots.highs.find(h => h > currentPrice) || currentPrice + (currentAtrM15 * 2);
        const nearestSup = pivots.lows.slice().reverse().find(l => l < currentPrice) || currentPrice - (currentAtrM15 * 2);

        // --- PULLBACK OU CONTINUAÇÃO ---
        let signal: 'BUY' | 'SELL' | null = null;
        let score = 40; // Base score

        // Log de Monitoramento a cada 30 segundos para debugging na UI
        const agora = new Date();
        if (agora.getSeconds() % 15 === 0) { // A cada 15 segundos ele manda log pra UI
            if (this.onLog) {
                this.onLog(`🧠 Lendo Mercado... Regime: ${regime} | RSI: ${currentRsi.toFixed(1)} | Preço: ${currentPrice.toFixed(2)} | Score: ${score}`);
            }
        }
        
        let requiredScore = 30;
        if (this.riskProfile === 'AGGRESSIVE') requiredScore = 20;

        // --- Condições de Mercado (RSI + EMA + PIVOTS) ---
        // Condições de Compra
        if (regime === 'TREND_UP' || regime === 'LATERAL') {
            const isNearResistance = (nearestRes - currentPrice) <= (currentAtrM15 * 0.5);
            // Verifica RSI com uma tolerância maior, ou entra se a tendência for muito forte (ADX > 30)
            if (currentRsi < 65 || (currentRsi < 75 && currentAdx > 30)) { 
                // Se a tendência for muito forte, ignora a resistência
                if (!isNearResistance || currentAdx > 30) {
                    score += 20;
                    if (currentAdx > 20) score += 20;
                    if (currentPrice > currentEma) score += 15;
                    if (score >= requiredScore) signal = 'BUY'; 
                }
            }
        } 

        // Condições de Venda
        if (regime === 'TREND_DOWN' || regime === 'LATERAL') {
            const isNearSupport = (currentPrice - nearestSup) <= (currentAtrM15 * 0.5);
            if (currentRsi > 35 || (currentRsi > 25 && currentAdx > 30)) {
                // Se a tendência for muito forte, ignora o suporte
                if (!isNearSupport || currentAdx > 30) {
                    score += 20;
                    if (currentAdx > 20) score += 20;
                    if (currentPrice < currentEma) score += 15;
                    if (score >= requiredScore) signal = 'SELL'; 
                }
            } 
        }
        
        console.log(`[ANÁLISE] Regime: ${regime} | Score: ${score} | Signal: ${signal || 'NENHUM'} | RSI: ${currentRsi.toFixed(1)} | ADX: ${currentAdx.toFixed(1)}`);


        if (signal && this.onSignal) {
            // Cooldown RESTAURADO para podermos ler o erro da Deriv
            const now = Date.now();
            if (now - this.lastSignalTime < 30000) {
                 return;
            }
            this.lastSignalTime = now;
            
            this.onLog?.(`🚀 ENVIANDO ORDEM PARA A CORRETORA: ${signal}!`);
            
            // SL e TP para Ouro (XAUUSD) baseado em porcentagem
            const tpPercent = 0.0002; // 0.02%
            const slPercent = 0.0050; // 0.50%
            let tpPrice = 0;
            let slPrice = 0;
            if (signal === 'BUY') {
                tpPrice = parseFloat((currentPrice * (1 + tpPercent)).toFixed(2));
                slPrice = parseFloat((currentPrice * (1 - slPercent)).toFixed(2));
            } else {
                tpPrice = parseFloat((currentPrice * (1 - tpPercent)).toFixed(2));
                slPrice = parseFloat((currentPrice * (1 + slPercent)).toFixed(2));
            }
            
            const reason = `[Regime: ${regime}] Score: ${score.toFixed(0)} | ADX: ${currentAdx.toFixed(1)} | S/R: [${nearestSup.toFixed(2)} - ${nearestRes.toFixed(2)}]`;
            this.onSignal(signal, currentPrice, reason, tpPrice, slPrice);
        }
    }

    private getSmartEmaPeriod(atrM15: number, atrH1: number): number {
        const ratio = atrM15 / (atrH1 === 0 ? 1 : atrH1);
        if (ratio < 0.2) return 55; // Volatilidade baixa, EMA longa
        if (ratio > 0.5) return 16; // Volatilidade alta, EMA rápida
        return 34; // Padrão
    }

    private getPivots(candles: Candle[], lookback: number): { highs: number[], lows: number[] } {
        const highs: number[] = [];
        const lows: number[] = [];
        const start = Math.max(0, candles.length - lookback);

        for (let i = start + 2; i < candles.length - 2; i++) {
            const currentHigh = candles[i].high;
            const currentLow = candles[i].low;

            // Pivot High (Fractal Superior)
            if (currentHigh > candles[i-1].high && currentHigh > candles[i-2].high &&
                currentHigh > candles[i+1].high && currentHigh > candles[i+2].high) {
                highs.push(currentHigh);
            }

            // Pivot Low (Fractal Inferior)
            if (currentLow < candles[i-1].low && currentLow < candles[i-2].low &&
                currentLow < candles[i+1].low && currentLow < candles[i+2].low) {
                lows.push(currentLow);
            }
        }
        return { 
            highs: highs.sort((a, b) => a - b), 
            lows: lows.sort((a, b) => a - b) 
        };
    }
}
