import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { QuizSuccessIllustration } from '../common/EducationalIllustrations';
import {
  evaluateQuestionAnswer,
  formatCorrectAnswerForDisplay,
  formatQuestionTypeLabel,
  formatUserAnswerForDisplay,
} from '../../utils/questionUtils';
import {
  Trophy,
  RotateCcw,
  Home as HomeIcon,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  Share2,
  Coins
} from 'lucide-react';
import { COINS_PER_CORRECT } from '../../utils/questionUtils';

export const ResultsScreen: React.FC = () => {
  const { user, lastResult, setActiveScreen, setActiveTab, startGame, exitGame, showToast } = useApp();
  const [showReviewModal, setShowReviewModal] = useState(false);

  if (!lastResult) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[#202B3C]/70">No recent game results to display.</p>
        <button
          onClick={() => {
            setActiveScreen('main');
            setActiveTab('home');
          }}
          className="mt-4 py-2 px-4 rounded-xl bg-[#F47A18] text-white text-xs font-bold cursor-pointer"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const { score, coinsEarned, correctAnswers, totalQuestions, accuracy, leaderboard, quiz, mode, userAnswers, userPlayerId } = lastResult;
  const sessionCoinsEarned = typeof coinsEarned === 'number' ? coinsEarned : correctAnswers * COINS_PER_CORRECT;
  const activePlayerId = userPlayerId || user?.id || 'player-user';

  const handlePlayAgain = () => {
    startGame(quiz, mode);
  };

  const handleBackToHome = () => {
    exitGame();
    setActiveScreen('main');
    setActiveTab('home');
  };

  const handleShareResults = () => {
    const summaryText = `I scored ${score} pts and earned ${sessionCoinsEarned} coins (${accuracy}% accuracy) on "${quiz.title}" with Quizian!`;
    if (navigator.share) {
      navigator
        .share({
          title: `I scored ${accuracy}% on Quizian!`,
          text: summaryText,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(summaryText).catch(() => {});
      showToast('Copied results summary to clipboard!');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Header
        title="Challenge results"
        subtitle="Review your final score, classmate rankings, and question breakdown."
      />

      {/* Main Finish Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 border border-[#EBE7DF] shadow-md text-center space-y-5">
        <div className="animate-celebrate flex justify-center">
          <QuizSuccessIllustration className="w-24 h-24" />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#172337] tracking-tight font-['Outfit']">
            {accuracy >= 80 ? 'Great work!' : accuracy >= 50 ? 'Good effort!' : 'Keep practicing!'}
          </h2>
          <p className="text-xs md:text-sm text-[#202B3C]/70 mt-1">
            You finished the {mode === 'challenge' ? 'challenge' : 'study review'}.
          </p>
        </div>

        {/* 2 Stat Cards */}
        <div className="grid grid-cols-2 gap-3.5 pt-1 tabular-nums">
          <div className="bg-[#F7F4EF] rounded-2xl p-4 border border-[#E8E4DC]">
            <div className="text-2xl md:text-3xl font-extrabold text-[#172337] font-['Outfit']">
              {correctAnswers}/{totalQuestions}
            </div>
            <p className="text-xs font-bold text-[#202B3C]/60 uppercase tracking-wider mt-1">
              Correct
            </p>
          </div>

          <div className="bg-[#239B70]/10 rounded-2xl p-4 border border-[#239B70]/20 space-y-1.5">
            <div className="text-2xl md:text-3xl font-extrabold text-[#239B70] font-['Outfit']">
              {accuracy}%
            </div>
            <p className="text-xs font-bold text-[#239B70] uppercase tracking-wider">
              Accuracy
            </p>
            <div className="w-full h-1.5 rounded-full bg-white/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#239B70] transition-all duration-500"
                style={{ width: `${Math.min(100, accuracy)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Points & Coins Earned */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2.5 tabular-nums">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF0E3] text-[#F47A18] text-sm font-extrabold border border-[#F47A18]/20">
              <Trophy size={16} />
              <span>+{score} Points</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-800 text-sm font-extrabold border border-amber-200">
              <Coins size={16} className="text-amber-600" />
              <span>+{sessionCoinsEarned} Coins</span>
            </div>
          </div>
          {user && (
            <p className="text-xs font-semibold text-[#202B3C]/65 tabular-nums">
              Account Balance: <strong className="text-[#172337]">{user.totalPoints ?? 0} pts</strong>
              <span className="mx-1.5">•</span>
              <strong className="text-amber-700">{user.coins ?? 0} coins</strong>
            </p>
          )}
        </div>

        {/* LEADERBOARD */}
        <div className="pt-4 border-t border-[#F0EEE9] text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              LEADERBOARD
            </h3>
            <span className="text-[11px] text-[#202B3C]/50">Ranked by earned points</span>
          </div>

          <div className="space-y-2">
            {leaderboard.map((item, index) => {
              const isCurrentUser = item.id === activePlayerId;
              return (
                <div
                  key={item.id || index}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all gap-2 ${
                    isCurrentUser
                      ? 'bg-[#FFF0E3]/70 border-[#F47A18]/50 shadow-xs'
                      : 'bg-[#F7F4EF] border-[#E8E4DC]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-white'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800'
                          : index === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-[#E8E4DC] text-[#202B3C]'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="w-8 h-8 rounded-full bg-[#F47A18] text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {item.avatar || item.name.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isCurrentUser ? 'text-[#F47A18]' : 'text-[#172337]'}`}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-[#202B3C]/60">
                        {item.accuracy}% Accuracy
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <span className="text-xs font-extrabold text-[#172337] block">
                      {item.score} pts
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 block">
                      {item.coins ?? item.score} coins
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[#202B3C]/50 text-center pt-2.5">
            💡 Leaderboard scores reset back to zero when exiting or starting a new quiz.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="pt-4 space-y-2.5">
          <button
            onClick={handlePlayAgain}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>Play again</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => setShowReviewModal(true)}
              className="py-3 px-4 rounded-2xl bg-[#F7F4EF] hover:bg-[#EBE7DF] text-[#172337] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText size={15} />
              <span>Review Answers</span>
            </button>

            <button
              onClick={handleShareResults}
              className="py-3 px-4 rounded-2xl bg-[#FFF0E3] hover:bg-[#ffe4cc] text-[#F47A18] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 size={15} />
              <span>Share Results</span>
            </button>

            <button
              onClick={handleBackToHome}
              className="py-3 px-4 rounded-2xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-[#202B3C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <HomeIcon size={15} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* REVIEW ANSWERS FULL MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#F0EEE9] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                  Detailed Breakdown
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#172337]">
                  Question by Question Review
                </h3>
                <p className="text-xs text-[#202B3C]/60 mt-0.5 truncate">
                  {quiz.title} • {correctAnswers} of {totalQuestions} answered correctly
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {quiz.questions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = evaluateQuestionAnswer(q, userAns);

                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border ${
                      isCorrect ? 'bg-[#239B70]/5 border-[#239B70]/30' : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-[#172337]">
                          Question {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-[#E8E4DC] text-[#172337]/70 truncate">
                          {formatQuestionTypeLabel(q.type)}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold flex items-center gap-1 shrink-0 ${
                          isCorrect ? 'text-[#239B70]' : 'text-red-600'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={14} /> Correct
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> Incorrect
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#172337] mb-3 break-words">
                      {q.question}
                    </p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-start gap-1.5">
                        <span className="font-semibold text-[#202B3C]/70 shrink-0">Your Answer:</span>
                        <span className={`font-bold break-words ${isCorrect ? 'text-[#239B70]' : 'text-red-600'}`}>
                          {formatUserAnswerForDisplay(q, userAns)}
                        </span>
                      </div>

                      {!isCorrect && (
                        <div className="flex flex-wrap items-start gap-1.5">
                          <span className="font-semibold text-[#202B3C]/70 shrink-0">Correct Answer:</span>
                          <span className="font-bold text-[#239B70] break-words">
                            {formatCorrectAnswerForDisplay(q)}
                          </span>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DC] text-[#202B3C]/80 mt-2 break-words">
                          💡 <span className="font-semibold">Explanation:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#F0EEE9] bg-[#FAFAF8] flex items-center justify-end">
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#172337] hover:bg-[#202B3C] text-white font-bold text-xs cursor-pointer"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
