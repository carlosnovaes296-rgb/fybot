import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { Trade } from '../types';
import { APP_ID } from '../config';

interface TradingChartProps {
  trades: Trade[];
  symbol?: string;
  theme?: 'dark' | 'light';
  timeframe?: string; // 1M, 5M, 15M, etc.
  derivToken?: string;
  onTradesUpdate?: (trades: Trade[]) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({ trades, symbol = 'frxXAUUSD', theme = 'dark', timeframe = '1M', derivToken, onTradesUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Guardamos as linhas de preço ativas para poder remover quando o trade fechar
  const priceLinesRef = useRef<any[]>([]);
  // Referência para armazenar as trades vindas da Deriv antes de passá-las para cima
  const localTradesRef = useRef<Trade[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Inicializa o Gráfico
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0c' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f1f25' },
        horzLines: { color: '#1f1f25' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#1f1f25',
      },
      timeScale: {
        borderColor: '#1f1f25',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // Responsividade
    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current?.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}&l=PT`);
    wsRef.current = ws;

    // Granularidade em segundos (1M = 60, 5M = 300)
    let granularity = 60;
    if (timeframe === '5M') granularity = 300;
    if (timeframe === '15M') granularity = 900;
    if (timeframe === '1H') granularity = 3600;

    const requestCandles = () => {
      ws.send(JSON.stringify({
        ticks_history: symbol === 'XAUUSD' ? 'frxXAUUSD' : symbol,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: granularity,
        subscribe: 1
      }));
    };

    ws.onopen = () => {
      if (derivToken) {
         ws.send(JSON.stringify({ authorize: derivToken }));
      } else {
         requestCandles();
      }
    };

    // Função auxiliar para processar trades e avisar o App
    const emitTrades = (newTrades: Trade[]) => {
       const merged = [...localTradesRef.current];
       newTrades.forEach(nt => {
          const idx = merged.findIndex(t => t.id === nt.id);
          if (idx >= 0) merged[idx] = nt;
          else merged.push(nt);
       });
       // Sort by date DESC
       merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
       localTradesRef.current = merged;
       if (onTradesUpdate) onTradesUpdate(merged.slice(0, 50));
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      
      if (data.msg_type === 'authorize') {
         requestCandles();
         // Pede o histórico de lucros
         ws.send(JSON.stringify({ profit_table: 1, description: 1, sort: "DESC", limit: 50 }));
         // Pede as posições abertas
         ws.send(JSON.stringify({ portfolio: 1 }));
         // Subscreve às posições abertas para receber atualizações em tempo real (incluindo entry_spot, tp, sl)
         ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
      }

      if (data.msg_type === 'profit_table' && data.profit_table) {
         const closedTrades: Trade[] = data.profit_table.transactions.map((tx: any) => ({
            id: tx.contract_id.toString(),
            symbol: symbol,
            lot: 0,
            type: tx.shortcode.includes('UP') ? 'BUY' : 'SELL',
            openPrice: 0,
            time: new Date(tx.purchase_time * 1000).toISOString(),
            status: 'CLOSED',
            profit: Number(tx.sell_price) - Number(tx.buy_price),
            closeTime: new Date(tx.sell_time * 1000).toISOString()
         }));
         emitTrades(closedTrades);
      }

      if (data.msg_type === 'portfolio' && data.portfolio) {
         const openTrades: Trade[] = data.portfolio.contracts.map((c: any) => ({
            id: c.contract_id.toString(),
            symbol: symbol,
            lot: 0,
            type: c.contract_type.includes('UP') ? 'BUY' : 'SELL',
            openPrice: 0, 
            time: new Date(c.purchase_time * 1000).toISOString(),
            status: 'OPEN',
            profit: 0
         }));
         emitTrades(openTrades);
      }

      // Recebendo atualização ao vivo dos contratos abertos (inclui preço de entrada exato e TP/SL)
      if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
         const c = data.proposal_open_contract;
         const entryPrice = Number(c.entry_tick || c.current_spot);
         const type = c.contract_type.includes('UP') ? 'BUY' : 'SELL';
         const profit = Number(c.profit);
         
         // Para multiplicadores, TP/SL são enviados como valores financeiros.
         // Vamos tentar extrair os limites de preço se disponíveis na API, 
         // ou usar os próprios valores fornecidos. Se a Deriv não devolver price lines no limit_order, 
         // usaremos os spots exatos (se houver cancel_level ou barrier).
         let tpPrice = undefined;
         let slPrice = undefined;
         
         if (c.limit_order) {
           // Algumas contas retornam os niveis exatos (p.ex: take_profit.display_name ou algo parecido)
           // Se não, não temos como desenhar o SL/TP exato sem recalcular o multiplicador no client, 
           // mas podemos guardar a informação.
         }

         const openTrade: Trade = {
            id: c.contract_id.toString(),
            symbol: symbol,
            lot: 0,
            type: type as 'BUY' | 'SELL',
            openPrice: entryPrice, 
            time: new Date(c.purchase_time * 1000).toISOString(),
            status: c.is_sold ? 'CLOSED' : 'OPEN',
            profit: profit,
            tp: tpPrice,
            sl: slPrice
         };
         
         if (c.is_sold) {
            openTrade.closeTime = new Date(c.sell_time * 1000).toISOString();
         }
         
         emitTrades([openTrade]);
      }

      // Histórico Inicial de Velas
      if (data.msg_type === 'candles' && data.candles) {
        const cData = data.candles.map((c: any) => ({
          time: c.epoch,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));
        candleSeries.setData(cData);
      }
      
      // Vela ao vivo
      if (data.msg_type === 'ohlc' && data.ohlc) {
        const c = data.ohlc;
        candleSeries.update({
          time: c.open_time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close)
        });
      }
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      chart.remove();
    };
  }, [symbol, timeframe, derivToken]);

  // 3. Efeito separado para desenhar as ordens (TP/SL/Markers) quando `trades` atualiza
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;

    // Limpa linhas antigas
    priceLinesRef.current.forEach(line => series.removePriceLine(line));
    priceLinesRef.current = [];

    const markers: any[] = [];

    trades.forEach(trade => {
      // Desenha setas para todas as trades (abertas e fechadas) se tiverem tempo
      if (trade.time) {
         const tradeTime = Math.floor(new Date(trade.time).getTime() / 1000);
         markers.push({
           time: tradeTime,
           position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
           color: trade.type === 'BUY' ? '#22c55e' : '#ef4444',
           shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
           text: trade.type === 'BUY' ? 'Buy' : 'Sell'
         });
      }

      // Se a ordem estiver aberta e tiver TP/SL
      if (trade.status === 'OPEN' && trade.openPrice) {
         // Linha de Entrada
         const entryLine = series.createPriceLine({
            price: trade.openPrice,
            color: '#3b82f6', // Azul
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `ENTRY (${trade.type})`,
         });
         priceLinesRef.current.push(entryLine);

         if (trade.tp) {
            const tpLine = series.createPriceLine({
               price: trade.tp,
               color: '#22c55e',
               lineWidth: 2,
               lineStyle: LineStyle.Solid,
               axisLabelVisible: true,
               title: 'TP',
            });
            priceLinesRef.current.push(tpLine);
         }

         if (trade.sl) {
            const slLine = series.createPriceLine({
               price: trade.sl,
               color: '#ef4444',
               lineWidth: 2,
               lineStyle: LineStyle.Solid,
               axisLabelVisible: true,
               title: 'SL',
            });
            priceLinesRef.current.push(slLine);
         }
      }
    });

    // Ordena os markers por tempo (obrigatório do lightweight-charts)
    markers.sort((a, b) => a.time - b.time);
    
    // Filtra marcadores duplicados no mesmo timestamp exato
    const uniqueMarkers = markers.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
    
    try {
       series.setMarkers(uniqueMarkers);
    } catch(e) {
       console.error("Erro ao desenhar markers", e);
    }

  }, [trades]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden p-4">
      {/* Container do Gráfico Lightweight */}
      <div ref={containerRef} className="flex-1 w-full h-full relative z-10" />
    </div>
  );
};
