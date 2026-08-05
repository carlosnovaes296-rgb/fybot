import { Language } from '../types';

export interface AffiliateLevelProps {
  level: number;
  percentage: number;
  label: string;
  color: string;
  language: Language;
}

export function AffiliateLevel({ level, percentage, label, color, language }: AffiliateLevelProps) {
  const glowClass = level === 1 
    ? "shadow-[0_0_25px_rgba(59,130,246,0.5)]" 
    : level === 2 
      ? "shadow-[0_0_20px_rgba(96,165,250,0.4)]" 
      : "shadow-[0_0_15px_rgba(168,85,247,0.3)]";
  
  return (
    <div className="group bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:border-white/10 transition-all">
      <div className="flex items-center gap-6">
        <div className={`w-12 h-12 rounded-2xl ${color} ${glowClass} flex items-center justify-center text-black font-black text-lg`}>
          {level}
        </div>
        <div>
          {/*
            CORRIGIDO: antes, a linha de baixo recalculava "Level {level}" /
            "Nível {level}" do zero a partir do número, ignorando a prop
            `label` que o App.tsx já envia pronta. Para os níveis 2 a 5, esse
            `label` já É "Tier 2"/"Nível 2" etc — ou seja, no idioma padrão
            (pt), a tela mostrava literalmente o MESMO texto duas vezes
            ("Nível 2" em cima e "Nível 2" embaixo). Agora o texto em destaque
            usa o `label` (conteúdo específico vindo do pai) e a linha pequena
            vira apenas um rótulo genérico de contexto, sem duplicar a frase.
          */}
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
            {language === 'en' ? `Level ${level}` : language === 'es' ? `Nivel ${level}` : `Nível ${level}`}
          </p>
          <p className="text-xl font-bold">{label}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-3xl font-black bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">{percentage}%</span>
      </div>
    </div>
  );
}
