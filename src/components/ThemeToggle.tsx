import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: (targetTheme?: 'dark' | 'light') => void;
  variant?: 'header' | 'sidebar' | 'compact';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  variant = 'header',
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      id="theme-control-container"
      className={`inline-flex items-center p-1 rounded-xl select-none transition-all ${
        variant === 'sidebar'
          ? 'w-full bg-[#14171C] border border-[#22262E]'
          : 'bg-[#14171C] border border-[#22262E] shadow-xs'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Botão Tema Escuro */}
      <button
        id="btn-tema-escuro"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDark) onToggle('dark');
        }}
        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          variant === 'sidebar' ? 'flex-1' : ''
        } ${
          isDark
            ? 'bg-[#E51D24] text-white shadow-sm shadow-[#E51D24]/30'
            : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]'
        }`}
        title="Ativar Tema Escuro"
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-[#9CA3AF]'}`} />
        <span>Escuro</span>
      </button>

      {/* Botão Tema Claro */}
      <button
        id="btn-tema-claro"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isDark) onToggle('light');
        }}
        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          variant === 'sidebar' ? 'flex-1' : ''
        } ${
          !isDark
            ? 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/30'
            : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]'
        }`}
        title="Ativar Tema Claro"
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-black' : 'text-[#9CA3AF]'}`} />
        <span>Claro</span>
      </button>
    </div>
  );
};
