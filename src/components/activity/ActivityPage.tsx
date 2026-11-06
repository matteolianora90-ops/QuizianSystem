import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { ActivityRecord } from '../../types';
import { 
  Activity, 
  CheckCircle2, 
  Swords, 
  BookOpen, 
  Trophy, 
  Calendar, 
  Clock, 
  Award, 
  Filter, 
  Trash2,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { activities, clearActivities, startGame, quizzes } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'challenge' | 'solo'>('all');
  const [inspectingActivity, setInspectingActivity] = useState<ActivityRecord | null>(null);

  const filtered = activities.filter((act) => {
    if (filterType === 'all') return true;
    return act.type === filterType;
  });

  const totalQuizzes = activities.length;
  const challengeWins = activities.filter((a) => a.type === 'challenge' && a.rank === 1).length;
  const avgAccuracy = totalQuizzes > 0
    ? Math.round(activities.reduce((acc, a) => acc + a.accuracy, 0) / totalQuizzes)
    : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <Header
        title="Study & Challenge Activity"
        subtitle="Track your review history, retention milestones, and match results over time."
        actionButton={
          activities.length > 0 ? (
            <button
              onClick={clearActivities}
              className="py-2 px-3 rounded-xl border border-[#E8E4DC] hover:bg-red-50 hover:text-red-600 text-xs font-semibold text-[#202B3C]/70 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear History"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          ) : undefined
        }
      />

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#202B3C]/60 block mb-1">
            Total Sessions
          </span>
          <div className="text-2xl md:text-3xl font-extrabold text-[#172337] font-['Outfit']">
            {totalQuizzes}
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Completed reviews</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#202B3C]/60 block mb-1">
            Challenge Victories
          </span>
          <div className="text-2xl md:text-3xl font-extrabold text-[#F47A18] font-['Outfit']">
            {challengeWins}
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">1st place finishes</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#202B3C]/60 block mb-1">
            Avg. Accuracy
          </span>
          <div className="text-2xl md:text-3xl font-extrabold text-[#239B70] font-['Outfit']">
            {avgAccuracy}%
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Overall retention</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#202B3C]/60 block mb-1">
            Study Streak
          </span>
          <div className="text-2xl md:text-3xl font-extrabold text-[#172337] font-['Outfit']">
            5 Days
          </div>
          <p className="text-[11px] text-[#202B3C]/60 mt-1">Daily consistency</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterType === 'all'
              ? 'bg-[#172337] text-white shadow-xs'
              : 'bg-white text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
          }`}
        >
          All Activities ({activities.length})
        </button>
        <button
          onClick={() => setFilterType('challenge')}
          className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterType === 'challenge'
              ? 'bg-[#F47A18] text-white shadow-xs'
              : 'bg-white text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
          }`}
        >
          Challenges ({activities.filter((a) => a.type === 'challenge').length})
        </button>
        <button
          onClick={() => setFilterType('solo')}
          className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterType === 'solo'
              ? 'bg-[#172337] text-white shadow-xs'
              : 'bg-white text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
          }`}
        >
          Solo Practice ({activities.filter((a) => a.type === 'solo').length})
        </button>
      </div>

      {/* ACTIVITY RECORDS LIST */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#EBE7DF]">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center mx-auto mb-3">
            <Activity size={24} />
          </div>
          <h4 className="font-bold text-base text-[#172337]">No activities recorded yet</h4>
          <p className="text-xs text-[#202B3C]/60 mt-1">
            Complete your first quiz review or challenge to see detailed results here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((act) => {
            const isChallenge = act.type === 'challenge';
            return (
              <div
                key={act.id}
                className="bg-white rounded-3xl p-4 md:p-5 border border-[#EBE7DF] hover:border-[#F47A18]/30 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isChallenge ? 'bg-[#FFF0E3] text-[#F47A18]' : 'bg-[#239B70]/10 text-[#239B70]'
                    }`}
                  >
                    {isChallenge ? <Swords size={20} /> : <BookOpen size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isChallenge ? 'bg-[#FFF0E3] text-[#F47A18]' : 'bg-gray-100 text-[#202B3C]'
                        }`}
                      >
                        {isChallenge ? 'Challenge Match' : 'Solo Review'}
                      </span>
                      {isChallenge && act.rank && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          Rank #{act.rank}
                        </span>
                      )}
                      <span className="text-xs text-[#202B3C]/40">•</span>
                      <span className="text-xs text-[#202B3C]/60">{act.date}</span>
                    </div>

                    <h4 className="font-bold text-base text-[#172337]">
                      {act.quizTitle}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      <span className="font-bold text-[#239B70] flex items-center gap-1">
                        <CheckCircle2 size={13} /> {act.accuracy}% Accuracy
                      </span>
                      <span className="text-[#202B3C]/40">•</span>
                      <span className="font-bold text-[#F47A18]">
                        {act.score} pts
                      </span>
                      <span className="text-[#202B3C]/40">•</span>
                      <span className="text-[#202B3C]/60">
                        {act.correctCount} / {act.totalQuestions} questions correct
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setInspectingActivity(act)}
                    className="py-2 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Breakdown</span>
                  </button>
                  <button
                    onClick={() => {
                      const matchedQuiz = quizzes.find((q) => q.id === act.quizId);
                      if (matchedQuiz) {
                        startGame(matchedQuiz, act.type);
                      }
                    }}
                    className="py-2 px-3.5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECT ACTIVITY DETAILS MODAL */}
      {inspectingActivity && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-[#EBE7DF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                  Session Details
                </span>
                <h3 className="text-lg font-bold text-[#172337]">
                  {inspectingActivity.quizTitle}
                </h3>
                <p className="text-xs text-[#202B3C]/60">{inspectingActivity.date}</p>
              </div>
              <button
                onClick={() => setInspectingActivity(null)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-[#F7F4EF]">
                <div className="text-lg font-bold text-[#172337]">
                  {inspectingActivity.score}
                </div>
                <div className="text-[10px] uppercase font-bold text-[#202B3C]/60">Score</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#239B70]/10 text-[#239B70]">
                <div className="text-lg font-bold">
                  {inspectingActivity.accuracy}%
                </div>
                <div className="text-[10px] uppercase font-bold">Accuracy</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF0E3] text-[#F47A18]">
                <div className="text-lg font-bold">
                  {inspectingActivity.correctCount}/{inspectingActivity.totalQuestions}
                </div>
                <div className="text-[10px] uppercase font-bold">Correct</div>
              </div>
            </div>

            {inspectingActivity.leaderboard && inspectingActivity.leaderboard.length > 1 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
                  Match Leaderboard
                </span>
                <div className="space-y-1.5">
                  {inspectingActivity.leaderboard.map((item, i) => (
                    <div
                      key={item.id || i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F4EF] text-xs"
                    >
                      <span className="font-bold text-[#172337]">
                        #{i + 1} {item.name}
                      </span>
                      <span className="font-extrabold text-[#F47A18]">{item.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setInspectingActivity(null)}
              className="w-full py-2.5 rounded-xl bg-[#172337] text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
