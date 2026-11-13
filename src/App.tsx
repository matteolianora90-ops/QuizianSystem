import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/common/Navigation';
import { Toast } from './components/common/Toast';
import { OfflineIndicator } from './components/common/OfflineIndicator';
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

const MainAppContent: React.FC = () => {
  const { user, activeTab, activeScreen, setActiveTab } = useApp();

  // Handle URL query parameters (e.g. ?challenge=XYZ123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeCode = params.get('challenge');
    if (challengeCode && user) {
      setActiveTab('challenge');
    }
  }, [user]);

  // If user is not authenticated, render Login / Sign Up screens full-page
  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <AuthScreens />
        <OfflineIndicator />
        <Toast />
      </div>
    );
  }

  // Active Game is full-screen focused mode
  if (activeScreen === 'game') {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <ActiveGame />
        <OfflineIndicator />
        <Toast />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--brand-cream)] flex flex-col md:flex-row text-[#202B3C] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Desktop Sidebar & Mobile Bottom Navigation */}
      <Navigation />

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0">
        <div key={`${activeScreen}-${activeTab}`} className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-8 pb-24 md:pb-10 animate-fade-in">
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
        </div>
      </main>

      {/* Study Reminder Alert Popover */}
      <StudyReminderAlert />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Global Notification Toast */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
