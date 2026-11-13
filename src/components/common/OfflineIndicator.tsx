import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(!isOnline);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowReconnected(false);
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-4 z-40 max-w-[calc(100vw-2rem)] pointer-events-none"
    >
      {!isOnline ? (
        <div className="pointer-events-auto inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#172337] text-white text-xs font-semibold shadow-lg border border-white/10">
          <span className="w-6 h-6 rounded-lg bg-[#F47A18]/20 text-[#F47A18] flex items-center justify-center shrink-0">
            <WifiOff size={14} />
          </span>
          <span className="leading-snug">
            Offline Mode &bull; Saved quizzes &amp; study materials available
          </span>
        </div>
      ) : (
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#239B70] text-white text-xs font-semibold shadow-lg">
          <Wifi size={14} className="shrink-0" />
          <span>Back online &bull; All features available</span>
        </div>
      )}
    </div>
  );
};
