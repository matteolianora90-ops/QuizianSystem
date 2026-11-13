import React from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Play, BellOff, X, Sparkles, CheckCircle2 } from 'lucide-react';

export const StudyReminderAlert: React.FC = () => {
  const { activeReminderAlert, dismissActiveReminderAlert, snoozeReminder, startGame, quizzes } = useApp();

  if (!activeReminderAlert) return null;

  const targetQuiz = quizzes.find((q) => q.id === activeReminderAlert.quizId) || quizzes[0];

  const handleStartReview = () => {
    dismissActiveReminderAlert();
    if (targetQuiz) {
      startGame(targetQuiz, 'solo');
    }
  };

  return (
    <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-3 sm:px-4 animate-bounce-in">
      <div className="bg-[#172337] text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#F47A18] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#F47A18]/30">
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                  Quizian Reminder
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-white/60">Study Time</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5 break-words">
                {activeReminderAlert.title}
              </h3>
              <p className="text-xs text-white/80 mt-1 leading-relaxed break-words">
                {activeReminderAlert.message}
              </p>
            </div>
          </div>

          <button
            onClick={dismissActiveReminderAlert}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="pt-3.5 mt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => snoozeReminder(10)}
            className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BellOff size={14} />
            <span>Snooze (10m)</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              onClick={dismissActiveReminderAlert}
              className="py-2 px-3 rounded-xl hover:bg-white/10 text-xs font-semibold text-white/70 transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={handleStartReview}
              className="py-2 px-3.5 sm:px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>Start Review Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
