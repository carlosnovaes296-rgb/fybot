import { CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

export interface PricingCardProps {
  title: string;
  price: number;
  recommended?: boolean;
  desc: string;
  features: string[];
  language: Language;
  onBuy: () => void;
}

export function PricingCard({ title, price, recommended, desc, features, language, onBuy }: PricingCardProps) {
  return (
    <div className={`relative flex flex-col p-8 rounded-[40px] border transition-all ${
      recommended 
        ? 'bg-[#14141d] border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50' 
        : 'bg-[#0f0f12] border-white/5 hover:border-white/10'
    }`}>
      {recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-[2px] shadow-lg shadow-blue-900/40">
          {language === 'en' ? 'Recommended' : language === 'es' ? 'Recomendado' : 'Recomendado'}
        </div>
      )}
      
      <div className="mb-8">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-xs text-white/40 mt-2">{desc}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black">${price}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 mb-10">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <CheckCircle2 size={16} className="text-blue-500" />
            <span className="text-sm text-white/70">{f}</span>
          </div>
        ))}
      </div>

      <button 
        onClick={onBuy}
        className={`w-full py-5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
        recommended 
          ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20' 
          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
      }`}>
        {language === 'en' ? 'BUY NOW' : language === 'es' ? 'COMPRAR AHORA' : 'COMPRAR AGORA'}
      </button>
    </div>
  );
}
