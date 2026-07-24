import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { Trade } from '../types';
import { getOtpWebSocketUrl } from '../api/derivOtp';
import { APP_ID } from '../config';

interface TradingChartProps {
  trades: Trade[];
  symbol?: string;
  theme?: 'dark' | 'light';
  timeframe?: string; // 1M, 5M, 15M, etc.
  derivToken?: string;
  accountType?: string;
  onTradesUpdate?: (trades: Trade[]) => void;
  onPriceUpdate?: (price: number) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({ trades, symbol = 'XAUUSD', theme = 'dark', timeframe = '1M', derivToken, accountType = 'DEMO', onTradesUpdate, onPriceUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Guardamos as linhas de preço ativas para poder remover quando o trade fechar
  const priceLinesRef = useRef<any[]>([]);
  // Referência para armazenar as trades vindas da Deriv antes de passá-las para cima
  const localTradesRef = useRef<Trade[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!containerRef.current) return;

    // 1. Inicializa o Gráfico
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 800,
      height: containerRef.current.clientHeight || 500,
      autoSize: true,
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

    // Função auxiliar para processar trades e avisar o App
    const emitTrades = (newTrades: Trade[]) => {
       const merged = [...localTradesRef.current];
       newTrades.forEach(nt => {
          const idx = merged.findIndex(t => t.id === nt.id);
          if (idx >= 0) {
            // Preserve TP and SL se já existirem no registro antigo (vindo do backend)
            if (nt.tp === undefined) nt.tp = merged[idx].tp;
            if (nt.sl === undefined) nt.sl = merged[idx].sl;
            merged[idx] = nt;
          }
          else merged.push(nt);
       });
       // Sort by date DESC and filter only today's trades
       const todayStr = new Date().toISOString().split('T')[0];
       const finalTrades = merged.filter(tr => tr.time && tr.time.startsWith(todayStr)).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
       localTradesRef.current = finalTrades;
       if (onTradesUpdate) onTradesUpdate(finalTrades.slice(0, 50));
    };

    // Granularidade em segundos (1M = 60, 5M = 300)
    let granularity = 60;
    if (timeframe === '5M') granularity = 300;
    if (timeframe === '15M') granularity = 900;
    if (timeframe === '1H') granularity = 3600;
    let bypassAuth = false;
    let isMagic = false;

    const connectWS = async () => {
      let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}&l=PT`;
      const cleanedToken = (derivToken || '').trim();

      if (cleanedToken && cleanedToken.startsWith('pat_')) {
          try {
             // 33TVM... é o App ID restrito de backend usado para os Tokens Nativos PAT
             const res = await getOtpWebSocketUrl(cleanedToken, '33TVM6cBQ9GfSjbwQHHdE', '', accountType);
             wsUrl = res.url;
             isMagic = true;
             console.log("[FYBOT] Usando Magic URL OTP para o gráfico!");
          } catch(e) {
             console.error("[FYBOT] Erro ao pegar Magic URL para gráfico, usando fallback público", e);
          }
      }

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      const requestCandles = (subscribe = 1) => {
        console.log("[FYBOT] Requisitando histórico de velas para o símbolo:", symbol, "Subscribe:", subscribe);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            ticks_history: symbol === 'XAUUSD' ? 'frxXAUUSD' : symbol, // Usa frxXAUUSD para Ouro
            adjust_start_time: 1,
            count: 500,
            end: 'latest',
            style: 'candles',
            granularity: granularity,
            ...(subscribe ? { subscribe: 1 } : {})
          }));
        }
      };


      socket.onopen = () => {
        console.log("[FYBOT] WebSocket Conectado diretamente à Deriv.");
        const isValidWsToken = cleanedToken !== '' && cleanedToken !== 'undefined' && cleanedToken !== 'null';
        
        if (isMagic) {
           console.log("[FYBOT] Conexão OTP estabelecida. Requisitando dados autenticados...");
           requestCandles(1);
           socket.send(JSON.stringify({ profit_table: 1, description: 1, sort: "DESC", limit: 50 }));
           socket.send(JSON.stringify({ portfolio: 1 }));
           socket.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
        }
        else if (isValidWsToken && !bypassAuth && !cleanedToken.startsWith('pat_')) {
          console.log("[FYBOT] Enviando autorização API clássica...");
          socket.send(JSON.stringify({ authorize: cleanedToken }));
        } else {
          console.log("[FYBOT] Sem token ativo ou fallback público. Requisitando velas...");
          requestCandles(1);
        }
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          
          if (data.msg_type === 'authorize') {
             if (data.error) {
               console.warn("[FYBOT] Falha ao autorizar token Deriv:", data.error.message);
             } else {
               console.log("[FYBOT] Token Deriv autorizado com sucesso!");
               requestCandles(1);
               // Pede o histórico de lucros
               socket.send(JSON.stringify({ profit_table: 1, description: 1, sort: "DESC", limit: 50 }));
               // Pede as posições abertas
               socket.send(JSON.stringify({ portfolio: 1 }));
               // Subscreve às posições abertas...
               socket.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
             }
          }

          if (data.msg_type === 'profit_table' && data.profit_table) {
             const closedTrades: Trade[] = data.profit_table.transactions.map((tx: any) => ({
                id: (tx.contract_id || tx.transaction_id || tx.purchase_time || 'closed').toString(),
                symbol: symbol,
                lot: Number(tx.buy_price) || 0,
                type: (tx.shortcode || '').includes('UP') || (tx.shortcode || '').includes('CALL') ? 'BUY' : 'SELL',
                openPrice: Number(tx.entry_spot || tx.buy_price || 0), // Use entry_spot if available, else use buy_price as fallback
                time: tx.purchase_time ? new Date(tx.purchase_time * 1000).toISOString() : new Date().toISOString(),
                status: 'CLOSED',
                profit: Number(tx.sell_price) - Number(tx.buy_price),
                closeTime: tx.sell_time ? new Date(tx.sell_time * 1000).toISOString() : new Date().toISOString()
             }));
             emitTrades(closedTrades);
          }

          if (data.msg_type === 'portfolio' && data.portfolio) {
             const openTrades: Trade[] = data.portfolio.contracts.map((tx: any) => ({
                id: (tx.contract_id || tx.transaction_id || tx.date_start || 'open').toString(),
                symbol: tx.symbol || tx.underlying || symbol,
                lot: Number(tx.buy_price) || 0,
                type: (tx.shortcode || '').includes('UP') || (tx.shortcode || '').includes('CALL') ? 'BUY' : 'SELL',
                openPrice: Number(tx.entry_spot || tx.buy_price || 0),
                time: tx.date_start ? new Date(tx.date_start * 1000).toISOString() : new Date().toISOString(),
                status: 'OPEN',
                profit: 0
             }));
             emitTrades(openTrades);
          }

          // Recebendo atualização ao vivo dos contratos abertos (inclui preço de entrada exato e TP/SL)
          if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
             const c = data.proposal_open_contract;
             if (!c.contract_id && !c.transaction_id && !c.purchase_time) return; // Prevent empty object handling

             const entryPrice = Number(c.entry_spot || c.entry_tick || c.current_spot || c.buy_price);
             const type = (c.contract_type || '').includes('UP') || (c.contract_type === 'CALL') ? 'BUY' : 'SELL';
             const profit = Number(c.profit || 0);
             
             let tpPrice = undefined;
             let slPrice = undefined;
             
             const multiplier = c.multiplier || 100;
             const stake = Number(c.buy_price) || 0;
             
             // Debug log to see the exact structure Deriv sends for limit_order
             if (c.limit_order) {
               console.log("[FYBOT] Limit Order recebida:", c.limit_order);
             }

             if (c.limit_order && stake > 0 && entryPrice > 0) {
               if (c.limit_order.take_profit !== undefined && c.limit_order.take_profit !== null) {
                 const tp = c.limit_order.take_profit;
                 const tpAmount = typeof tp === 'object' ? Number(tp.value || tp.order_amount) : Number(tp);
                 if (!isNaN(tpAmount)) {
                   const tpDiff = (tpAmount / (stake * multiplier)) * entryPrice;
                   tpPrice = type === 'BUY' ? entryPrice + tpDiff : entryPrice - tpDiff;
                 }
               }
               if (c.limit_order.stop_loss !== undefined && c.limit_order.stop_loss !== null) {
                 const sl = c.limit_order.stop_loss;
                 const slAmount = typeof sl === 'object' ? Number(sl.value || sl.order_amount) : Number(sl);
                 if (!isNaN(slAmount)) {
                   const slDiff = (slAmount / (stake * multiplier)) * entryPrice;
                   slPrice = type === 'BUY' ? entryPrice - slDiff : entryPrice + slDiff;
                 }
               }
             }

             const openTrade: Trade = {
                id: (c.contract_id || c.transaction_id || `${c.purchase_time}_${c.underlying}`).toString(),
                symbol: c.underlying || c.symbol || symbol,
                lot: Number(c.buy_price) || 0,
                type: type as 'BUY' | 'SELL',
                openPrice: entryPrice, 
                time: c.purchase_time ? new Date(c.purchase_time * 1000).toISOString() : new Date().toISOString(),
                status: c.is_sold ? 'CLOSED' : 'OPEN',
                profit: profit,
                tp: tpPrice,
                sl: slPrice
             };
             
             if (c.is_sold) {
                openTrade.closeTime = c.sell_time ? new Date(c.sell_time * 1000).toISOString() : new Date().toISOString();
             }
             
             emitTrades([openTrade]);
          }
           // Processando as velas que voltaram
           if (data.msg_type === 'candles' && data.candles && isMounted) {
              const cData = data.candles.map((c: any) => ({
                time: Number(c.epoch) as any,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close)
              }))
              .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.time === v.time) === i)
              .sort((a: any, b: any) => a.time - b.time);
              
              if (cData.length > 0) {
                candleSeries.setData(cData);
                chart.timeScale().fitContent();
                if (onPriceUpdate) onPriceUpdate(cData[cData.length - 1].close);
              }
           } else if (data.msg_type === 'ohlc' && data.ohlc && isMounted) {
              const c = data.ohlc;
              candleSeries.update({
                time: Number(c.open_time) as any,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close)
              });
              if (onPriceUpdate) onPriceUpdate(Number(c.close));
           } else if (data.error) {
               console.error("[FYBOT] Erro retornado pela Deriv API:", data.error);
               if (data.error.code === 'MarketIsClosed') {
                   console.warn("[FYBOT] Mercado Fechado! Requisitando histórico sem inscrição ao vivo...");
                   requestCandles(0);
               }
           }
        } catch (err) {
          console.error("Erro no WebSocket onmessage:", err);
        }
      };

      socket.onclose = () => {
         console.log("[FYBOT] WebSocket fechado.");
         // Se fechou por causa do bypass, reconectamos em modo público imediatamente
         if (bypassAuth && isMounted) {
            console.log("[FYBOT] Reconectando em Modo Público...");
            connectWS();
         }
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      try {
        chart.remove();
      } catch (e) {
        console.error("Error removing chart:", e);
      }
    };
  }, [symbol, timeframe, derivToken]);

  // 3. Efeito separado para desenhar as ordens (TP/SL/Markers) quando `trades` atualiza
  useEffect(() => {
    try {
      if (!seriesRef.current) return;
      const series = seriesRef.current;

      // Limpa linhas antigas
      priceLinesRef.current.forEach(line => {
         try { series.removePriceLine(line); } catch(e) {}
      });
      priceLinesRef.current = [];

      const markers: any[] = [];

      trades.forEach(trade => {
        if (trade.time) {
           const tradeTime = Math.floor(new Date(trade.time).getTime() / 1000);
           if (!isNaN(tradeTime)) {
              const safeProfit = trade.profit !== undefined ? Number(trade.profit) : 0;
              markers.push({
                time: tradeTime,
                position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
                color: trade.type === 'BUY' ? '#22c55e' : '#ef4444',
                shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                text: trade.status === 'CLOSED' && !isNaN(safeProfit)
                      ? `${trade.type === 'BUY' ? 'Buy' : 'Sell'} [$${safeProfit.toFixed(2)}]` 
                      : (trade.type === 'BUY' ? 'Buy' : 'Sell')
              });
           }
        }

        // Se a ordem estiver aberta e tiver TP/SL
        if (trade.status === 'OPEN' && trade.openPrice && Number(trade.openPrice) > 0) {
           // Linha de Entrada com Lucro em Tempo Real
           const safeProfit = trade.profit !== undefined ? Number(trade.profit) : 0;
           const profitText = !isNaN(safeProfit) && safeProfit !== 0 ? ` [$${safeProfit.toFixed(2)}]` : '';
           const entryLine = series.createPriceLine({
              price: Number(trade.openPrice),
              color: safeProfit > 0 ? '#22c55e' : (safeProfit < 0 ? '#ef4444' : '#3b82f6'),
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `ENTRY (${trade.type})${profitText}`,
           });
           priceLinesRef.current.push(entryLine);

           if (trade.tp !== undefined && trade.tp !== null && Number(trade.tp) > 0) {
              const tpLine = series.createPriceLine({
                 price: Number(trade.tp),
                 color: '#22c55e',
                 lineWidth: 2,
                 lineStyle: LineStyle.Solid,
                 axisLabelVisible: true,
                 title: 'TP',
              });
              priceLinesRef.current.push(tpLine);
           }

           if (trade.sl !== undefined && trade.sl !== null && Number(trade.sl) > 0) {
              const slLine = series.createPriceLine({
                 price: Number(trade.sl),
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
      
      series.setMarkers(uniqueMarkers);
    } catch(err) {
       console.error("Erro critico no useEffect do grafico:", err);
    }
  }, [trades]);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden p-4">
      {/* Mensagem de Debug para garantir que o componente está renderizando na tela */}
      <div className="absolute top-2 left-2 z-50 text-white text-xs font-mono opacity-50">
        FYBOT CHART ENGINE (V8)
      </div>
      {/* Wrapper para garantir dimensões do lightweight-charts */}
      <div className="flex-1 relative w-full h-full">
        <div ref={containerRef} className="absolute inset-0 z-10" />
      </div>
    </div>
  );
};
