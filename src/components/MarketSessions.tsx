import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { Language } from '../types';

function BrazilFlag() {
  return (
    <div className="w-7 h-5 rounded-md overflow-hidden shrink-0 border border-white/10 relative">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        <rect width="100" height="70" fill="#009739" />
        <polygon points="50,6 92,35 50,64 8,35" fill="#FEDF00" />
        <circle cx="50" cy="35" r="15" fill="#002F7F" />
        <path d="M36,37 Q46,31 64,32 Q48,34 36,37" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

interface MarketSessionsProps {
  language: Language;
  stats?: any;
}

export function MarketSessions({ language, stats }: MarketSessionsProps) {
  const isEn = language === 'en';
  const isEs = language === 'es';

  const title = isEn
    ? 'Market Trading Sessions'
    : isEs
      ? 'Sesiones de Operación de Mercado'
      : 'Horários de Sessões de Mercado';

  // Manual session toggles
  const [inMorning, setInMorning] = useState(false);
  const [inNight, setInNight] = useState(false);
  const isActive = inMorning || inNight;

  // Detect active Brazil trading window in real-time (BRT = UTC-3)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const brtHour = (currentTime.getUTCHours() - 3 + 24) % 24;
  const brtMin = currentTime.getUTCMinutes();
  const brtTotal = brtHour * 60 + brtMin;
  
  // Morning: 10:00–11:59 BRT | Night: 21:00–22:59 BRT
  const isMorningTime = brtTotal >= 10 * 60 && brtTotal < 12 * 60;
  const isNightTime = brtTotal >= 21 * 60 && brtTotal < 23 * 60; // 21:00-22:59

  // Auto-activate and auto-deactivate logic
  useEffect(() => {
    // Check if daily target is reached (systemBlocked or profit >= target)
    const targetReached = stats?.systemBlocked || 
      (stats?.dailyProfit !== undefined && stats?.dailyProfitTarget !== undefined && stats.dailyProfit >= stats.dailyProfitTarget);

    if (targetReached) {
      setInMorning(false);
      setInNight(false);
    } else {
      // Auto-activate when entering the window
      if (isMorningTime) setInMorning(true);
      if (isNightTime) setInNight(true);
    }
  }, [isMorningTime, isNightTime, stats?.systemBlocked, stats?.dailyProfit, stats?.dailyProfitTarget]);

  const sessions = [
    {
      id: 'morning',
      labelBrt: '10:00 BRT',
      labelUTC: '13:00 UTC',
      icon: '☀️',
      active: inMorning,
      isCurrentTime: isMorningTime,
      toggle: () => setInMorning(!inMorning),
      descPt: 'Sessão da Manhã — Abertura Europa/NY',
      descEn: 'Morning Session — Europe/NY Open',
      descEs: 'Sesión Matutina — Apertura Europa/NY',
      globalTimes: 'Portugal 14:00 | Espanha 15:00 | Nova York 09:00'
    },
    {
      id: 'night',
      labelBrt: '21:00 BRT',
      labelUTC: '00:00 UTC',
      icon: '🌙',
      active: inNight,
      isCurrentTime: isNightTime,
      toggle: () => setInNight(!inNight),
      descPt: 'Sessão Noturna — Abertura Ásia/Tóquio',
      descEn: 'Night Session — Asia/Tokyo Open',
      descEs: 'Sesión Nocturna — Apertura Asia/Tokio',
      globalTimes: 'Portugal 00:00 | Espanha 01:00 | Nova York 19:00'
    },
  ];

  return (
    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20 w-full space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-[11px] text-white/50">
          <Clock size={14} className="text-blue-400" /> {title}
        </h3>
        {isActive && (
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            {isEn ? 'ACTIVE WINDOW' : isEs ? 'VENTANA ACTIVA' : 'JANELA ATIVA'}
          </span>
        )}
      </div>

      {/* IABOT Brazil Windows */}
      <div className="space-y-3">
        <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 flex items-center gap-1.5">
          <Zap size={10} className="text-yellow-500" />
          {isEn ? 'IABOT Operation Windows (Smart Mode)' : isEs ? 'Ventanas de Operación IABOT (Modo Inteligente)' : 'Janelas de Operação IABOT (Modo Inteligente)'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <button
              key={s.labelBrt}
              onClick={s.toggle}
              className={`relative rounded-2xl border p-4 flex flex-col justify-center gap-3 transition-all text-left w-full hover:scale-[1.01] active:scale-[0.99] ${
                s.active
                  ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                  : s.isCurrentTime 
                    ? 'bg-white/[0.04] border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              {s.active && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              )}
              <div className="flex items-center gap-4 w-full">
                <div className="text-2xl shrink-0">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xl font-mono font-black tracking-tight ${s.active ? 'text-emerald-400' : 'text-white'}`}>
                      {s.labelBrt}
                    </span>
                    <span className="text-[14px] font-mono text-emerald-500 font-bold">/ {s.labelUTC}</span>
                    {s.isCurrentTime && (
                       <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 uppercase tracking-widest font-bold">
                         {isEn ? 'Current Time' : isEs ? 'Hora Actual' : 'Horário Atual'}
                       </span>
                    )}
                  </div>
                  <p className="text-[15px] text-emerald-400/90 leading-tight mt-1">
                    {isEn ? s.descEn : isEs ? s.descEs : s.descPt}
                  </p>
                </div>
                <div className="flex items-center shrink-0">
                  <BrazilFlag />
                </div>
              </div>
              
              {/* Global Times Pill */}
              <div className="mt-2 flex items-center gap-2 text-[15px] text-emerald-400 font-mono font-bold bg-black/40 px-3 py-1.5 rounded-lg w-fit border border-emerald-500/20 shadow-inner">
                {s.globalTimes}
              </div>

            </button>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[14px] text-emerald-400 font-medium leading-relaxed mt-4 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
        {isEn
          ? '⚡ IABOT V8 automatically opens sessions at 10:00 BRT and 21:00 BRT, and will auto-close as soon as the daily target is reached. You can still manually click to toggle.'
          : isEs
          ? '⚡ IABOT V8 abre automáticamente las sesiones a las 10:00 BRT y 21:00 BRT, y se cerrará en cuanto se alcance la meta diaria. Aún puedes activarlas o desactivarlas manualmente.'
          : '⚡ O IABOT V8 ativa as janelas automaticamente às 10:00 BRT e 21:00 BRT, e desativa assim que a meta do dia for concluída. Você ainda pode clicar nos painéis para controle manual.'}
      </p>
    </div>
  );
}
