import { motion } from 'motion/react';

export interface WeightControlProps {
  label: string;
  value: number;
  color: string;
  max?: number;
  onChange?: (value: number) => void;
}

export function WeightControl({ label, value, color, max = 100, onChange }: WeightControlProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest pl-1">
        <span className="text-white/40">{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="relative h-1.5 w-full bg-white/5 rounded-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
          style={{ backgroundColor: color }}
        />
        {onChange && (
          <input 
            type="range" 
            min="0" 
            max={max} 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  );
}
