import { CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

export interface PricingCardProps {
  title: string;
  price: number;
  recommended?: boolean;
  desc: string;
  features: string[];
  language: Language;
  image?: string;
  hideButton?: boolean;
  largeFeatures?: boolean;
  customPriceText?: string;
  priceSubtext?: string;
  titleColor?: string;
  descColor?: string;
  descSize?: string;
  onBuy?: () => void;
  isVip?: boolean;
}

export function PricingCard({ title, price, recommended, desc, features, language, image, hideButton, largeFeatures, customPriceText, priceSubtext, titleColor, descColor, descSize, onBuy, isVip }: PricingCardProps) {
  return (
    <div className={`relative flex flex-col p-8 rounded-[40px] border transition-all ${
      isVip
        ? 'bg-[#14141d] border-[#f59e0b]/50 shadow-[0_0_50px_rgba(245,158,11,0.15)] ring-1 ring-[#f59e0b]/50'
        : recommended 
        ? 'bg-[#14141d] border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50' 
        : 'bg-[#0f0f12] border-white/5 hover:border-white/10'
    }`}>
      {recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-[2px] shadow-lg shadow-blue-900/40">
          {language === 'en' ? 'Recommended' : language === 'es' ? 'Recomendado' : 'Recomendado'}
        </div>
      )}
      
      {image && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-white/5 relative h-48 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          {isVip && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[#f59e0b] drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
              </svg>
            </div>
          )}
          <img src={image} alt={title} className="w-full h-full object-cover brightness-110" />
        </div>
      )}

      <div className="mb-8">
        {title && <h3 className={`text-xl font-bold ${titleColor || ''}`}>{title}</h3>}
        <p className={`${descSize || 'text-xs'} mt-2 ${descColor || 'text-white/40'}`}>{desc}</p>
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            {customPriceText ? (
              <span className={`text-4xl font-black ${isVip ? 'text-[#f59e0b]' : 'text-blue-400'}`}>{customPriceText}</span>
            ) : (
              <span className="text-4xl font-black">${price}</span>
            )}
          </div>
          {priceSubtext && (
            <span className="text-sm font-bold text-white/50">{priceSubtext}</span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 mb-10">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <CheckCircle2 size={largeFeatures ? 20 : 16} className={isVip ? 'text-[#f59e0b]' : 'text-blue-500'} />
            <span className={`${largeFeatures ? 'text-xl font-bold text-white/90' : 'text-sm text-white/70'}`}>{f}</span>
          </div>
        ))}
      </div>

      {!hideButton && onBuy && (
        <button 
          onClick={onBuy}
          className={`w-full py-5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
          isVip
            ? 'bg-[#f59e0b] text-black hover:bg-[#d97706] shadow-xl shadow-[#f59e0b]/20'
            : recommended 
            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20' 
            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
        }`}>
          {language === 'en' ? 'BUY NOW' : language === 'es' ? 'COMPRAR AHORA' : 'COMPRAR AGORA'}
        </button>
      )}
    </div>
  );
}
