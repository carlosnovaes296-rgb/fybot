import { motion } from 'motion/react';

export interface WeightControlProps {
  label: string;
  value: number;
  color: string;
  max?: number;
}

export function WeightControl({ label, value, color, max = 100 }: WeightControlProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest pl-1">
        <span className="text-white/40">{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
