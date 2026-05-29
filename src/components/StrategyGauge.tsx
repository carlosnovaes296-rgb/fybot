import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export interface StrategyGaugeProps {
  label: string;
  percentage: number;
  color: string;
}

function getZoneLabel(pct: number) {
  if (pct >= 75) return { text: 'FORTE', color: '#10b981' };
  if (pct >= 40) return { text: 'NEUTRO', color: '#f59e0b' };
  return { text: 'FRACO', color: '#ef4444' };
}

export function StrategyGauge({ label, percentage, color }: StrategyGaugeProps) {
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimPct(percentage), 100);
    return () => clearTimeout(timeout);
  }, [percentage]);

  const size = 88;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (animPct / 100) * circumference;

  const zone = getZoneLabel(percentage);

  // Gradient stops from red → yellow → green based on percentage
  const gradStart = percentage >= 75 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#ef4444';
  const gradEnd = color;

  return (
    <div className="flex flex-col items-center p-4 bg-white/[0.03] rounded-2xl border border-white/5 group hover:border-white/10 transition-all hover:bg-white/[0.05] min-w-0">
      {/* Circular SVG Gauge */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 16 }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`gauge-grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradStart} />
              <stop offset="100%" stopColor={gradEnd} />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated foreground arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={`url(#gauge-grad-${label})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 4px ${color}60)`,
            }}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = ((tick / 100) * Math.PI) - Math.PI;
            const cx = size / 2 + (radius) * Math.cos(angle);
            const cy = size / 2 + (radius) * Math.sin(angle);
            return (
              <circle
                key={tick}
                cx={cx}
                cy={cy}
                r="1.5"
                fill="rgba(255,255,255,0.15)"
              />
            );
          })}
        </svg>

        {/* Center value */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <motion.span
            className="text-xl font-mono font-black"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {percentage}%
          </motion.span>
        </div>
      </div>

      {/* Label */}
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-2 text-center truncate w-full" title={label}>
        {label}
      </p>

      {/* Zone badge */}
      <div
        className="mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
        style={{
          color: zone.color,
          backgroundColor: `${zone.color}15`,
          border: `1px solid ${zone.color}30`,
        }}
      >
        {zone.text}
      </div>
    </div>
  );
}
