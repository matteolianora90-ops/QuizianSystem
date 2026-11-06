import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/common/Navigation';
import { Toast } from './components/common/Toast';
import { StudyReminderAlert } from './components/notifications/StudyReminderAlert';
import { AuthScreens } from './components/auth/AuthScreens';
import { HomeDashboard } from './components/home/HomeDashboard';
import { MyQuizzes } from './components/quizzes/MyQuizzes';
import { ChallengeView } from './components/challenge/ChallengeView';
import { ActivityPage } from './components/activity/ActivityPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { GenerateQuizModal } from './components/quizzes/GenerateQuizModal';
import { ActiveGame } from './components/game/ActiveGame';
import { ResultsScreen } from './components/results/ResultsScreen';
import { PhoneFrame } from './components/common/PhoneFrame';

const MainAppContent: React.FC = () => {
  const { user, activeTab, activeScreen, setActiveTab, viewMode } = useApp();

  // Handle URL query parameters (e.g. ?challenge=XYZ123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeCode = params.get('challenge');
    if (challengeCode && user) {
      setActiveTab('challenge');
    }
  }, [user]);

  // If user is not authenticated, render Login / Sign Up screens
  if (!user) {
    return (
      <PhoneFrame>
        <AuthScreens />
        <Toast />
      </PhoneFrame>
    );
  }

  // Active Game is full-screen focused mode (per prototype guidelines)
  if (activeScreen === 'game') {
    return (
      <PhoneFrame>
        <ActiveGame />
        <Toast />
      </PhoneFrame>
    );
  }

  // When Phone View is active
  if (viewMode === 'phone') {
    return (
      <PhoneFrame>
        <div className="flex-1 flex flex-col min-h-0 bg-[#F7F4EF]">
          {/* Scrollable Main Content Container */}
          <main className="flex-1 px-3.5 py-4 overflow-y-auto pb-4">
            {activeScreen === 'generate' && <GenerateQuizModal />}
            {activeScreen === 'results' && <ResultsScreen />}
            {activeScreen === 'main' && (
              <>
                {activeTab === 'home' && <HomeDashboard />}
                {activeTab === 'quizzes' && <MyQuizzes />}
                {activeTab === 'challenge' && <ChallengeView />}
                {activeTab === 'activity' && <ActivityPage />}
                {activeTab === 'profile' && <ProfilePage />}
              </>
            )}
          </main>

          {/* Docked Mobile Bottom Navigation */}
          <Navigation />

          {/* Study Reminder Alert Popover */}
          <StudyReminderAlert />

          {/* Global Notification Toast */}
          <Toast />
        </div>
      </PhoneFrame>
    );
  }

  // Desktop Fullscreen View
  return (
    <PhoneFrame>
      <div className="min-h-screen bg-[#F7F4EF] flex flex-col md:flex-row text-[#202B3C] font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Desktop Sidebar & Mobile Bottom Navigation */}
        <Navigation />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 overflow-y-auto pb-24 md:pb-8">
          {activeScreen === 'generate' && <GenerateQuizModal />}
          {activeScreen === 'results' && <ResultsScreen />}
          {activeScreen === 'main' && (
            <>
              {activeTab === 'home' && <HomeDashboard />}
              {activeTab === 'quizzes' && <MyQuizzes />}
              {activeTab === 'challenge' && <ChallengeView />}
              {activeTab === 'activity' && <ActivityPage />}
              {activeTab === 'profile' && <ProfilePage />}
            </>
          )}
        </main>

        {/* Study Reminder Alert Popover */}
        <StudyReminderAlert />

        {/* Global Notification Toast */}
        <Toast />
      </div>
    </PhoneFrame>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
