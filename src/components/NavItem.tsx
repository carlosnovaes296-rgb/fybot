import React from 'react';

export interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10 font-bold' 
          : 'text-emerald-500 hover:bg-white/5 hover:text-emerald-400 active:text-emerald-400'
      }`}
    >
      <span className={`${active ? 'text-black' : 'group-hover:scale-110 group-hover:text-emerald-400'} transition-transform duration-200`}>
        {icon}
      </span>
      <span className="text-xl">{label}</span>
    </button>
  );
}
