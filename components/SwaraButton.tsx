import React from 'react';
import { Swara } from '../constants';

interface SwaraButtonProps {
  swara: Swara;
  isActive: boolean;
  onClick: (swara: Swara) => void;
}

export const SwaraButton: React.FC<SwaraButtonProps> = ({ swara, isActive, onClick }) => {
  return (
    <button
      onClick={() => onClick(swara)}
      className={`
        relative w-full h-16 md:h-20 flex flex-col items-center justify-center rounded-xl
        transition-all duration-200 ease-out select-none touch-manipulation
        ${isActive 
          ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-105 border border-indigo-300 z-10' 
          : 'bg-slate-800 hover:bg-slate-700 shadow-md border border-slate-700'}
      `}
      aria-pressed={isActive}
    >
      <span className={`text-xl md:text-2xl font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
        {swara.label}
      </span>
      <span className={`text-[10px] uppercase tracking-wider font-semibold ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
        {swara.shortLabel}
      </span>
    </button>
  );
};