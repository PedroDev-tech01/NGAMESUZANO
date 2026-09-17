import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirm-overlay"
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-24 px-4 z-50 overflow-y-auto"
      onClick={onCancel}
    >
      <div
        className="bg-[#14171C] rounded-lg border border-[#22262E] max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E51D24]"></span>
          <h3 id="confirm-title" className="text-[16px] font-bold text-white">
            {title}
          </h3>
        </div>
        <p id="confirm-text" className="text-[13.5px] text-[#9CA3AF] mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            id="confirm-cancel"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[13px] font-semibold border border-[#374151] rounded bg-transparent text-[#D1D5DB] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="confirm-ok"
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-bold uppercase tracking-wider rounded bg-[#E51D24] text-white hover:bg-[#C81018] shadow-[0_0_12px_rgba(229,29,36,0.3)] transition-colors cursor-pointer"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
};
