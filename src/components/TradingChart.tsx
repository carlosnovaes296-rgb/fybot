import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, Time } from 'lightweight-charts';
import { Trade } from '../types';

interface TradingChartProps {
  trades: Trade[];
  symbol?: string;
  theme?: 'dark' | 'light';
  timeframe?: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ trades, symbol = 'XAUUSD', theme = 'dark', timeframe = '1M' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Inicializar o gráfico com visual profissional e sem logos
    const chart = createChart(chartContainerRef.current, {
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

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
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

  // Conectar ao WebSocket da Deriv para receber Velas (Candles)
  useEffect(() => {
    let ws: WebSocket;
    
    // Map timeframe string to seconds
    const granularityMap: Record<string, number> = {
      '1M': 60,
      '5M': 300,
      '15M': 900,
      '1H': 3600
    };
    const granularity = granularityMap[timeframe] || 60;

    const connectWS = () => {
      ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
      
      ws.onopen = () => {
        // Conexão oficial de produção para o mercado de Ouro real
        const reqSymbol = symbol === 'XAUUSD' ? 'frxXAUUSD' : symbol;
        ws.send(JSON.stringify({
          ticks_history: reqSymbol,
          adjust_start_time: 1,
          count: 100,
          end: 'latest',
          start: 1,
          style: 'candles',
          granularity: granularity,
          subscribe: 1
        }));
      };

      ws.onmessage = (msg) => {
        const parsed = JSON.parse(msg.data);
        
        if (parsed.error) {
          console.error("Erro na Deriv (Gráfico):", parsed.error.message);
          // Fallback Automático: Se o Ouro estiver fechado ou der erro, carrega o R_100 para não ficar preto!
          if (parsed.echo_req?.ticks_history === 'frxXAUUSD') {
            console.log("Fazendo fallback para R_100 temporariamente...");
            ws.send(JSON.stringify({
              ticks_history: 'R_100',
              adjust_start_time: 1,
              count: 100,
              end: 'latest',
              start: 1,
              style: 'candles',
              granularity: granularity,
              subscribe: 1
            }));
          }
          return;
        }
        
        // Histórico inicial de velas
        if (parsed.msg_type === 'history' && parsed.candles) {
          const historicalData = parsed.candles.map((c: any) => ({
            time: c.epoch as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }));
          
          if (seriesRef.current) {
            seriesRef.current.setData(historicalData);
          }
        }
        
        // Atualização em tempo real da vela atual
        if (parsed.msg_type === 'ohlc' && parsed.ohlc) {
          const c = parsed.ohlc;
          setCurrentPrice(parseFloat(c.close));
          if (seriesRef.current) {
            seriesRef.current.update({
              time: c.open_time as Time,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close)
            });
          }
        }
      };

      ws.onclose = () => setTimeout(connectWS, 5000);
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, [symbol, timeframe]);

  const activeTrades = trades.filter(t => t.status === 'OPEN');

  // Desenhar as linhas Melhoradas de SL, TP e OPEN
  useEffect(() => {
    if (!seriesRef.current) return;

    // Limpar as linhas anteriores
    seriesRef.current.priceLines().forEach(line => seriesRef.current?.removePriceLine(line));

    activeTrades.forEach(trade => {
      const isBuy = trade.type === 'BUY';
      const openColor = isBuy ? '#3b82f6' : '#f59e0b'; // Azul ou Laranja

      // 1. Linha de Entrada (OPEN) - Sólida e marcante
      seriesRef.current?.createPriceLine({
        price: trade.openPrice,
        color: openColor,
        lineWidth: 2,
        lineStyle: 0, // 0 = Sólida
        axisLabelVisible: true,
        title: `OPEN ${trade.type}`,
        axisLabelColor: openColor,
        axisLabelTextColor: '#ffffff'
      });

      // 2. Take Profit (TP) - Verde vibrante com box
      if (trade.tp) {
        seriesRef.current?.createPriceLine({
          price: trade.tp,
          color: '#10b981', 
          lineWidth: 2,
          lineStyle: 2, // 2 = Dashed
          axisLabelVisible: true,
          title: 'TARGET (TP)',
          axisLabelColor: '#10b981',
          axisLabelTextColor: '#ffffff'
        });
      }

      // 3. Stop Loss (SL) - Vermelho alerta com box
      if (trade.sl) {
        seriesRef.current?.createPriceLine({
          price: trade.sl,
          color: '#ef4444', 
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'STOP (SL)',
          axisLabelColor: '#ef4444',
          axisLabelTextColor: '#ffffff'
        });
      }
    });

  }, [trades]);

  return (
    <div className="relative w-full h-[300px] md:h-[400px] flex flex-col bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden p-4">
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
      <div className="absolute bottom-0 left-0 w-full h-[150px] bg-blue-500/5 blur-[80px] pointer-events-none" />
    </div>
  );
};
