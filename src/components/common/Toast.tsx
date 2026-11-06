import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-3 bg-[#172337] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/10 animate-fade-in transition-all">
      <div className="w-6 h-6 rounded-full bg-[#239B70]/20 text-[#239B70] flex items-center justify-center shrink-0">
        <CheckCircle2 size={16} />
      </div>
      <p className="text-sm font-medium pr-2">{toastMessage}</p>
    </div>
  );
};
