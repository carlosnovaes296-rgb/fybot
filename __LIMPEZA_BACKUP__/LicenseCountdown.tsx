import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Stats } from '../types';

// Ano usado como marcador de licença vitalícia — centralizado para evitar
// divergência entre os componentes que precisam dessa checagem.
const LIFETIME_YEAR_THRESHOLD = 2090;

function isLifetimeLicense(expiryDate: string): boolean {
  return new Date(expiryDate).getFullYear() > LIFETIME_YEAR_THRESHOLD;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    alert('Licença copiada para a área de transferência!');
  } catch (err) {
    alert('Erro ao copiar. Por favor copie manualmente.');
  }
}

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
    const isLifetime = isLifetimeLicense(expiryDate);
    if (isLifetime) {
      setTimeLeft(t.plans?.lifetime || 'VITALÍCIO');
      return;
    }

    const calculateTimeLeft = () => {
      const difference = +new Date(expiryDate) - +new Date();
      if (difference > 0) {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        const s = Math.floor((difference / 1000) % 60);

        return `${d}d ${h}h ${m}m ${s}s ${t.dashboard?.remaining ?? ''}`;
      }
      return t.dashboard?.expired ?? 'EXPIRADO';
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
  licenseKey?: string;
}

export function LicenseCountdown({ expiryDate, t, licenseKey }: LicenseCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  const isLifetime = isLifetimeLicense(expiryDate);

  useEffect(() => {
    if (isLifetime) return;

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
  }, [expiryDate, isLifetime]);

  return (
    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center group hover:border-white/10 transition-all">
      <div className="absolute top-0 right-0 p-4">
        <div className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
          <span className="text-[8px] font-black text-white tracking-widest uppercase">
            {t.dashboard?.activeLicense}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
          <ShieldCheck size={12} className="text-white" /> {isLifetime ? 'STATUS DA LICENÇA' : t.dashboard?.licenseExpires}
        </p>

        {isLifetime ? (
          <div className="py-4 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 blur-2xl transform rotate-45 pointer-events-none" />
             <ShieldCheck size={28} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
             <div>
               <p className="text-xl font-black text-amber-400 uppercase tracking-widest leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ACESSO VITALÍCIO</p>
               <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest mt-1">Líder Institucional Pro</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {timeLeft ? (
              <>
                <TimeUnit value={timeLeft.d} label={t.dashboard?.days} />
                <TimeUnit value={timeLeft.h} label={t.dashboard?.hrs} />
                <TimeUnit value={timeLeft.m} label={t.dashboard?.min} />
                <TimeUnit value={timeLeft.s} label={t.dashboard?.sec} />
              </>
            ) : (
              <div className="col-span-4 py-2">
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                  {t.dashboard?.expired ?? 'EXPIRADO'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual background element */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 blur-3xl group-hover:bg-white/10 transition-all rounded-full pointer-events-none" />

      {/* License Key Display & Copy */}
      {licenseKey && (
        <div className="mt-4 pt-4 border-t border-white/5 z-10 relative">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
            MetaTrader 5 License Key
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/40 border border-green-500/30 rounded-lg px-3 py-2 text-xs text-[#00ff9d] font-mono tracking-wider overflow-hidden text-ellipsis shadow-[0_0_10px_rgba(0,255,157,0.1)]">
              {licenseKey}
            </code>
            <button
              onClick={() => copyToClipboard(licenseKey)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-3 py-2 text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
            >
              COPIAR
            </button>
          </div>
        </div>
      )}
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

  const isLifetime = isLifetimeLicense(stats.activeLicense.expiryDate);
  const statusLabel = isLifetime
    ? (t.plans?.lifetime ?? 'VITALÍCIO')
    : (t.dashboard?.active ?? 'ATIVO');

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0f0f12] border border-[#2d214d] rounded-full transition-all active:scale-95 group cursor-pointer shadow-lg shadow-black/40"
    >
      <span className="text-[10px] font-bold text-[#625e8a] font-mono tracking-tight">{t.dashboard?.status}:</span>
      <span className="text-[10px] font-black text-[#00f2ff] font-mono tracking-tight uppercase">{statusLabel}</span>
      <span className="text-[10px] font-medium text-[#7d79a1] font-mono tracking-tight ml-1 whitespace-nowrap">
        <CompactCountdown expiryDate={stats.activeLicense.expiryDate} t={t} />
      </span>
    </button>
  );
}
