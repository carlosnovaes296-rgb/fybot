import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { Trade } from '../types';
import { APP_ID } from '../config';
import { getOtpWebSocketUrl } from '../api/derivOtp';

interface TradingChartProps {
  trades: Trade[];
  symbol?: string;
  theme?: 'dark' | 'light';
  timeframe?: string; // 1M, 5M, 15M, etc.
  derivToken?: string;
  accountType?: string;
  onTradesUpdate?: (trades: Trade[]) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({ trades, symbol = 'frxXAUUSD', theme = 'dark', timeframe = '1M', derivToken, accountType = 'DEMO', onTradesUpdate }) => {
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

    // Para dados de gráfico (candles/ticks) usa sempre o endpoint público
    // Usamos o App ID numérico antigo (36544) livre de bloqueio Cloudflare para evitar o erro 1006 (WS FECHADO)
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=36544&l=PT`);
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
       // Sort by date DESC
       merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
       localTradesRef.current = merged;
       if (onTradesUpdate) onTradesUpdate(merged.slice(0, 50));
    };

    // Granularidade em segundos (1M = 60, 5M = 300)
    let granularity = 60;
    if (timeframe === '5M') granularity = 300;
    if (timeframe === '15M') granularity = 900;
    if (timeframe === '1H') granularity = 3600;
    let bypassAuth = false;

    const connectWS = async () => {
      let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=36544&l=PT`;
      const cleanedToken = (derivToken || '').trim();
      const isPatToken = cleanedToken.startsWith('pat_');
      let isAlreadyAuthorized = false;

      if (isPatToken && !bypassAuth) {
         try {
             const otpResult = await getOtpWebSocketUrl(cleanedToken, APP_ID, '', accountType);
             if (otpResult.url) {
                wsUrl = otpResult.url;
                isAlreadyAuthorized = true;
             }
         } catch(e) {
             console.error("[FYBOT] Erro ao obter OTP URL para grafico", e);
         }
      }

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      const requestCandles = () => {
        console.log("[FYBOT] Requisitando histórico de velas para o símbolo (SINTÉTICO 24/7):", symbol);
        socket.send(JSON.stringify({
          ticks_history: '1HZ100V', // Synthetic index (open 24/7) - Forex is closed on weekends
          adjust_start_time: 1,
          count: 500,
          end: 'latest',
          style: 'candles',
          granularity: granularity,
          subscribe: 1
        }));
      };

      socket.onopen = () => {
        console.log("[FYBOT] WebSocket Conectado diretamente à Deriv. Token recebido:", derivToken);
        const isValidWsToken = cleanedToken !== '' && cleanedToken !== 'undefined' && cleanedToken !== 'null' && !isPatToken;
        
        if (isAlreadyAuthorized) {
          console.log("[FYBOT] Sessão OTP já autorizada. Requisitando velas diretamente...");
          requestCandles();
        } else if (isValidWsToken && !bypassAuth) {
          console.log("[FYBOT] Enviando autorização API...");
          socket.send(JSON.stringify({ authorize: cleanedToken }));
        } else {
          if (isPatToken) {
            console.warn("[FYBOT] Falha no OTP ou fallback público ativo.");
          }
          console.log("[FYBOT] Sem token ativo ou fallback público. Requisitando velas diretamente...");
          requestCandles();
        }
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          
          if (data.msg_type === 'authorize') {
             if (data.error) {
               console.warn("[FYBOT] Falha ao autorizar token Deriv:", data.error.message);
               console.warn("[FYBOT] Desconectando e reconectando em Modo Público sem Token para carregar o gráfico...");
               bypassAuth = true;
               socket.close(); // Isso vai disparar o socket.onclose que criaremos abaixo!
             } else {
               console.log("[FYBOT] Token Deriv autorizado com sucesso!");
               requestCandles();
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
             const openTrades: Trade[] = data.portfolio.contracts.map((tx: any) => ({
                id: tx.contract_id.toString(),
                symbol: symbol,
                lot: 0,
                type: tx.shortcode.includes('UP') ? 'BUY' : 'SELL',
                openPrice: 0,
                time: new Date(tx.date_start * 1000).toISOString(),
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
             
             let tpPrice = undefined;
             let slPrice = undefined;
             
             if (c.limit_order) {}

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
          if (data.msg_type === 'candles' && data.candles && isMounted) {
            console.log("[FYBOT] Velas recebidas da Deriv:", data.candles.length);
            try {
              const cData = data.candles.map((c: any) => ({
                time: Number(c.epoch) as any,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close)
              }))
              .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.time === v.time) === i)
              .sort((a: any, b: any) => a.time - b.time);
              
              console.log("[FYBOT] Velas processadas:", cData.length, "Primeira:", cData[0], "Ultima:", cData[cData.length - 1]);
              
              if (cData.length > 0) {
                candleSeries.setData(cData);
                chart.timeScale().fitContent(); // Força o gráfico a enquadrar as velas
              }
            } catch(e) {
              console.error("Erro ao setar candles no gráfico:", e);
            }
          } else if (data.error) {
             console.error("[FYBOT] Erro retornado pela Deriv API:", data.error);
          }
          
          // Vela ao vivo
          if (data.msg_type === 'ohlc' && data.ohlc && isMounted) {
            try {
              const c = data.ohlc;
              candleSeries.update({
                time: Number(c.open_time) as any,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close)
              });
            } catch(e) {
              console.error("Erro ao atualizar vela ao vivo:", e);
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
