import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Smartphone, Monitor, Wifi, Battery, Signal, Sparkles, Maximize2 } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const { viewMode, setViewMode } = useApp();
  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours % 12 || 12}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // If in desktop view mode, render children normally with a floating toggle button
  if (viewMode === 'desktop') {
    return (
      <div className="relative min-h-screen">
        {/* Floating Switcher to Phone View */}
        <aside aria-label="Device view switcher" className="fixed top-3 right-4 z-50 hidden md:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8E4DC] shadow-md text-xs font-bold text-[#172337]">
          <span className="text-[10px] uppercase tracking-wider text-[#202B3C]/50 font-extrabold mr-1">
            View:
          </span>
          <button
            onClick={() => setViewMode('phone')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF0E3] text-[#F47A18] hover:bg-[#ffe3cc] transition-all cursor-pointer font-extrabold"
            title="Switch to Phone View (Mobile Mockup)"
          >
            <Smartphone size={13} />
            <span>Phone View</span>
          </button>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#172337] text-white">
            <Monitor size={13} />
            <span>Desktop</span>
          </span>
        </aside>

        {children}
      </div>
    );
  }

  // PHONE VIEW MODE:
  // On desktop screens (md:), display the realistic smartphone frame.
  // On actual mobile devices (<md:), render full width without outer bezel.
  return (
    <div className="min-h-screen bg-[#EFEAE2] flex flex-col justify-between items-center text-[#202B3C] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Controls Toolbar for Desktop Users */}
      <header className="w-full max-w-4xl py-3 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#F47A18] flex items-center justify-center text-white font-bold text-sm shadow-xs font-['Outfit']">
            Q
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#172337] font-['Outfit']">
                Quizian Mobile
              </span>
              <span className="hidden sm:inline text-[10px] bg-[#239B70]/10 text-[#239B70] font-extrabold px-2 py-0.5 rounded-full">
                Phone View Active
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-[#202B3C]/60">
              iPhone 15 Pro • 390 × 844 px • Touch & scroll interactive
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#E8E4DC] shadow-xs text-xs font-bold">
          <button
            onClick={() => setViewMode('phone')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F47A18] text-white shadow-xs transition-all cursor-pointer"
          >
            <Smartphone size={14} />
            <span>Phone View</span>
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[#202B3C]/70 hover:text-[#172337] hover:bg-[#F7F4EF] transition-all cursor-pointer"
            title="Expand to Fullscreen Desktop View"
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Desktop View</span>
          </button>
        </div>
      </header>

      {/* Center Phone Frame Wrapper */}
      <div className="flex-1 w-full flex items-center justify-center p-0 md:p-4 md:pb-6">
        {/* PHYSICAL PHONE MOCKUP (Visible on desktop, fluid on real phones) */}
        <div className="w-full h-screen md:h-[844px] md:max-h-[90vh] md:w-[392px] bg-[#172337] md:rounded-[52px] md:p-[10px] shadow-2xl relative md:border-[4px] md:border-[#222E42] md:ring-1 md:ring-white/20 flex flex-col shrink-0 select-none">
          
          {/* Subtle phone hardware side buttons */}
          <div className="hidden md:block absolute -left-[7px] top-24 w-[3px] h-8 bg-[#2A374A] rounded-l-xs" />
          <div className="hidden md:block absolute -left-[7px] top-36 w-[3px] h-12 bg-[#2A374A] rounded-l-xs" />
          <div className="hidden md:block absolute -left-[7px] top-52 w-[3px] h-12 bg-[#2A374A] rounded-l-xs" />
          <div className="hidden md:block absolute -right-[7px] top-32 w-[3px] h-16 bg-[#2A374A] rounded-r-xs" />

          {/* INNER SMARTPHONE DISPLAY */}
          <div className="relative flex-1 bg-[#F7F4EF] md:rounded-[42px] overflow-hidden flex flex-col transform translate-z-0 border border-[#E8E4DC]/40">
            
            {/* Top Phone Status Bar & Dynamic Island */}
            <div className="shrink-0 pt-2 pb-1 px-6 flex items-center justify-between text-[#172337] z-50 bg-[#F7F4EF]/95 backdrop-blur-xs select-none">
              <span className="text-xs font-bold tracking-tight font-mono">
                {currentTime}
              </span>

              {/* Dynamic Island Pill */}
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-between px-2.5 shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] ring-1 ring-white/10 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#0055aa]/80" />
                </div>
                <div className="w-2 h-2 rounded-full bg-[#0d2a14] flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#239B70]/80" />
                </div>
              </div>

              {/* Icons: Signal, WiFi, Battery */}
              <div className="flex items-center gap-1.5 text-[#172337]">
                <Signal size={12} strokeWidth={2.5} />
                <Wifi size={12} strokeWidth={2.5} />
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] font-bold">100%</span>
                  <Battery size={13} strokeWidth={2.5} className="fill-current" />
                </div>
              </div>
            </div>

            {/* Inner Interactive App Screen (Scrollable) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col scroll-smooth">
              {children}
            </div>

            {/* Bottom Home Swipe Indicator Bar */}
            <div className="shrink-0 py-1.5 bg-white/95 border-t border-[#E8E4DC]/60 flex items-center justify-center z-50">
              <div className="w-32 h-1 bg-[#172337]/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Footer Info */}
      <footer className="hidden md:flex items-center gap-2 pb-3 text-xs text-[#202B3C]/50">
        <Sparkles size={13} className="text-[#F47A18]" />
        <span>Quizian Phone View • Review smarter, not harder</span>
      </footer>
    </div>
  );
};
