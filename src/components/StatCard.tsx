import React from 'react';
import { motion } from 'motion/react';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta: string;
  icon: React.ReactNode;
  valueClassName?: string;
}

export function StatCard({ label, value, delta, icon, valueClassName }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 transition-all border-hover:border-white/10 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div className="px-2 py-1 bg-white/10 border border-white/20 rounded-md">
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">{delta}</span>
        </div>
      </div>
      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">{label}</p>
      <h3 className={`text-2xl font-mono font-black tracking-tight ${valueClassName || 'text-white'}`}>{value}</h3>
    </motion.div>
  );
}
