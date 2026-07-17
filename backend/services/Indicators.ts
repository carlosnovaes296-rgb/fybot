export interface Candle {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export class Indicators {
    // Standard Exponential Moving Average (EMA)
    static ema(prices: number[], period: number): number[] {
        if (prices.length === 0) return [];
        const k = 2 / (period + 1);
        const result = [prices[0]];
        for (let i = 1; i < prices.length; i++) {
            result.push(prices[i] * k + result[i - 1] * (1 - k));
        }
        return result;
    }

    // Wilder's Smoothing (used in ATR, ADX, RSI in MT5)
    static smma(data: number[], period: number): number[] {
        if (data.length === 0) return [];
        const result: number[] = [];
        let sum = 0;
        
        // Initial simple average
        const initialLimit = Math.min(data.length, period);
        for (let i = 0; i < initialLimit; i++) sum += data[i];
        let prevSmma = sum / period;
        
        for (let i = 0; i < period - 1; i++) {
            result.push(0); // Not enough data
        }
        result.push(prevSmma);
        
        for (let i = period; i < data.length; i++) {
            prevSmma = (prevSmma * (period - 1) + data[i]) / period;
            result.push(prevSmma);
        }
        return result;
    }

    // Average True Range (ATR)
    static atr(candles: Candle[], period: number): number[] {
        if (candles.length === 0) return [];
        const trs: number[] = [candles[0].high - candles[0].low];
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            trs.push(tr);
        }
        return this.smma(trs, period);
    }

    // Average Directional Index (ADX)
    // Returns { adx, pdi, ndi }
    static adx(candles: Candle[], period: number): { adx: number[], pdi: number[], ndi: number[] } {
        if (candles.length === 0) return { adx: [], pdi: [], ndi: [] };
        const pDM: number[] = [0];
        const nDM: number[] = [0];
        const trs: number[] = [candles[0].high - candles[0].low];

        for (let i = 1; i < candles.length; i++) {
            const upMove = candles[i].high - candles[i - 1].high;
            const downMove = candles[i - 1].low - candles[i].low;

            let pdmVal = 0;
            let ndmVal = 0;
            
            if (upMove > downMove && upMove > 0) pdmVal = upMove;
            if (downMove > upMove && downMove > 0) ndmVal = downMove;

            pDM.push(pdmVal);
            nDM.push(ndmVal);

            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;
            trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
        }

        const trSmoothed = this.smma(trs, period);
        const pDmSmoothed = this.smma(pDM, period);
        const nDmSmoothed = this.smma(nDM, period);

        const pDI: number[] = [];
        const nDI: number[] = [];
        const dx: number[] = [];

        for (let i = 0; i < trSmoothed.length; i++) {
            if (trSmoothed[i] === 0 || i < period - 1) {
                pDI.push(0);
                nDI.push(0);
                dx.push(0);
            } else {
                const p = (pDmSmoothed[i] / trSmoothed[i]) * 100;
                const n = (nDmSmoothed[i] / trSmoothed[i]) * 100;
                pDI.push(p);
                nDI.push(n);
                
                const diff = Math.abs(p - n);
                const sum = p + n;
                dx.push(sum === 0 ? 0 : (diff / sum) * 100);
            }
        }

        const adxResult = this.smma(dx, period);
        return { adx: adxResult, pdi: pDI, ndi: nDI };
    }

    // Relative Strength Index (RSI) using Wilder's smoothing
    static rsi(prices: number[], period: number): number[] {
        if (prices.length === 0) return [];
        const gains: number[] = [0];
        const losses: number[] = [0];

        for (let i = 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? Math.abs(diff) : 0);
        }

        const smoothedGains = this.smma(gains, period);
        const smoothedLosses = this.smma(losses, period);
        const rsiArray: number[] = [];

        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                rsiArray.push(0);
            } else {
                const rs = smoothedLosses[i] === 0 ? 100 : smoothedGains[i] / smoothedLosses[i];
                const rsiVal = smoothedLosses[i] === 0 ? 100 : 100 - (100 / (1 + rs));
                rsiArray.push(rsiVal);
            }
        }
        return rsiArray;
    }
}
