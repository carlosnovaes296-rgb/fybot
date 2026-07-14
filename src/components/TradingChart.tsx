import React, { useEffect, useRef } from 'react';
import { Trade } from '../types';

interface TradingChartProps {
  trades: Trade[];
  symbol?: string;
  theme?: 'dark' | 'light';
  timeframe?: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ trades, symbol = 'XAUUSD', theme = 'dark', timeframe = '1M' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Limpa o container para não duplicar o widget em re-renders
    containerRef.current.innerHTML = '';
    
    // Mapeamento do Timeframe para o formato do TradingView
    let interval = '1';
    if (timeframe === '5M') interval = '5';
    if (timeframe === '15M') interval = '15';
    if (timeframe === '1H') interval = '60';
    if (timeframe === '4H') interval = '240';
    if (timeframe === '1D') interval = 'D';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: true,
          // Para Ouro (XAUUSD) usamos a OANDA que tem um gráfico perfeitamente sincronizado com o MT5
          symbol: symbol === 'XAUUSD' ? 'OANDA:XAUUSD' : symbol,
          interval: interval,
          timezone: 'America/Sao_Paulo',
          theme: theme,
          style: '1', // 1 = Candles
          locale: 'br', // Português do Brasil
          enable_publishing: false,
          backgroundColor: '#0a0a0c',
          gridColor: '#1f1f25',
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerRef.current!.id,
          toolbar_bg: '#0a0a0c',
          withdateranges: true,
          allow_symbol_change: true,
          studies: [
            // Indicadores padrão disponíveis se o usuário quiser ativá-los pelo menu depois
          ]
        });
      }
    };
    
    // Anexa o script para carregar o widget
    document.body.appendChild(script);

    return () => {
      // Limpa o script ao desmontar o componente
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, timeframe, theme]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden p-4">
      {/* Container do Gráfico Completo do TradingView */}
      <div id="tv_chart_container_fybot" ref={containerRef} className="flex-1 w-full h-full relative z-10" />
    </div>
  );
};
