import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Sparkles, Trophy } from 'lucide-react';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

interface HeaderProps {
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  const { user, setActiveTab, unreadNotificationsCount } = useApp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <header className="pb-5 mb-3 border-b border-[#EBE7DF] space-y-3">
        {/* Top bar with branding and quick user controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F47A18] text-white font-extrabold flex items-center justify-center text-xs shadow-xs md:hidden">
              Q
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
              Quizian
            </span>
            <span className="text-xs text-[#202B3C]/40 hidden sm:inline">•</span>
            <span className="text-xs text-[#202B3C]/60 font-medium hidden sm:inline">Review smarter, not harder</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C]/70 hover:text-[#172337] flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Study Notifications"
            >
              <Bell size={17} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F47A18] text-white text-[9px] sm:text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* User Profile Avatar */}
            {user && (
              <button
                onClick={() => setActiveTab('profile')}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F47A18] text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-sm hover:ring-2 hover:ring-[#F47A18]/30 transition-all cursor-pointer"
                title="View Profile"
              >
                {user.avatar || 'M'}
              </button>
            )}
          </div>
        </div>

        {/* Title, Subtitle, and Optional Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#172337] tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#202B3C]/70 mt-1 leading-relaxed">{subtitle}</p>
          </div>

          {actionButton && (
            <div className="shrink-0 pt-1 sm:pt-0">
              {actionButton}
            </div>
          )}
        </div>
      </header>

      {/* Slide-out Notification Drawer */}
      <NotificationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
};
