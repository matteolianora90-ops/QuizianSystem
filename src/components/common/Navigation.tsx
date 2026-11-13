import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { Home, BookOpen, Swords, Activity, User, Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface NavItem {
  id: ActiveTab;
  label: string;
  mobileLabel: string;
  icon: React.ElementType;
  badge?: number;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, user, quizzes, activities, activeScreen, setActiveScreen } = useApp();

  // Hide navigation during active gameplay
  if (activeScreen === 'game') {
    return null;
  }

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', mobileLabel: 'Home', icon: Home },
    { id: 'quizzes', label: 'My Quizzes', mobileLabel: 'Quizzes', icon: BookOpen, badge: quizzes.length },
    { id: 'challenge', label: 'Challenge', mobileLabel: 'Challenge', icon: Swords },
    { id: 'activity', label: 'Activity', mobileLabel: 'Activity', icon: Activity, badge: activities.length > 0 ? activities.length : undefined },
    { id: 'profile', label: 'Profile', mobileLabel: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-white border-r border-[#E8E4DC] h-screen sticky top-0 shrink-0 select-none z-30">
        {/* Brand Header */}
        <div className="p-5 lg:p-6 border-b border-[#F0EEE9]">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 text-left w-full cursor-pointer group"
          >
            <BrandLogo size="md" className="shadow-md shadow-[#F47A18]/15" />
            <div className="min-w-0">
              <span className="font-bold text-2xl tracking-tight text-[#172337] group-hover:text-[#F47A18] transition-colors block leading-none font-['Outfit']">
                Quizian
              </span>
              <span className="text-xs text-[#202B3C]/70 font-medium block truncate mt-0.5">
                Review smarter, not harder
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3.5 lg:px-4 py-5 space-y-1.5 overflow-y-auto" aria-label="Main navigation">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#172337]/50">
            Study Space
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && activeScreen === 'main';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all text-left cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-[#FFF0E3] text-[#F47A18] font-semibold shadow-xs'
                    : 'text-[#202B3C]/80 hover:bg-[#F7F4EF] hover:text-[#172337]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={20}
                    className={`shrink-0 transition-colors ${isActive ? 'text-[#F47A18]' : 'text-[#202B3C]/60'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 tabular-nums ${
                      isActive ? 'bg-[#F47A18] text-white' : 'bg-[#F0EEE9] text-[#202B3C]/70'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Create Quiz Banner in sidebar */}
          <div className="pt-5 space-y-2.5">
            <div className="bg-[#FFF0E3]/70 border border-[#F47A18]/20 rounded-2xl p-4 text-center">
              <div className="w-8 h-8 rounded-xl bg-[#F47A18]/10 text-[#F47A18] flex items-center justify-center mx-auto mb-2">
                <Sparkles size={18} />
              </div>
              <p className="text-xs font-semibold text-[#172337]">Need to study fast?</p>
              <p className="text-[11px] text-[#202B3C]/70 mt-0.5 mb-3">Turn notes or PDF into quizzes with AI</p>
              <button
                type="button"
                onClick={() => setActiveScreen('generate')}
                className="w-full py-2.5 px-3 bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Generate Quiz
              </button>
            </div>
            <PWAInstallButton variant="sidebar" />
          </div>
        </nav>

        {/* User Mini Profile Footer */}
        {user && (
          <div className="p-3.5 lg:p-4 border-t border-[#F0EEE9] bg-[#FAFAF8]">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#F47A18] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                {user.avatar || 'M'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#172337] truncate group-hover:text-[#F47A18] transition-colors">
                  {user.name}
                </p>
                <p className="text-xs text-[#202B3C]/60 truncate">Student Account</p>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E8E4DC] px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] z-40 shadow-lg"
      >
        <div className="grid grid-cols-5 gap-0.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && activeScreen === 'main';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative cursor-pointer min-h-[48px] ${
                  isActive
                    ? 'text-[#F47A18] font-bold bg-[#FFF0E3]/60'
                    : 'text-[#202B3C]/65 hover:text-[#172337]'
                }`}
              >
                <div className="relative">
                  <Icon size={20} className={isActive ? 'text-[#F47A18] stroke-[2.5]' : ''} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F47A18] text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] mt-1 font-medium truncate max-w-full">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
