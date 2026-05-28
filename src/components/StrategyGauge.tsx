import { motion } from 'motion/react';

export interface StrategyGaugeProps {
  label: string;
  percentage: number;
  color: string;
}

export function StrategyGauge({ label, percentage, color }: StrategyGaugeProps) {
  return (
    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 min-w-0">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 truncate" title={label}>{label}</span>
        <span className="text-xs font-mono font-bold shrink-0" style={{ color }}>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
