import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', desc: 'Nova Ordem de Serviço' },
    { key: 'C', desc: 'Novo Cliente' },
    { key: 'P', desc: 'Painel / Dashboard' },
    { key: 'O', desc: 'Lista de Ordens' },
    { key: 'L', desc: 'Lista de Clientes' },
    { key: 'G', desc: 'Gráficos & Fluxo Mensal' },
    { key: 'T', desc: 'Alternar Tema (Claro / Escuro)' },
    { key: '/', desc: 'Focar campo de busca' },
    { key: 'Ctrl + K', desc: 'Abrir busca rápida' },
    { key: 'Esc', desc: 'Fechar modais / cancelar' },
  ];

  return (
    <div
      id="shortcuts-modal-overlay"
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#14171C] border border-[#22262E] rounded-xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#22262E] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E51D24]/15 border border-[#E51D24]/30 flex items-center justify-center text-[#E51D24]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Atalhos de Teclado</h3>
              <p className="text-xs text-[#9CA3AF]">Navegue e execute ações sem tocar no mouse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#9CA3AF] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5 px-2.5 rounded bg-[#101216] border border-[#22262E]"
            >
              <span className="text-[13px] text-[#D1D5DB]">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#1C2028] border border-[#374151] font-mono text-[12px] font-bold text-[#E51D24] shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-[#22262E] text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
