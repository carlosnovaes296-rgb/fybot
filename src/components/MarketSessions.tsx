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
}

export function MarketSessions({ language }: MarketSessionsProps) {
  const isEn = language === 'en';
  const isEs = language === 'es';

  const title = isEn
    ? 'Market Trading Sessions'
    : isEs
      ? 'Sesiones de Operación de Mercado'
      : 'Horários de Sessões de Mercado';

  // Detect active Brazil trading window in real-time (BRT = UTC-3)
  const now = new Date();
  const brtHour = (now.getUTCHours() - 3 + 24) % 24;
  const brtMin  = now.getUTCMinutes();
  const brtTotal = brtHour * 60 + brtMin;
  // Morning: 11:00–12:59 BRT | Night: 22:00–23:59 BRT
  const inMorning = brtTotal >= 11 * 60 && brtTotal < 13 * 60;
  const inNight   = brtTotal >= 22 * 60 || brtTotal < 0; // 22:00-23:59
  const isActive  = inMorning || inNight;

  const sessions = [
    {
      labelBrt: '11:00 BRT',
      labelUTC: '14:00 UTC',
      icon: '☀️',
      active: inMorning,
      descPt: 'Sessão da Manhã — Abertura Europa/NY',
      descEn: 'Morning Session — Europe/NY Open',
      descEs: 'Sesión Matutina — Apertura Europa/NY',
      globalTimes: 'Portugal 15:00 | Espanha 16:00 | Nova York 10:00'
    },
    {
      labelBrt: '22:00 BRT',
      labelUTC: '01:00 UTC',
      icon: '🌙',
      active: inNight,
      descPt: 'Sessão Noturna — Abertura Ásia/Tóquio',
      descEn: 'Night Session — Asia/Tokyo Open',
      descEs: 'Sesión Nocturna — Apertura Asia/Tokio',
      globalTimes: 'Portugal 02:00 | Espanha 03:00 | Nova York 21:00'
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

      {/* FYBOT Brazil Windows */}
      <div className="space-y-3">
        <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 flex items-center gap-1.5">
          <Zap size={10} className="text-yellow-500" />
          {isEn ? 'FYBOT Operation Windows' : isEs ? 'Ventanas de Operación FYBOT' : 'Janelas de Operação FYBOT'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <div
              key={s.labelBrt}
              className={`relative rounded-2xl border p-4 flex flex-col justify-center gap-3 transition-all ${
                s.active
                  ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              {s.active && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              )}
              <div className="flex items-center gap-4">
                <div className="text-2xl shrink-0">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xl font-mono font-black tracking-tight ${s.active ? 'text-emerald-400' : 'text-white'}`}>
                      {s.labelBrt}
                    </span>
                    <span className="text-[14px] font-mono text-emerald-500 font-bold">/ {s.labelUTC}</span>
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

            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[14px] text-emerald-400 font-medium leading-relaxed mt-4 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
        {isEn
          ? '⚡ FYBOT V8 operates only during the two configured Brazil sessions (11:00 BRT and 22:00 BRT). Outside these windows the engine remains on standby.'
          : isEs
          ? '⚡ FYBOT V8 opera solo durante las dos sesiones configuradas de Brasil (11:00 BRT y 22:00 BRT). Fuera de estas ventanas el motor permanece en espera.'
          : '⚡ O FYBOT V8 opera exclusivamente nas duas janelas configuradas para o Brasil (11:00 BRT e 22:00 BRT). Fora desses horários o motor permanece em standby.'}
      </p>
    </div>
  );
}
