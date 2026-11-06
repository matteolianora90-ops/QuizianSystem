import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { StudyReminderConfig } from '../../types';
import { 
  User, 
  Mail, 
  Bell, 
  Palette, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Lock, 
  Check, 
  X, 
  School, 
  Sparkles,
  BookOpen,
  Volume2,
  Clock,
  Calendar,
  AlertCircle,
  BellRing
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { 
    user, 
    updateProfile, 
    updateReminderConfig, 
    triggerStudyReminder, 
    requestBrowserNotificationPermission, 
    browserPermission, 
    logout, 
    showToast 
  } = useApp();

  // Active modals
  const [activeModal, setActiveModal] = useState<
    'personal' | 'password' | 'notifications' | 'appearance' | 'help' | 'logout' | null
  >(null);

  // Personal Info Form
  const [name, setName] = useState(user?.name || 'Matteo Llanora');
  const [email, setEmail] = useState(user?.email || 'matteollanora@gmail.com');
  const [school, setSchool] = useState(user?.school || 'Polytechnic University of the Philippines');
  const [bio, setBio] = useState(user?.bio || 'Computer Science student • Preparing for Midterms 📚');

  // Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ isError: boolean; text: string } | null>(null);

  // Notification & Daily Reminder Settings Form
  const savedReminder = user?.settings?.reminderConfig || {
    enabled: true,
    time: '19:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goal: 'Daily Quiz Review & Active Recall',
    browserNotifications: false,
    soundEnabled: true,
  };

  const [reminderEnabled, setReminderEnabled] = useState(savedReminder.enabled);
  const [reminderTime, setReminderTime] = useState(savedReminder.time);
  const [reminderDays, setReminderDays] = useState<string[]>(savedReminder.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [reminderGoal, setReminderGoal] = useState(savedReminder.goal || 'Daily Quiz Review & Active Recall');
  const [reminderSound, setReminderSound] = useState(savedReminder.soundEnabled ?? true);
  const [browserNotify, setBrowserNotify] = useState(savedReminder.browserNotifications ?? false);

  const [challengeAlerts, setChallengeAlerts] = useState(user?.settings?.challengeAlerts ?? true);
  const [theme, setTheme] = useState(user?.settings?.theme || 'cream');

  const allWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const timePresets = [
    { label: 'Morning Boost', time: '08:00' },
    { label: 'Midday Review', time: '12:30' },
    { label: 'Afternoon', time: '15:30' },
    { label: 'Evening Cram', time: '19:30' },
    { label: 'Night Owl', time: '21:30' },
  ];

  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email, school, bio });
    setActiveModal(null);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ isError: true, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ isError: true, text: 'Passwords do not match.' });
      return;
    }
    setPasswordMsg({ isError: false, text: 'Password changed successfully.' });
    setTimeout(() => {
      setActiveModal(null);
      setPasswordMsg(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.');
    }, 1500);
  };

  const toggleDay = (day: string) => {
    setReminderDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // keep at least 1 day
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const setDaysPreset = (preset: 'everyday' | 'weekdays' | 'weekends') => {
    if (preset === 'everyday') setReminderDays(allWeekDays);
    if (preset === 'weekdays') setReminderDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    if (preset === 'weekends') setReminderDays(['Sat', 'Sun']);
  };

  const handleSaveRemindersAndNotifications = () => {
    if (!user) return;

    const newReminderConfig = {
      enabled: reminderEnabled,
      time: reminderTime,
      days: reminderDays,
      goal: reminderGoal.trim() || 'Daily Study Review',
      soundEnabled: reminderSound,
      browserNotifications: browserNotify,
    };

    updateReminderConfig(newReminderConfig);

    updateProfile({
      settings: {
        ...user.settings,
        notifications: reminderEnabled,
        challengeAlerts,
        studyReminders: reminderEnabled,
        soundEffects: reminderSound,
        theme: theme as any,
      },
    });

    setActiveModal(null);
    showToast(`Daily reminder saved for ${reminderTime} (${reminderDays.join(', ')})`);
  };

  const handleTestReminderNow = () => {
    triggerStudyReminder(
      '⏰ Daily Study Reminder (Test)',
      `Time for: "${reminderGoal || 'Daily Quiz Review'}"! Active recall boosts retention by 40%.`,
      true
    );
  };

  const handleBrowserPermissionRequest = async () => {
    const res = await requestBrowserNotificationPermission();
    if (res === 'granted') {
      setBrowserNotify(true);
    } else {
      setBrowserNotify(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <Header
        title="Your account and preferences"
        subtitle="Manage personal info, daily study reminders, appearance, and security."
      />

      {/* User Identity Card (Matching Prototype Page 4) */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-[#FFF0E3] text-[#F47A18] font-extrabold text-3xl flex items-center justify-center mx-auto shadow-sm border-2 border-white ring-4 ring-[#FFF0E3]">
          {user?.avatar || 'M'}
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#172337] font-['Outfit']">
            {user?.name || 'Matteo Llanora'}
          </h2>
          <p className="text-xs text-[#202B3C]/60 mt-0.5">
            {user?.email || 'matteollanora@gmail.com'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7F4EF] text-xs font-semibold text-[#172337] mt-2">
            <span>Student account</span>
            <span>•</span>
            <span className="text-[#F47A18]">{user?.school || 'Active Scholar'}</span>
          </div>
        </div>

        {user?.bio && (
          <p className="text-xs text-[#202B3C]/70 pt-2 border-t border-[#F0EEE9] max-w-sm mx-auto italic">
            "{user.bio}"
          </p>
        )}
      </div>

      {/* DAILY STUDY REMINDERS HIGHLIGHT CARD */}
      <div className="bg-gradient-to-br from-[#FFF0E3] to-[#ffe8d6] border border-[#F47A18]/30 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F47A18] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#F47A18]/30">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                Study Reminder
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  savedReminder.enabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {savedReminder.enabled ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <h3 className="font-extrabold text-base text-[#172337] mt-0.5 font-['Outfit']">
              {savedReminder.enabled
                ? `Everyday at ${savedReminder.time}`
                : 'Reminders Paused'}
            </h3>
            <p className="text-xs text-[#202B3C]/70 mt-0.5">
              {savedReminder.enabled
                ? `Days: ${savedReminder.days?.join(', ')} • ${savedReminder.goal}`
                : 'Turn on daily notifications to keep your study streak active.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setActiveModal('notifications')}
            className="py-2 px-3.5 rounded-xl bg-white hover:bg-[#F7F4EF] text-xs font-bold text-[#172337] border border-[#E8E4DC] shadow-xs cursor-pointer transition-all"
          >
            Configure
          </button>
          <button
            onClick={handleTestReminderNow}
            className="py-2 px-3 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
            title="Test study notification chime and alert immediately"
          >
            Test Now
          </button>
        </div>
      </div>

      {/* ACCOUNT PREFERENCES LIST (Prototype Page 4) */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border border-[#EBE7DF] shadow-xs space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#172337]/50 px-2 pb-1">
          ACCOUNT
        </div>

        {/* 1. Personal Information */}
        <button
          onClick={() => setActiveModal('personal')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F7F4EF] transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F4EF] group-hover:bg-[#FFF0E3] text-[#202B3C] group-hover:text-[#F47A18] flex items-center justify-center transition-colors">
              <User size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#172337]">
                Personal information
              </h4>
              <p className="text-xs text-[#202B3C]/60">
                Edit your name, school and email
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
        </button>

        {/* 2. Notifications & Daily Study Reminders */}
        <button
          onClick={() => setActiveModal('notifications')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F7F4EF] transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center transition-colors">
              <BellRing size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-[#172337]">
                  Daily Study Reminders & Alerts
                </h4>
                <span className="text-[10px] bg-[#F47A18] text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
                  Local
                </span>
              </div>
              <p className="text-xs text-[#202B3C]/60">
                Set daily review time, sound chime, and system notifications
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
        </button>

        {/* 3. Change Password */}
        <button
          onClick={() => setActiveModal('password')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F7F4EF] transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F4EF] group-hover:bg-[#FFF0E3] text-[#202B3C] group-hover:text-[#F47A18] flex items-center justify-center transition-colors">
              <Lock size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#172337]">
                Change Password
              </h4>
              <p className="text-xs text-[#202B3C]/60">
                Update account login credentials
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
        </button>

        {/* 4. Appearance */}
        <button
          onClick={() => setActiveModal('appearance')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F7F4EF] transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F4EF] group-hover:bg-[#FFF0E3] text-[#202B3C] group-hover:text-[#F47A18] flex items-center justify-center transition-colors">
              <Palette size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#172337]">
                Appearance
              </h4>
              <p className="text-xs text-[#202B3C]/60">
                Light, warm cream, or dark accents
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
        </button>

        {/* 5. Help and Support */}
        <button
          onClick={() => setActiveModal('help')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F7F4EF] transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F4EF] group-hover:bg-[#FFF0E3] text-[#202B3C] group-hover:text-[#F47A18] flex items-center justify-center transition-colors">
              <HelpCircle size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#172337]">
                Help and support
              </h4>
              <p className="text-xs text-[#202B3C]/60">
                FAQs, study guide, and contact
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
        </button>
      </div>

      {/* SEPARATE VISUALLY ISOLATED LOGOUT BUTTON (Prototype Page 4 & Page 1 Note: "Keep Log out at the bottom and visually separate from normal actions") */}
      <div className="pt-2">
        <button
          onClick={() => setActiveModal('logout')}
          className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-red-50/70 border border-red-200/80 text-red-600 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>

      {/* MODAL: DAILY STUDY REMINDERS & NOTIFICATION SETTINGS */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-4 overflow-hidden border border-[#EBE7DF]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center font-bold">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#172337] font-['Outfit']">
                    Daily Study Reminders
                  </h3>
                  <p className="text-xs text-[#202B3C]/60">
                    Set a routine to review your quizzes and boost memory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/60"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 flex-1 pr-1 text-xs">
              {/* Master Switch */}
              <div className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[#172337]">Enable Daily Study Reminder</p>
                  <p className="text-xs text-[#202B3C]/70 mt-0.5">
                    Automatically alerts you at your chosen review time
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F47A18]"></div>
                </label>
              </div>

              {/* Time Picker & Quick Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider">
                  Reminder Time
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm font-bold text-[#172337] focus:outline-none focus:border-[#F47A18]"
                    />
                  </div>
                  <span className="text-xs text-[#202B3C]/60 font-medium">24h format</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {timePresets.map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => setReminderTime(preset.time)}
                      className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        reminderTime === preset.time
                          ? 'bg-[#172337] text-white shadow-xs'
                          : 'bg-[#F0EEE9] text-[#202B3C]/70 hover:bg-[#E8E4DC]'
                      }`}
                    >
                      {preset.label} ({preset.time})
                    </button>
                  ))}
                </div>
              </div>

              {/* Days of Week Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider">
                    Repeat Days
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDaysPreset('weekdays')}
                      className="text-[#F47A18] font-bold hover:underline"
                    >
                      Weekdays
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('everyday')}
                      className="text-[#F47A18] font-bold hover:underline"
                    >
                      Everyday
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {allWeekDays.map((day) => {
                    const isSelected = reminderDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F47A18] text-white shadow-xs'
                            : 'bg-[#F7F4EF] text-[#202B3C]/60 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Study Goal / Custom Reminder Message */}
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                  Study Focus Goal
                </label>
                <input
                  type="text"
                  value={reminderGoal}
                  onChange={(e) => setReminderGoal(e.target.value)}
                  placeholder="e.g. 10-Min Active Recall for Midterm Exams"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-xs font-medium text-[#172337] focus:outline-none focus:border-[#F47A18]"
                />
              </div>

              {/* Delivery Channels */}
              <div className="space-y-2.5 pt-2 border-t border-[#F0EEE9]">
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider">
                  Notification Delivery
                </label>

                {/* System Browser Notifications */}
                <div className="p-3 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-[#172337]">System Web Notifications</p>
                    <p className="text-[11px] text-[#202B3C]/60">
                      Alerts through desktop or device OS notification center
                    </p>
                  </div>
                  {browserPermission === 'granted' ? (
                    <span className="text-[11px] font-bold text-[#239B70] flex items-center gap-1 bg-[#239B70]/10 px-2 py-0.5 rounded-md">
                      <Check size={12} strokeWidth={3} /> Allowed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBrowserPermissionRequest}
                      className="py-1 px-2.5 rounded-lg bg-[#172337] text-white text-[11px] font-bold hover:bg-[#202B3C]"
                    >
                      Allow Browser Alerts
                    </button>
                  )}
                </div>

                {/* Sound Chime */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] cursor-pointer">
                  <div>
                    <p className="font-bold text-xs text-[#172337]">Audio Chime on Reminder</p>
                    <p className="text-[11px] text-[#202B3C]/60">Plays a gentle Web Audio two-tone study chime</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderSound}
                    onChange={(e) => setReminderSound(e.target.checked)}
                    className="rounded text-[#F47A18] focus:ring-[#F47A18]"
                  />
                </label>

                {/* Challenge alerts */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] cursor-pointer">
                  <div>
                    <p className="font-bold text-xs text-[#172337]">Classmate Challenge Alerts</p>
                    <p className="text-[11px] text-[#202B3C]/60">Notifies you when someone challenges you</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={challengeAlerts}
                    onChange={(e) => setChallengeAlerts(e.target.checked)}
                    className="rounded text-[#F47A18] focus:ring-[#F47A18]"
                  />
                </label>
              </div>

              {/* Instant Test Button */}
              <div className="p-3.5 rounded-2xl bg-[#FFF0E3] border border-[#F47A18]/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-[#172337]">Want to test your reminder?</p>
                  <p className="text-[11px] text-[#202B3C]/70">
                    Triggers the sound, in-app banner, and system notification now.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestReminderNow}
                  className="py-1.5 px-3 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Test Notification
                </button>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="pt-3 border-t border-[#F0EEE9] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] text-xs font-bold text-[#202B3C]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRemindersAndNotifications}
                className="py-2.5 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERSONAL INFORMATION */}
      {activeModal === 'personal' && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <h3 className="font-bold text-lg text-[#172337]">Personal Information</h3>
              <button onClick={() => setActiveModal(null)} className="text-[#202B3C]/50 hover:text-[#172337]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePersonalInfo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">School / University</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">Bio / Goals</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] text-xs font-bold text-[#202B3C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#F47A18] text-white text-xs font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <h3 className="font-bold text-lg text-[#172337]">Change Password</h3>
              <button onClick={() => setActiveModal(null)} className="text-[#202B3C]/50 hover:text-[#172337]">
                <X size={18} />
              </button>
            </div>
            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  passwordMsg.isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}
            <form onSubmit={handleSavePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm focus:outline-none focus:border-[#F47A18]"
                />
              </div>
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] text-xs font-bold text-[#202B3C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#F47A18] text-white text-xs font-bold shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPEARANCE */}
      {activeModal === 'appearance' && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <h3 className="font-bold text-lg text-[#172337]">Appearance</h3>
              <button onClick={() => setActiveModal(null)} className="text-[#202B3C]/50 hover:text-[#172337]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { id: 'cream', name: 'Quizian Warm Cream (Official)', desc: '#F7F4EF calm background with orange accents' },
                { id: 'light', name: 'Crisp Studio White', desc: 'Minimal clean daylight aesthetic' },
                { id: 'dark', name: 'Deep Midnight Focus', desc: '#172337 navy backdrop for evening study sessions' },
              ].map((thm) => (
                <div
                  key={thm.id}
                  onClick={() => setTheme(thm.id as any)}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between ${
                    theme === thm.id ? 'bg-[#FFF0E3] border-[#F47A18]' : 'bg-[#F7F4EF] border-[#E8E4DC]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-[#172337]">{thm.name}</p>
                    <p className="text-[11px] text-[#202B3C]/60">{thm.desc}</p>
                  </div>
                  {theme === thm.id && <Check size={16} className="text-[#F47A18]" />}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                if (!user) return;
                updateProfile({
                  settings: {
                    ...user.settings,
                    theme: theme as any,
                  },
                });
                setActiveModal(null);
                showToast('Theme updated.');
              }}
              className="w-full py-2.5 rounded-xl bg-[#F47A18] text-white text-xs font-bold shadow-xs mt-2"
            >
              Apply Theme
            </button>
          </div>
        </div>
      )}

      {/* MODAL: HELP & SUPPORT */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col p-6 shadow-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <h3 className="font-bold text-lg text-[#172337]">Quizian Help & FAQs</h3>
              <button onClick={() => setActiveModal(null)} className="text-[#202B3C]/50 hover:text-[#172337]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 text-xs text-[#202B3C]/80 pr-1">
              <div className="p-3 rounded-2xl bg-[#F7F4EF]">
                <h4 className="font-bold text-[#172337] mb-1">How do Daily Study Reminders work?</h4>
                <p>
                  You can set your desired study time (e.g. 07:30 PM) and choose which days of the week to repeat. Quizian will notify you locally using gentle sound chimes, in-app study alerts, and optional browser desktop notifications.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F4EF]">
                <h4 className="font-bold text-[#172337] mb-1">How does AI Quiz Generation work?</h4>
                <p>
                  Quizian leverages Google Gemini 3.8 Flash to analyze lecture notes, textbook passages, or slides. It extracts central definitions and designs 4-choice questions, fill-in-the-blanks, and identification prompts.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F4EF]">
                <h4 className="font-bold text-[#172337] mb-1">How do I challenge a friend?</h4>
                <p>
                  Click "Challenge a friend", pick one of your saved quizzes, choose a time limit, and click "Create Challenge". Share the 6-character room code with your classmate to have them join in real-time.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF0E3] text-[#172337]">
                <h4 className="font-bold text-[#F47A18] mb-1">Need direct assistance?</h4>
                <p>
                  Reach our student success team at <span className="font-semibold underline">support@quizian.app</span>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#172337] text-white text-xs font-bold mt-2"
            >
              Close Help
            </button>
          </div>
        </div>
      )}

      {/* MODAL: LOG OUT CONFIRMATION */}
      {activeModal === 'logout' && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
              <LogOut size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#172337]">Log out of Quizian?</h3>
            <p className="text-xs text-[#202B3C]/70">
              You will be logged out of your student session. All saved quizzes and activities will remain stored on your device.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C]"
              >
                Stay Logged In
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  logout();
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
