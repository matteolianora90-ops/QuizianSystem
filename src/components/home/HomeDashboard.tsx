import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { 
  Sparkles, 
  Swords, 
  BookOpen, 
  Trophy, 
  ChevronRight, 
  Play, 
  Clock, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Flame,
  ArrowRight
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
    setPreviewQuiz 
  } = useApp();

  const totalChallenges = activities.filter((a) => a.type === 'challenge').length;
  const avgAccuracy = activities.length > 0 
    ? Math.round(activities.reduce((acc, a) => acc + a.accuracy, 0) / activities.length)
    : 85;

  const recentQuiz = quizzes[0];
  const recentActivity = activities[0];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <Header
        title="Your study space"
        subtitle={`Welcome back, ${user?.name || 'Student'}! What would you like to review today?`}
      />

      {/* Main Hero Card - Ready to review? */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F47A18] to-[#e0690f] rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-[#F47A18]/20">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-3">
            <Sparkles size={14} className="text-[#FFF0E3]" />
            <span>AI-Powered Active Recall</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-['Outfit']">
            Ready to review?
          </h2>
          <p className="text-[#FFF0E3] text-sm md:text-base mt-1.5 mb-6 leading-relaxed">
            Turn your study notes into an interactive quiz in seconds and challenge your friends to test your retention.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveScreen('generate')}
              className="py-3 px-6 rounded-2xl bg-white text-[#F47A18] font-bold text-sm shadow-md hover:bg-[#FFF0E3] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload size={18} />
              <span>+ Create a quiz</span>
            </button>
            <button
              onClick={() => {
                if (recentQuiz) {
                  setSelectedQuizForChallenge(recentQuiz);
                }
                setActiveTab('challenge');
              }}
              className="py-3 px-5 rounded-2xl bg-[#172337] hover:bg-[#202B3C] text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Swords size={18} className="text-[#F47A18]" />
              <span>Challenge a friend</span>
            </button>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202B3C]/60">
              Quizzes saved
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#172337] font-['Outfit']">
            {quizzes.length}
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Ready for study</p>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202B3C]/60">
              Challenges played
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center">
              <Swords size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#172337] font-['Outfit']">
            {totalChallenges > 0 ? totalChallenges : 4}
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Multiplayer matches</p>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202B3C]/60">
              Avg. Accuracy
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#239B70]/10 text-[#239B70] flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#239B70] font-['Outfit']">
            {avgAccuracy}%
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Strong retention</p>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202B3C]/60">
              Study Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#F47A18] flex items-center justify-center">
              <Flame size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#172337] font-['Outfit']">
            5 Days 🔥
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Keep the momentum</p>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70 mb-3 px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <button
            onClick={() => setActiveScreen('generate')}
            className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-[#FFF0E3]/40 border border-[#EBE7DF] hover:border-[#F47A18]/40 transition-all text-left shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center group-hover:scale-105 transition-transform">
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
            <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
          </button>

          <button
            onClick={() => {
              if (recentQuiz) {
                setSelectedQuizForChallenge(recentQuiz);
              }
              setActiveTab('challenge');
            }}
            className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-[#FFF0E3]/40 border border-[#EBE7DF] hover:border-[#F47A18]/40 transition-all text-left shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#172337] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
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
            <ChevronRight size={18} className="text-[#202B3C]/40 group-hover:text-[#F47A18] transition-colors" />
          </button>
        </div>
      </div>

      {/* RECENT QUIZZES & RECENT ACTIVITY DUAL COLUMN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Quizzes (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              Recent Quizzes
            </h3>
            <button
              onClick={() => setActiveTab('quizzes')}
              className="text-xs font-bold text-[#F47A18] hover:underline flex items-center gap-1"
            >
              <span>View all ({quizzes.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {quizzes.slice(0, 3).map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl p-4 border border-[#EBE7DF] hover:border-[#F47A18]/30 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF0E3] text-[#F47A18] font-bold text-base flex items-center justify-center shrink-0">
                    Q
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#172337] group-hover:text-[#F47A18] transition-colors truncate">
                      {quiz.title}
                    </h4>
                    <p className="text-xs text-[#202B3C]/60 mt-0.5 flex items-center gap-2">
                      <span>{quiz.questions.length} questions</span>
                      <span>•</span>
                      <span className={`font-semibold ${
                        quiz.difficulty === 'Easy' ? 'text-green-600' : quiz.difficulty === 'Hard' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {quiz.difficulty}
                      </span>
                      <span>•</span>
                      <span>{quiz.category}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setPreviewQuiz(quiz)}
                    className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C] transition-colors cursor-pointer"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => startGame(quiz, 'solo')}
                    className="py-1.5 px-3.5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              Recent Activity
            </h3>
            <button
              onClick={() => setActiveTab('activity')}
              className="text-xs font-bold text-[#F47A18] hover:underline"
            >
              See all
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs space-y-4">
            {recentActivity ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
                  <span className="text-xs font-bold text-[#239B70] flex items-center gap-1">
                    <CheckCircle2 size={14} /> Completed
                  </span>
                  <span className="text-[11px] text-[#202B3C]/50">{recentActivity.date}</span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#172337]">
                    {recentActivity.quizTitle}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-[#239B70]/10 text-[#239B70] font-bold">
                      {recentActivity.accuracy}% Accuracy
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FFF0E3] text-[#F47A18] font-bold">
                      {recentActivity.score} pts
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#202B3C]/70">
                  {recentActivity.type === 'challenge' 
                    ? `Placed #${recentActivity.rank || 1} in multiplayer challenge`
                    : `Answered ${recentActivity.correctCount}/${recentActivity.totalQuestions} questions correctly in solo mode`}
                </p>

                <button
                  onClick={() => setActiveTab('activity')}
                  className="w-full py-2 px-3 rounded-xl bg-[#F7F4EF] hover:bg-[#EBE7DF] text-[#172337] text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  View Performance History
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-[#202B3C]/60 text-xs">
                No activity yet. Start your first quiz review!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
