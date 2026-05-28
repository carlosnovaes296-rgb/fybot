import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Stats } from '../types';

interface TimeUnitProps {
  value: number;
  label: string;
}

function TimeUnit({ value, label }: TimeUnitProps) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center group-hover:bg-white/[0.07] transition-colors">
      <p className="text-lg font-black text-white font-mono leading-tight">{value.toString().padStart(2, '0')}</p>
      <p className="text-[7px] font-bold text-white uppercase tracking-tighter mt-0.5">{label}</p>
    </div>
  );
}

interface CompactCountdownProps {
  expiryDate: string;
  t: any;
}

export function CompactCountdown({ expiryDate, t }: CompactCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(expiryDate) - +new Date();
      if (difference > 0) {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        const s = Math.floor((difference / 1000) % 60);
        
        return `${d}d ${h}h ${m}m ${s}s ${t.dashboard.remaining}`;
      }
      return 'EXPIRED';
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [expiryDate, t]);

  return <span>{timeLeft}</span>;
}

interface LicenseCountdownProps {
  expiryDate: string;
  t: any;
}

export function LicenseCountdown({ expiryDate, t }: LicenseCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(expiryDate) - +new Date();
      if (difference > 0) {
        return {
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        };
      }
      return null;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [expiryDate]);

  return (
    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center group hover:border-white/10 transition-all">
      <div className="absolute top-0 right-0 p-4">
        <div className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
          <span className="text-[8px] font-black text-white tracking-widest uppercase">
            {t.dashboard.activeLicense}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
          <ShieldCheck size={12} className="text-white" /> {t.dashboard.licenseExpires}
        </p>
        
        <div className="grid grid-cols-4 gap-2">
          {timeLeft ? (
            <>
              <TimeUnit value={timeLeft.d} label={t.dashboard.days} />
              <TimeUnit value={timeLeft.h} label={t.dashboard.hrs} />
              <TimeUnit value={timeLeft.m} label={t.dashboard.min} />
              <TimeUnit value={timeLeft.s} label={t.dashboard.sec} />
            </>
          ) : (
            <div className="col-span-4 py-2">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">EXPIRED</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Visual background element */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 blur-3xl group-hover:bg-white/10 transition-all rounded-full" />
    </div>
  );
}

interface LicenseHeaderButtonProps {
  stats: Stats;
  t: any;
  onClick: () => void;
}

export function LicenseHeaderButton({ stats, t, onClick }: LicenseHeaderButtonProps) {
  if (!stats.activeLicense?.expiryDate) return null;
  
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0f0f12] border border-[#2d214d] rounded-full transition-all active:scale-95 group cursor-pointer shadow-lg shadow-black/40"
    >
      <span className="text-[10px] font-bold text-[#625e8a] font-mono tracking-tight">{t.dashboard.status}:</span>
      <span className="text-[10px] font-black text-[#00f2ff] font-mono tracking-tight uppercase">Start</span>
      <span className="text-[10px] font-medium text-[#7d79a1] font-mono tracking-tight ml-1 whitespace-nowrap">
        <CompactCountdown expiryDate={stats.activeLicense.expiryDate} t={t} />
      </span>
    </button>
  );
}
