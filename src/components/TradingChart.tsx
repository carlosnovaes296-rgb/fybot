import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, ISeriesApi, Time } from 'lightweight-charts';

interface Trade {
  id: string;
  symbol: string;
  lot?: number;
  amount?: number;
  type: string;
  openPrice?: number;
  entryPrice?: number;
  time?: string;
  openTime?: string;
  status: string;
  profit?: number;
  closeTime?: string;
  sl?: number;
  tp?: number;
}

interface TradingChartProps {
  trades?: Trade[];
  symbol?: string;
  theme?: 'dark' | 'light';
  timeframe?: string;
  derivToken?: string;
  accountType?: 'DEMO' | 'REAL';
  onTradesUpdate?: (trades: Trade[]) => void;
  onPriceUpdate?: (price: number) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({ trades = [], symbol = 'XAUUSD', theme = 'dark', timeframe = '15m', onPriceUpdate }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Inicializar o gráfico com visual profissional e sem logos
    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0c' },
        textColor: '#ffffff50',
      },
      grid: {
        vertLines: { color: '#ffffff05' },
        horzLines: { color: '#ffffff05' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#ffffff20', style: 3 },
        horzLine: { color: '#ffffff20', style: 3 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#ffffff10',
      },
      rightPriceScale: {
        borderColor: '#ffffff10',
      }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Conectar a Binance (PAXGUSDT = XAUUSD) para garantir estabilidade 100%
  useEffect(() => {
    let ws: WebSocket;
    
    // Map timeframe string to Binance intervals
    const intervalMap: Record<string, string> = {
      '1m': '1m', '1M': '1m',
      '15m': '15m', '15M': '15m',
      '30m': '30m', '30M': '30m',
      '1h': '1h', '1H': '1h'
    };
    const interval = intervalMap[timeframe] || '15m';
    
    const symbolToUse = (symbol === 'XAUUSD' || symbol === 'OURO') ? 'PAXGUSDT' : 'BTCUSDT'; // PAXG é Lastro de Ouro = XAUUSD

    const fetchData = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbolToUse}&interval=${interval}&limit=300`);
        const data = await res.json();
        
        const historicalData = data.map((d: any) => ({
          time: (d[0] / 1000) as Time,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4])
        }));
        
        if (seriesRef.current) {
          seriesRef.current.setData(historicalData);
        }

        // Live WS com Auto-Reconnect
        let reconnectTimeout: any;
        const connectWs = () => {
          ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbolToUse.toLowerCase()}@kline_${interval}`);
          ws.onmessage = (msg) => {
            const parsed = JSON.parse(msg.data);
            if (parsed.e === 'kline') {
              const k = parsed.k;
              setCurrentPrice(parseFloat(k.c));
              if (onPriceUpdate) onPriceUpdate(parseFloat(k.c)); // Sincroniza o preço do topo da dashboard!
              
              if (seriesRef.current) {
                seriesRef.current.update({
                  time: (k.t / 1000) as Time,
                  open: parseFloat(k.o),
                  high: parseFloat(k.h),
                  low: parseFloat(k.l),
                  close: parseFloat(k.c)
                });
              }
            }
          };
          
          ws.onclose = () => {
            // Tenta reconectar a cada 2 segundos se a conexão cair (ex: tela bloqueada)
            reconnectTimeout = setTimeout(connectWs, 2000);
          };
        };

        connectWs();
      } catch (err) {
        console.error("Binance error", err);
      }
    };

    fetchData();

    return () => {
      if (ws) ws.close();
    };
  }, [symbol, timeframe, onPriceUpdate]);

  const activeTrades = trades.filter(t => t.status === 'OPEN');

  // Handle markers manually to avoid duplication
  const priceLinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!seriesRef.current) return;

    // Clear old lines
    priceLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
    priceLinesRef.current = [];

    activeTrades.forEach(trade => {
      const rawType = String(trade.type).toUpperCase();
      const isBuy = rawType === 'BUY' || rawType === 'CALL' || rawType === 'MULTUP';
      const openColor = isBuy ? '#10b981' : '#ef4444'; // Verde ou Vermelho
      const price = Number(trade.entryPrice || trade.openPrice || trade.price || trade.open_price || trade.entry_price || 0);
      const lot = trade.amount || trade.lot || 0;
      const profit = Number(trade.profit || 0);

      if (price > 0) {
        // 1. Linha de Entrada (OPEN)
        const line = seriesRef.current?.createPriceLine({
          price: price,
          color: openColor,
          lineWidth: 2,
          lineStyle: 0, // 0 = Sólida
          axisLabelVisible: true,
          title: `${isBuy ? 'BUY' : 'SELL'} ${lot} ($${profit.toFixed(2)})`,
          axisLabelColor: openColor,
          axisLabelTextColor: '#ffffff'
        });
        if (line) priceLinesRef.current.push(line);
      }

      // 2. Take Profit (TP)
      let tpValue = trade.tp;
      if (!tpValue || tpValue <= 0) {
        // fallback: add 0.2% of price for BUY, subtract for SELL
        if (isBuy) {
          tpValue = price * 1.002; // approx +0.2%
        } else {
          tpValue = price * 0.998; // approx -0.2%
        }
      }
      if (tpValue && tpValue > 0) {
        const tpLine = seriesRef.current?.createPriceLine({
          price: tpValue,
          color: '#10b981', 
          lineWidth: 2,
          lineStyle: 2, // 2 = Dashed
          axisLabelVisible: true,
          title: 'TP',
          axisLabelColor: '#10b981',
          axisLabelTextColor: '#ffffff'
        });
        if (tpLine) priceLinesRef.current.push(tpLine);
      }

      // 3. Stop Loss (SL)
      let slValue = trade.sl;
      if (!slValue || slValue <= 0) {
        if (isBuy) {
          slValue = price * 0.998; // approx -0.2%
        } else {
          slValue = price * 1.002; // approx +0.2%
        }
      }
      if (slValue && slValue > 0) {
        const slLine = seriesRef.current?.createPriceLine({
          price: slValue,
          color: '#ef4444', 
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
          axisLabelColor: '#ef4444',
          axisLabelTextColor: '#ffffff'
        });
        if (slLine) priceLinesRef.current.push(slLine);
      }
    });

  }, [trades]); // Roda sempre que a lista de trades atualizar!

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden p-4">
      <div className="absolute top-2 left-2 z-50 text-white text-[10px] font-mono opacity-50 pointer-events-none tracking-widest uppercase">
         Fybot Lightweight Engine (PRO)
      </div>
      {/* CSS para forçar a remoção da marca d'água da biblioteca (TV) */}
      <style>
        {`
          a[href*="tradingview"],
          #tv-attr-logo,
          .tv-lightweight-charts-watermark {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            z-index: -9999 !important;
          }
        `}
      </style>
      {/* Container do Gráfico */}
      <div ref={chartContainerRef} className="flex-1 w-full relative z-10" />
      
      {/* Decorative Blur */}
      <div className="absolute bottom-0 left-0 w-full h-[150px] bg-[#10b981]/5 blur-[80px] pointer-events-none" />
    </div>
  );
};
