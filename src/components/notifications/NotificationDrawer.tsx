import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Clock, 
  CheckCheck, 
  Trash2, 
  X, 
  Sparkles, 
  Play, 
  Settings, 
  ExternalLink 
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotifications, 
    user, 
    setActiveTab, 
    startGame, 
    quizzes,
    triggerStudyReminder 
  } = useApp();

  if (!isOpen) return null;

  const reminderConfig = user?.settings?.reminderConfig;

  return (
    <div className="fixed inset-0 z-50 bg-[#172337]/40 backdrop-blur-xs flex justify-end">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#EBE7DF] animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#F0EEE9] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center font-bold shrink-0">
              <Bell size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-[#172337] font-['Outfit'] truncate">
                Study Notifications
              </h3>
              <p className="text-xs text-[#202B3C]/60 truncate">Daily reminders & quiz alerts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/60 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Schedule Summary Banner */}
        <div className="p-4 bg-[#F7F4EF] border-b border-[#E8E4DC]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={16} className="text-[#F47A18] shrink-0" />
              <span className="text-xs font-bold text-[#172337]">Daily Reminder Status:</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                reminderConfig?.enabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {reminderConfig?.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>

          {reminderConfig?.enabled ? (
            <p className="text-xs text-[#202B3C]/70 mt-1 break-words">
              ⏰ Scheduled for <span className="font-bold text-[#172337]">{reminderConfig.time}</span> on{' '}
              <span className="font-semibold text-[#172337]">{reminderConfig.days?.join(', ')}</span>
            </p>
          ) : (
            <p className="text-xs text-[#202B3C]/60 mt-1">
              Reminders are currently paused. Enable them in settings.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-[#E8E4DC]/60">
            <button
              onClick={() => triggerStudyReminder(undefined, undefined, true)}
              className="py-1.5 px-2.5 rounded-lg bg-[#FFF0E3] hover:bg-[#ffe4cc] text-[#F47A18] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles size={12} />
              <span>Test Notification Now</span>
            </button>
            <button
              onClick={() => {
                onClose();
                setActiveTab('profile');
              }}
              className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-[#F0EEE9] text-[#202B3C] text-xs font-medium border border-[#E8E4DC] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Settings size={12} />
              <span>Customize Time</span>
            </button>
          </div>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#172337]/60">
              Recent Alerts ({notifications.length})
            </span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-[11px] font-semibold text-[#F47A18] hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
                <span className="text-gray-300">•</span>
                <button
                  onClick={clearNotifications}
                  className="text-[11px] font-semibold text-[#202B3C]/50 hover:text-red-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[#202B3C]/50 text-xs">
              <Bell size={32} className="mx-auto mb-2 text-[#202B3C]/20" />
              <p>No notifications right now.</p>
              <p className="text-[11px] mt-1">Study reminders will appear here when scheduled.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                  notif.read
                    ? 'bg-white border-[#E8E4DC] text-[#202B3C]/80'
                    : 'bg-[#FFF0E3]/40 border-[#F47A18]/40 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#F47A18] shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-[#172337]">{notif.title}</h4>
                  </div>
                  <span className="text-[10px] text-[#202B3C]/40 shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-[#202B3C]/70 leading-relaxed pl-4">
                  {notif.message}
                </p>

                {notif.type === 'study_reminder' && (
                  <div className="pt-2 pl-4 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        const quiz = quizzes[0];
                        if (quiz) startGame(quiz, 'solo');
                      }}
                      className="py-1 px-2.5 rounded-lg bg-[#F47A18] hover:bg-[#e0690f] text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Play size={10} fill="currentColor" />
                      <span>Review Now</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#F0EEE9] bg-[#FAFAF8] flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              setActiveTab('profile');
            }}
            className="text-xs font-semibold text-[#172337] hover:text-[#F47A18] flex items-center gap-1.5 transition-colors"
          >
            <Settings size={14} />
            <span>Reminder Preferences</span>
          </button>
          <button
            onClick={onClose}
            className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] text-xs font-bold text-[#202B3C] hover:bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
