import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta: string;
  icon: React.ReactNode;
  valueClassName?: string;
  labelClassName?: string;
  trend?: number[]; // sparkline data points
  trendPositive?: boolean;
  subLabel?: React.ReactNode;
}

// Sparkline mini SVG chart
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const w = 80, h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const color = positive ? '#10b981' : '#ef4444';
  const gradId = `spgrad-${Math.random().toString(36).slice(2)}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-80">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts[0]} ${polyline} ${w},${h}`}
        fill={`url(#${gradId})`}
      />
      <polyline points={polyline} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle
        cx={parseFloat(pts[pts.length - 1].split(',')[0])}
        cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r="2.5"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
}

// Animated counter hook
function useAnimatedValue(target: string | number) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    // Only animate numbers — skip if it's a string like "$10,000.00"
    if (typeof target === 'string') {
      setDisplay(target);
      prevRef.current = target;
      return;
    }
    const start = typeof prevRef.current === 'number' ? prevRef.current : target;
    const end = target;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (t < 1) requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    requestAnimationFrame(tick);
  }, [target]);

  return display;
}

export function StatCard({ label, value, delta, icon, valueClassName, labelClassName, trend, trendPositive, subLabel }: StatCardProps) {
  const isPositiveTrend = trendPositive !== undefined ? trendPositive : !String(value).startsWith('-');
  const glowColor = isPositiveTrend ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const borderGlow = isPositiveTrend ? 'hover:border-emerald-500/20' : 'hover:border-red-500/20';

  // Generate synthetic sparkline if none provided
  const sparkData = trend || Array.from({ length: 12 }, (_, i) => {
    const base = 50;
    return base + Math.sin(i * 0.7) * 15 + (isPositiveTrend ? i * 2 : -i * 1.5) + Math.random() * 8;
  });

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 20px 40px ${glowColor}` }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bg-[#0f0f12] border border-white/5 ${borderGlow} rounded-3xl p-6 transition-all shadow-2xl relative overflow-hidden group`}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
        style={{ background: `radial-gradient(ellipse at top right, ${glowColor}, transparent 70%)` }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-2 py-0.5 bg-white/10 border border-white/15 rounded-md flex items-center gap-1">
            {isPositiveTrend
              ? <TrendingUp size={9} className="text-emerald-400" />
              : <TrendingDown size={9} className="text-red-400" />
            }
            <span className="text-[15px] font-black text-white uppercase tracking-tighter">{delta}</span>
          </div>
          {/* Sparkline */}
          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparkData} positive={isPositiveTrend} />
          </div>
        </div>
      </div>

      {/* Label & value */}
      <div className="relative z-10">
        <p className={`text-[15px] font-black uppercase tracking-widest mb-1 ${labelClassName || 'text-white/40'}`}>{label}</p>
        <h3 className={`text-4xl font-mono font-black tracking-tight ${valueClassName || 'text-white'}`}>
          {value}
        </h3>
        {subLabel && <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold mt-1.5">{subLabel}</p>}
      </div>

      {/* Bottom glow line */}
      <div
        className={`absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-all duration-500`}
        style={{ background: isPositiveTrend ? 'linear-gradient(90deg, transparent, #10b981, transparent)' : 'linear-gradient(90deg, transparent, #ef4444, transparent)' }}
      />
    </motion.div>
  );
}
