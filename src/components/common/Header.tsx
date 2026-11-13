import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell } from 'lucide-react';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

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
      <header className="pb-5 mb-2 border-b border-[#EBE7DF] space-y-3">
        {/* Top bar with mobile branding and quick user controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 text-left cursor-pointer"
          >
            <BrandLogo size="sm" className="md:hidden" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
              Quizian
            </span>
            <span className="text-xs text-[#202B3C]/40 hidden sm:inline">•</span>
            <span className="text-xs text-[#202B3C]/60 font-medium hidden sm:inline">
              Review smarter, not harder
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="md:hidden">
              <PWAInstallButton variant="compact" />
            </div>
            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative w-10 h-10 rounded-full bg-white hover:bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C]/70 hover:text-[#172337] flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Study Notifications"
              aria-label="Open study notifications"
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F47A18] text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* User Profile Avatar */}
            {user && (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="w-10 h-10 rounded-full bg-[#F47A18] text-white font-bold flex items-center justify-center text-sm shadow-sm hover:ring-2 hover:ring-[#F47A18]/30 transition-all cursor-pointer"
                title="View Profile"
                aria-label="View profile"
              >
                {user.avatar || 'M'}
              </button>
            )}
          </div>
        </div>

        {/* Title, Subtitle, and Optional Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pt-0.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#172337] tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#202B3C]/70 mt-1 leading-relaxed">{subtitle}</p>
          </div>

          {actionButton && (
            <div className="shrink-0 pt-1 sm:pt-0 self-start sm:self-end">
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
