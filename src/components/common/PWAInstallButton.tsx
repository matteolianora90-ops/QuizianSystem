import React, { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'sidebar' }) => {
  const { shouldShowInstallUI, triggerInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!shouldShowInstallUI) {
    return null;
  }

  const handleClick = async () => {
    const result = await triggerInstall();
    if (result === 'ios') {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#E8E4DC] bg-white hover:bg-[#FFF0E3]/70 hover:border-[#F47A18]/40 text-[#172337] text-xs font-bold transition-all cursor-pointer"
        >
          <Download size={14} className="text-[#F47A18]" />
          <span>Install Offline App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="h-10 px-3 rounded-full bg-white hover:bg-[#FFF0E3] border border-[#E8E4DC] hover:border-[#F47A18]/40 text-[#172337] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          title="Install Quizian for offline access"
          aria-label="Install Quizian app"
        >
          <Download size={15} className="text-[#F47A18]" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#EBE7DF] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center shrink-0">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#172337]">Install Quizian</h3>
                  <p className="text-xs text-[#202B3C]/65">Access quizzes &amp; notes offline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer"
                aria-label="Close install instructions"
              >
                <X size={16} />
              </button>
            </div>

            <ol className="space-y-2.5 text-xs text-[#202B3C]/80 bg-[#F7F4EF] rounded-2xl p-4 border border-[#E8E4DC]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#F47A18]">1.</span>
                <span>
                  Tap the <Share size={13} className="inline mx-0.5 text-[#172337]" /> <strong>Share</strong> button in Safari&apos;s toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#F47A18]">2.</span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#F47A18]">3.</span>
                <span>
                  Tap <strong>Add</strong> to save Quizian to your home screen for offline studying.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
