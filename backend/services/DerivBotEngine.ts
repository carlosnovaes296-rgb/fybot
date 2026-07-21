import { WebSocket as NodeWebSocket } from 'ws';
import { Indicators, Candle } from './Indicators.ts';

export class DerivBotEngine {
    private ws: NodeWebSocket | null = null;
    private appId = '1089'; // Usamos o App ID oficial da Deriv para suportar tokens pat_
    // Usando Índice Sintético 100 (1s) para funcionar 24/7
    private symbol = '1HZ100V';
    private isConnected = false;
    public riskProfile: string = 'CONSERVATIVE';
    
    // Armazenamento de Histórico OHLC
    private candlesM15: Candle[] = [];
    private candlesH1: Candle[] = [];
    
    // Cooldown para evitar spam de ordens
    private lastSignalTime: number = 0;
    
    // Callbacks to notify server.ts
    public onSignal?: (direction: 'BUY' | 'SELL', price: number, reason: string, tp: number, sl: number) => void;
    public onRegimeChange?: (regime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL') => void;
    private lastRegime: 'TREND_UP' | 'TREND_DOWN' | 'LATERAL' = 'LATERAL';

    constructor() {
        this.connect();
    }

    private connect() {
        if (this.isConnected) return;
        
        this.ws = new NodeWebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=PT`);

        this.ws.on('open', () => {
            console.log(`[DerivBotEngine] Feed conectado. Solicitando histórico M15 e H1 para ${this.symbol}...`);
            this.isConnected = true;
            
            // Subscreve M15 (900s)
            this.ws?.send(JSON.stringify({
                ticks_history: this.symbol,
                end: 'latest',
                count: 100, // Precisamos de pelo menos 55 para EMA e S/R
                style: 'candles',
                granularity: 900,
                subscribe: 1,
                req_id: 900 // ID customizado para identificar o retorno
            }));

            // Subscreve H1 (3600s)
            this.ws?.send(JSON.stringify({
                ticks_history: this.symbol,
                end: 'latest',
                count: 100,
                style: 'candles',
                granularity: 3600,
                subscribe: 1,
                req_id: 3600
            }));
        });

        this.ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);
                if (response.error) {
                    console.error('[DerivBotEngine] Erro da Deriv:', response.error);
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
                    } else if (response.req_id === 3600) {
                        this.candlesH1 = candles;
                        console.log(`[DerivBotEngine] Carregado histórico H1: ${this.candlesH1.length} velas`);
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
            this.isConnected = false;
            setTimeout(() => this.connect(), 5000);
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
            console.log(`[DerivBotEngine] Aguardando dados... M15: ${this.candlesM15.length}/50 | H1: ${this.candlesH1.length}/50`);
            return;
        }

        // --- BLOQUEIO DE FIM DE SEMANA REMOVIDO PARA SINTÉTICOS (Rodam 24/7) ---
        // const nowUtc = new Date();
        // const day = nowUtc.getUTCDay(); // 0 = Domingo, 5 = Sexta, 6 = Sábado
        // const hour = nowUtc.getUTCHours();
        
        // let isBlockedTime = false;
        // if (day === 5 && hour >= 15) isBlockedTime = true; // Sexta depois das 15h
        // if (day === 6) isBlockedTime = true;               // Sábado inteiro
        // if (day === 0 && hour < 21) isBlockedTime = true;  // Domingo antes das 21h

        // if (isBlockedTime) {
        //     if (nowUtc.getSeconds() % 60 === 0) {
        //         console.log(`[DerivBotEngine] 🛡️ Operações bloqueadas pelo horário do fim de semana (Sexta 15h - Domingo 21h).`);
        //     }
        //     return;
        // }

        // --- PREPARAÇÃO DE DADOS ---
        if (this.candlesM15.length < 50 || this.candlesH1.length < 50) return; // Aguarda carregar histórico
        
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

        // Log de Monitoramento a cada 30 segundos para debugging
        const agora = new Date();
        if (agora.getSeconds() % 30 === 0) {
            console.log(`[SCANNING] Regime: ${regime} | ADX: ${currentAdx.toFixed(1)} | RSI: ${currentRsi.toFixed(1)} | Preço: ${currentPrice.toFixed(4)} | EMA: ${currentEma.toFixed(4)} | S/R: [${nearestSup.toFixed(4)} - ${nearestRes.toFixed(4)}]`);
        }

        // Ajusta o score mínimo baseado no Perfil de Risco (CONSERVATIVE=50, MEDIUM=45, AGGRESSIVE=40)
        let requiredScore = 50;
        if (this.riskProfile === 'MEDIUM') requiredScore = 45;
        if (this.riskProfile === 'AGGRESSIVE') requiredScore = 40;

        // Condições de Compra
        if (regime === 'TREND_UP') {
            const isNearResistance = (nearestRes - currentPrice) <= (currentAtrM15 * 0.5);
            if (currentRsi < 55 && !isNearResistance) { // Pullback realista em tendência de alta
                score += 20;
                if (currentAdx > 25) score += 20;
                if (currentPrice > currentEma) score += 15;
                if (score >= requiredScore) signal = 'BUY'; 
            } else if (isNearResistance) {
                console.log(`[BLOQUEIO S/R] Compra em TREND_UP bloqueada: preço muito próximo da resistência (${nearestRes.toFixed(4)})`);
            }
        } else if (regime === 'LATERAL' && currentPrice <= nearestSup + (currentAtrM15 * 0.5)) {
            if (currentRsi < 35) {
                score += 15;
                if (score >= requiredScore) signal = 'BUY'; // Perto do suporte em lateral
            }
        }

        // Condições de Venda
        if (regime === 'TREND_DOWN') {
            const isNearSupport = (currentPrice - nearestSup) <= (currentAtrM15 * 0.5);
            if (currentRsi > 45 && !isNearSupport) { // Pullback realista em tendência de baixa
                score += 20;
                if (currentAdx > 25) score += 20;
                if (currentPrice < currentEma) score += 15;
                if (score >= requiredScore) signal = 'SELL'; 
            } else if (isNearSupport) {
                console.log(`[BLOQUEIO S/R] Venda em TREND_DOWN bloqueada: preço muito próximo do suporte (${nearestSup.toFixed(4)})`);
            }
        } else if (regime === 'LATERAL' && currentPrice >= nearestRes - (currentAtrM15 * 0.5)) {
            if (currentRsi > 65) {
                score += 15;
                if (score >= requiredScore) signal = 'SELL'; // Perto da resistência em lateral
            }
        }
        
        console.log(`[ANÁLISE] Regime: ${regime} | Score: ${score} | Signal: ${signal || 'NENHUM'} | RSI: ${currentRsi.toFixed(1)} | ADX: ${currentAdx.toFixed(1)}`);


        if (signal && this.onSignal) {
            // Cooldown de 60 segundos para teste (produção: 300000 = 5min)
            const now = Date.now();
            const cooldownMs = 60000; // 60 segundos para testes
            if (now - this.lastSignalTime < cooldownMs) {
                const remaining = Math.ceil((cooldownMs - (now - this.lastSignalTime)) / 1000);
                console.log(`[DerivBotEngine] Cooldown ativo. Próximo sinal em ${remaining}s.`);
                return;
            }
            this.lastSignalTime = now;
            console.log(`[DerivBotEngine] ⚡ SINAL GERADO: ${signal} | Score: ${score} | Notificando servidor...`);

            // SL = 1.5x ATR H1 convertidos grosseiramente para financeiro, ou base $2
            const baseStake = 10;
            const volatilityMultiplier = (currentAtrH1 / currentPrice) * 1000; // Normaliza a volatilidade
            const sl = Math.max(2, parseFloat((2 * volatilityMultiplier).toFixed(2)));
            const tp = Math.max(5, parseFloat((5 * volatilityMultiplier).toFixed(2)));
            
            const reason = `[Regime: ${regime}] Score: ${score.toFixed(0)} | ADX: ${currentAdx.toFixed(1)} | S/R: [${nearestSup.toFixed(2)} - ${nearestRes.toFixed(2)}]`;
            this.onSignal(signal, currentPrice, reason, tp, sl);
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
