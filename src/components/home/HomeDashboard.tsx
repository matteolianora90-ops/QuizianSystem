import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { StudyHeroIllustration } from '../common/EducationalIllustrations';
import { WeeklyProgressChart } from './WeeklyProgressChart';
import {
  getCategoryVisual,
  getDailyStudyMotivation,
  getTimeGreeting,
} from '../../utils/categoryVisuals';
import {
  Sparkles,
  Swords,
  ChevronRight,
  Play,
  Upload,
  CheckCircle2,
  Flame,
  ArrowRight,
  Award,
  Layers,
  Target,
  Lightbulb
} from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const {
    user,
    quizzes,
    activities,
    setActiveTab,
    setActiveScreen,
    startGame,
    setSelectedQuizForChallenge,
    setPreviewQuiz,
  } = useApp();

  const completedSessions = activities.length;
  const totalChallenges = activities.filter((a) => a.type === 'challenge').length;
  const totalQuestionsPracticed = activities.reduce((sum, a) => sum + a.totalQuestions, 0);
  const totalBankQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);
  const avgAccuracy =
    activities.length > 0
      ? Math.round(activities.reduce((acc, a) => acc + a.accuracy, 0) / activities.length)
      : 85;

  const recentQuiz = quizzes[0];
  const recentActivity = activities[0];
  const firstName = (user?.name || 'Student').split(' ')[0];
  const dailyMotivation = getDailyStudyMotivation(5);

  const achievements = [
    {
      label: 'Quizzes Created & Saved',
      current: quizzes.length,
      target: 5,
      icon: Layers,
    },
    {
      label: 'Challenges Won (#1)',
      current: activities.filter((a) => a.type === 'challenge' && a.rank === 1).length,
      target: 3,
      icon: Award,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header with Friendly Greeting */}
      <Header
        title={`${getTimeGreeting()}, ${firstName}`}
        subtitle="Track your weekly review progress, practice active recall, and challenge classmates."
      />

      {/* Main Hero Card + Educational Illustration + Daily Motivation */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F47A18] via-[#ec7010] to-[#d45f08] rounded-3xl p-5 sm:p-6 md:p-8 text-white shadow-lg shadow-[#F47A18]/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/18 backdrop-blur-xs text-xs font-semibold">
              <Sparkles size={14} className="text-[#FFF0E3]" />
              <span>AI-Powered Active Recall Studio</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Outfit'] leading-tight">
                Ready to level up your study session?
              </h2>
              <p className="text-[#FFF0E3] text-sm md:text-base mt-1.5 leading-relaxed">
                Turn lecture notes, PDFs, or Word documents into multi-format quizzes in seconds and test your retention with friends.
              </p>
            </div>

            {/* Daily Study Motivation Strip */}
            <div className="p-3 rounded-2xl bg-[#172337]/20 border border-white/15 flex items-start gap-2.5 text-xs text-[#FFF0E3]">
              <Lightbulb size={16} className="text-amber-200 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-white">Daily Motivation:</strong> {dailyMotivation}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setActiveScreen('generate')}
                className="py-3 px-5 sm:px-6 rounded-2xl bg-white text-[#F47A18] font-bold text-sm shadow-md hover:bg-[#FFF0E3] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Upload size={18} />
                <span>+ Create a quiz</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (recentQuiz) {
                    setSelectedQuizForChallenge(recentQuiz);
                  }
                  setActiveTab('challenge');
                }}
                className="py-3 px-5 rounded-2xl bg-[#172337] hover:bg-[#202B3C] text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Swords size={18} className="text-[#F47A18]" />
                <span>Challenge a friend</span>
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center shrink-0">
            <StudyHeroIllustration className="w-56 lg:w-64 h-auto drop-shadow-md" />
          </div>
        </div>

        {/* Soft ambient glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Enhanced Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 tabular-nums">
        <div className="quizian-card bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#202B3C]/60 truncate">
              Completed Quizzes
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172337] font-['Outfit']">
            {completedSessions}
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">
            {totalChallenges} multiplayer · {quizzes.length} saved decks
          </p>
        </div>

        <div className="quizian-card bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#202B3C]/60 truncate">
              Total Questions
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#172337]/8 text-[#172337] flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172337] font-['Outfit']">
            {totalQuestionsPracticed}
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">
            Practiced ({totalBankQuestions} ready in bank)
          </p>
        </div>

        <div className="quizian-card bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#202B3C]/60 truncate">
              Avg. Accuracy
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#239B70]/12 text-[#239B70] flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#239B70] font-['Outfit']">
            {avgAccuracy}%
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#F7F4EF] overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-[#239B70] transition-all duration-500"
              style={{ width: `${Math.min(100, avgAccuracy)}%` }}
            />
          </div>
        </div>

        <div className="quizian-card bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#202B3C]/60 truncate">
              Study Streak
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center shrink-0">
              <Flame size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172337] font-['Outfit']">
            5 Days
          </div>
          <p className="text-[11px] text-[#239B70] font-semibold mt-1">
            Active daily consistency
          </p>
        </div>
      </div>

      {/* Weekly Learning Progress Chart + Achievements & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklyProgressChart activities={activities} />
        </div>

        {/* Right Column: Recent Activity & Progress Milestones */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <h3 className="text-sm font-extrabold text-[#172337] font-['Outfit']">
                Latest Session
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className="text-xs font-bold text-[#F47A18] hover:underline cursor-pointer"
              >
                See all
              </button>
            </div>

            {recentActivity ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#239B70] flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Completed
                  </span>
                  <span className="text-[11px] text-[#202B3C]/50">{recentActivity.date}</span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#172337] leading-snug">
                    {recentActivity.quizTitle}
                  </h4>
                  <p className="text-xs text-[#202B3C]/70 mt-1 tabular-nums">
                    <strong className="text-[#239B70]">{recentActivity.accuracy}% accuracy</strong>
                    <span className="mx-1.5">·</span>
                    <strong className="text-[#F47A18]">{recentActivity.score} pts</strong>
                  </p>
                </div>

                <p className="text-xs text-[#202B3C]/65 leading-relaxed">
                  {recentActivity.type === 'challenge'
                    ? `Placed #${recentActivity.rank || 1} in multiplayer challenge`
                    : `Answered ${recentActivity.correctCount}/${recentActivity.totalQuestions} questions correctly`}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center text-[#202B3C]/60 text-xs">
                No activity yet. Start your first quiz review!
              </div>
            )}

            {/* Achievement Progress */}
            <div className="pt-3 border-t border-[#F0EEE9] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#172337]/70">
                <Award size={14} className="text-[#F47A18]" />
                <span>Study Milestones</span>
              </div>
              {achievements.map((ach, idx) => {
                const Icon = ach.icon;
                const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="font-semibold text-[#172337] flex items-center gap-1.5">
                        <Icon size={13} className="text-[#F47A18]" />
                        {ach.label}
                      </span>
                      <span className="font-bold text-[#202B3C]/70">
                        {Math.min(ach.current, ach.target)}/{ach.target}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F7F4EF] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#F47A18] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70 mb-3 px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => setActiveScreen('generate')}
            className="quizian-card flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-[#FFF0E3]/40 border border-[#EBE7DF] hover:border-[#F47A18]/40 transition-all text-left shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Upload size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#172337] group-hover:text-[#F47A18] transition-colors">
                  Generate from notes
                </h4>
                <p className="text-xs text-[#202B3C]/60 mt-0.5">
                  Upload PDF, DOCX, image or text notes
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (recentQuiz) {
                setSelectedQuizForChallenge(recentQuiz);
              }
              setActiveTab('challenge');
            }}
            className="quizian-card flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-[#FFF0E3]/40 border border-[#EBE7DF] hover:border-[#F47A18]/40 transition-all text-left shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#172337] text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Swords size={20} className="text-[#F47A18]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#172337] group-hover:text-[#F47A18] transition-colors">
                  Challenge a friend
                </h4>
                <p className="text-xs text-[#202B3C]/60 mt-0.5">
                  Play a saved quiz together with a room code
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors shrink-0" />
          </button>
        </div>
      </div>

      {/* RECENT QUIZZES WITH CATEGORY ICONS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
            Recent Quizzes
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('quizzes')}
            className="text-xs font-bold text-[#F47A18] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View all ({quizzes.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {quizzes.slice(0, 3).map((quiz) => {
            const catVisual = getCategoryVisual(quiz.category, quiz.title);
            const CategoryIcon = catVisual.icon;
            return (
              <div
                key={quiz.id}
                className="quizian-card bg-white rounded-3xl p-4 sm:p-5 border border-[#EBE7DF] hover:border-[#F47A18]/40 shadow-xs transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`w-11 h-11 rounded-2xl ${catVisual.bgClass} ${catVisual.textClass} border ${catVisual.borderClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      <CategoryIcon size={20} />
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        quiz.difficulty === 'Easy'
                          ? 'text-[#239B70]'
                          : quiz.difficulty === 'Hard'
                          ? 'text-[#F47A18]'
                          : 'text-[#172337]'
                      }`}
                    >
                      {quiz.difficulty}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-base text-[#172337] group-hover:text-[#F47A18] transition-colors line-clamp-1">
                      {quiz.title}
                    </h4>
                    <p className="text-xs text-[#202B3C]/65 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
                      <span>{catVisual.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{quiz.questions.length} questions</span>
                      <span aria-hidden="true">·</span>
                      <span>Played {quiz.timesPlayed || 0}×</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F0EEE9]">
                  <button
                    type="button"
                    onClick={() => setPreviewQuiz(quiz)}
                    className="flex-1 py-2 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C] transition-colors cursor-pointer text-center"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => startGame(quiz, 'solo')}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
