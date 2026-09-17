import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      id="toast"
      className="fixed bottom-6 right-6 bg-[#14171C] text-white px-4 py-3 rounded-lg text-[13px] font-semibold shadow-2xl border border-[#E51D24] flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <span className="w-2 h-2 rounded-full bg-[#E51D24] animate-pulse"></span>
      <span>{message}</span>
    </div>
  );
};
