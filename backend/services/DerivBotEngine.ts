import { WebSocket as NodeWebSocket } from 'ws';

interface Tick {
    epoch: number;
    quote: number;
}

export class DerivBotEngine {
    private ws: NodeWebSocket | null = null;
    private ticks: Tick[] = [];
    private appId = '33PVKdgTEIn9JlNjX0izq';
    private symbol = 'frxXAUUSD';
    private isConnected = false;
    
    // Callbacks to notify server.ts
    public onSignal?: (direction: 'BUY' | 'SELL', price: number, reason: string) => void;

    constructor() {
        this.connect();
    }

    private connect() {
        if (this.isConnected) return;
        
        this.ws = new NodeWebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=PT`);

        this.ws.on('open', () => {
            console.log('[DerivBotEngine] Feed conectado. Solicitando ticks de XAUUSD...');
            this.isConnected = true;
            this.ws?.send(JSON.stringify({
                ticks: this.symbol,
                subscribe: 1
            }));
        });

        this.ws.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);
                if (response.error) {
                    console.error('[DerivBotEngine] Erro da Deriv:', response.error);
                    return;
                }

                if (response.msg_type === 'tick') {
                    const tick = response.tick;
                    this.processTick({ epoch: tick.epoch, quote: tick.quote });
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

    private processTick(tick: Tick) {
        this.ticks.push(tick);
        if (this.ticks.length > 500) {
            this.ticks.shift(); // Manter apenas últimos 500 ticks
        }
        
        if (this.ticks.length < 50) return; // Aguardar histórico

        this.analyzeMarket();
    }

    private analyzeMarket() {
        // Obter array de preços
        const prices = this.ticks.map(t => t.quote);
        const currentPrice = prices[prices.length - 1];
        
        // 1. Calcular Média Móvel Rápida (EMA 9) e Lenta (EMA 21)
        const ema9 = this.calculateEMA(prices, 9);
        const ema21 = this.calculateEMA(prices, 21);

        // 2. Calcular RSI (14)
        const rsi14 = this.calculateRSI(prices, 14);

        // 3. SMC Simples (Romper topos/fundos locais)
        // Definimos o topo dos últimos 30 ticks
        const recentPrices = prices.slice(-30, -1);
        const localHigh = Math.max(...recentPrices);
        const localLow = Math.min(...recentPrices);

        let signal: 'BUY' | 'SELL' | null = null;
        let reason = '';

        // CONDIÇÃO DE COMPRA:
        // - EMA 9 > EMA 21 (Tendência de Alta)
        // - RSI < 45 (Oversold na subida ou pullback)
        // - Preço atual rompe o topo local (CHoCH / BOS)
        if (ema9 > ema21 && rsi14 < 45 && currentPrice > localHigh) {
            signal = 'BUY';
            reason = `SMC Rompimento Topo Local ($${localHigh.toFixed(2)}) + EMA9>21 + RSI(${rsi14.toFixed(1)})`;
        }

        // CONDIÇÃO DE VENDA:
        // - EMA 9 < EMA 21 (Tendência de Baixa)
        // - RSI > 55 (Overbought na descida ou pullback)
        // - Preço atual rompe o fundo local (CHoCH / BOS)
        if (ema9 < ema21 && rsi14 > 55 && currentPrice < localLow) {
            signal = 'SELL';
            reason = `SMC Rompimento Fundo Local ($${localLow.toFixed(2)}) + EMA9<21 + RSI(${rsi14.toFixed(1)})`;
        }

        // Emitir sinal (Evitar metralhadora: limitar a 1 sinal por direção a cada X segundos)
        // A lógica de throttle ficará no server.ts (lastSignalTime)
        if (signal && this.onSignal) {
            this.onSignal(signal, currentPrice, reason);
        }
    }

    private calculateEMA(prices: number[], period: number): number {
        const k = 2 / (period + 1);
        let ema = prices[prices.length - period]; // Base SMA aproximada
        for (let i = prices.length - period + 1; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }
        return ema;
    }

    private calculateRSI(prices: number[], period: number): number {
        let gains = 0;
        let losses = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
}
