import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 md:bottom-8 sm:max-w-sm z-50 flex items-center gap-3 bg-[#172337] text-white px-4 sm:px-5 py-3.5 rounded-2xl shadow-xl border border-white/10 animate-fade-in transition-all"
    >
      <div className="w-6 h-6 rounded-full bg-[#239B70]/20 text-[#239B70] flex items-center justify-center shrink-0">
        <CheckCircle2 size={16} />
      </div>
      <p className="text-xs sm:text-sm font-medium pr-1 break-words">{toastMessage}</p>
    </div>
  );
};
