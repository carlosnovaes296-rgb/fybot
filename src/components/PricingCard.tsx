import { CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

export interface PricingCardProps {
  title: string;
  price: number;
  recommended?: boolean;
  desc?: string;
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
    <div className={`relative flex flex-col h-full p-8 rounded-[40px] border transition-all ${
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
        <div className={`mb-8 rounded-2xl overflow-hidden border ${isVip ? 'border-[#f59e0b]/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'border-white/5 shadow-[0_0_30px_rgba(59,130,246,0.15)]'} relative aspect-[4/3] bg-black flex items-center justify-center p-4`}>
          <img src={image} alt={title} className="max-w-full max-h-full object-contain brightness-110 scale-[0.85]" />
        </div>
      )}

      <div className="mb-8">
        {title && <h3 className={`text-xl font-bold ${titleColor || ''}`}>{title}</h3>}
        {desc && <p className={`${descSize || 'text-xs'} mt-2 ${descColor || 'text-white/40'}`}>{desc}</p>}
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            {customPriceText ? (
              <span className={`text-4xl font-black ${isVip ? 'text-[#f59e0b]' : 'text-blue-400'}`}>{customPriceText}</span>
            ) : (
              <span className={`text-4xl font-black ${isVip ? 'text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''}`}>$ {price}</span>
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
            ? 'bg-gradient-to-b from-[#f59e0b]/30 to-[#f59e0b]/5 border border-[#f59e0b]/50 text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] hover:from-[#f59e0b]/40 hover:to-[#f59e0b]/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
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
