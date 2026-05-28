import React from 'react';

export interface BenefitCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export function BenefitCard({ title, desc, icon }: BenefitCardProps) {
  return (
    <div className="bg-[#0f0f12] border border-white/5 p-8 rounded-[32px] hover:bg-[#141418] transition-colors border-hover:border-white/10">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
    </div>
  );
}

export function BenefitItem({ title, desc, icon }: BenefitCardProps) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-[11px] text-white/40 leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}
