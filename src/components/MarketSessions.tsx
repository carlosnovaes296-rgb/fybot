import { Clock } from 'lucide-react';
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

function PortugalFlag() {
  return (
    <div className="w-7 h-5 rounded-md overflow-hidden shrink-0 border border-white/10 relative">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        <rect width="40" height="70" fill="#006600" />
        <rect x="40" width="60" height="70" fill="#FF0000" />
        <circle cx="40" cy="35" r="10" fill="#FFD700" />
        <rect x="36" y="31" width="8" height="8" fill="#FFFFFF" rx="1" />
        <rect x="38" y="32" width="4" height="6" fill="#D2143A" rx="0.5" />
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

  return (
    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-[11px] text-white/50">
          <Clock size={14} className="text-blue-400" /> {title}
        </h3>
      </div>
      
      <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-black/40">
        <div className="overflow-x-auto scrollbar-none">
          <div className="min-w-[500px]">
            {/* Headers row */}
            <div className="grid grid-cols-4 border-b border-white/5 text-[9px] uppercase tracking-wider font-bold text-white/40 bg-white/[0.01]">
              <div className="p-3 pl-4 border-r border-white/5 flex items-center">
                {isEn ? 'REPRESENTATION' : isEs ? 'REPRESENTACIÓN' : 'REPRESENTAÇÃO'}
              </div>
              <div className="p-3 text-center border-r border-white/5 flex items-center justify-center">
                {isEn ? 'ASIAN SESSION' : isEs ? 'SESIÓN ASIÁTICA' : 'SESSÃO ASIÁTICA'}
              </div>
              <div className="p-3 text-center border-r border-white/5 flex items-center justify-center">
                {isEn ? 'EUROPEAN SESSION' : isEs ? 'SESIÓN EUROPEA' : 'SESSÃO EUROPEIA'}
              </div>
              <div className="p-3 text-center flex items-center justify-center">
                {isEn ? 'AMERICAN SESSION' : isEs ? 'SESIÓN AMERICANA' : 'SESSÃO AMERICANA'}
              </div>
            </div>

            {/* Brazil Row */}
            <div className="grid grid-cols-4 border-b border-white/5 items-center">
              <div className="flex items-center gap-3 p-3.5 pl-4 border-r border-white/5 bg-white/[0.01]">
                <BrazilFlag />
                <div className="leading-tight">
                  <p className="text-[11px] font-bold text-white tracking-wide">BRASIL</p>
                  <p className="text-[9px] font-mono font-medium text-white/40">(BRT)</p>
                </div>
              </div>
              <div className="p-3.5 text-center border-r border-white/5 text-xs font-mono font-bold text-white/80">
                21:00 - 06:00
              </div>
              <div className="p-3.5 text-center border-r border-white/5 text-xs font-mono font-bold text-white/80">
                04:00 - 13:00
              </div>
              <div className="p-3.5 text-center text-xs font-mono font-bold text-white/80">
                09:00 - 18:00
              </div>
            </div>

            {/* Portugal Row */}
            <div className="grid grid-cols-4 items-center">
              <div className="flex items-center gap-3 p-3.5 pl-4 border-r border-white/5 bg-white/[0.01]">
                <PortugalFlag />
                <div className="leading-tight">
                  <p className="text-[11px] font-bold text-white tracking-wide">PORTUGAL</p>
                  <p className="text-[9px] font-mono font-medium text-white/40">(WEST)</p>
                </div>
              </div>
              <div className="p-3.5 text-center border-r border-white/5 text-xs font-mono font-bold text-white/80">
                01:00 - 10:00
              </div>
              <div className="p-3.5 text-center border-r border-white/5 text-xs font-mono font-bold text-white/80">
                08:00 - 17:00
              </div>
              <div className="p-3.5 text-center text-xs font-mono font-bold text-white/80">
                13:00 - 22:00
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
