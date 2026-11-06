import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { 
  Check, 
  Trophy, 
  RotateCcw, 
  Home as HomeIcon, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  X,
  Share2,
  Medal,
  Award
} from 'lucide-react';

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
          className="mt-4 py-2 px-4 rounded-xl bg-[#F47A18] text-white text-xs font-bold"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const { score, correctAnswers, totalQuestions, accuracy, leaderboard, quiz, mode, userAnswers } = lastResult;

  const handlePlayAgain = () => {
    // Restarts fresh with leaderboard reset to 0 points
    startGame(quiz, mode);
  };

  const handleBackToHome = () => {
    // Exiting completely resets the match and leaderboard
    exitGame();
    setActiveScreen('main');
    setActiveTab('home');
  };

  const handleShareResults = () => {
    if (navigator.share) {
      navigator.share({
        title: `I scored ${accuracy}% on Quizian!`,
        text: `I just reviewed "${quiz.title}" on Quizian and scored ${score} pts with ${accuracy}% accuracy!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`I scored ${score} pts (${accuracy}% accuracy) on "${quiz.title}" with Quizian!`);
      showToast('Copied results summary to clipboard!');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <Header
        title="Challenge results"
        subtitle="Review your final score, classmate rankings, and question breakdown."
      />

      {/* Main Finish Card (Matches Prototype Page 4) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EBE7DF] shadow-md text-center space-y-5">
        {/* Large Green Check Circle */}
        <div className="w-16 h-16 rounded-full bg-[#239B70]/15 text-[#239B70] flex items-center justify-center mx-auto shadow-inner">
          <Check size={36} strokeWidth={3} />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#172337] tracking-tight font-['Outfit']">
            {accuracy >= 80 ? 'Great work!' : accuracy >= 50 ? 'Good effort!' : 'Keep practicing!'}
          </h2>
          <p className="text-xs md:text-sm text-[#202B3C]/70 mt-1">
            You finished the {mode === 'challenge' ? 'challenge' : 'study review'}.
          </p>
        </div>

        {/* 2 Big Stat Cards */}
        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div className="bg-[#F7F4EF] rounded-2xl p-4 border border-[#E8E4DC]">
            <div className="text-2xl md:text-3xl font-extrabold text-[#172337] font-['Outfit']">
              {correctAnswers}/{totalQuestions}
            </div>
            <p className="text-xs font-bold text-[#202B3C]/60 uppercase tracking-wider mt-1">
              Correct
            </p>
          </div>

          <div className="bg-[#239B70]/10 rounded-2xl p-4 border border-[#239B70]/20">
            <div className="text-2xl md:text-3xl font-extrabold text-[#239B70] font-['Outfit']">
              {accuracy}%
            </div>
            <p className="text-xs font-bold text-[#239B70] uppercase tracking-wider mt-1">
              Accuracy
            </p>
          </div>
        </div>

        {/* Total Score Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF0E3] text-[#F47A18] text-sm font-extrabold">
          <Trophy size={16} />
          <span>Earned {score} Points</span>
        </div>

        {/* LEADERBOARD (Prototype Page 4) */}
        <div className="pt-4 border-t border-[#F0EEE9] text-left">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              LEADERBOARD
            </h3>
            <span className="text-[11px] text-[#202B3C]/50">Ranked by earned points</span>
          </div>

          <div className="space-y-2">
            {leaderboard.map((item, index) => {
              const isCurrentUser = item.id === (user?.id || 'player-user') || item.name === (user?.name || 'Matteo Llanora') || item.isHost;
              return (
                <div
                  key={item.id || index}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-[#FFF0E3]/70 border-[#F47A18]/50 shadow-xs'
                      : 'bg-[#F7F4EF] border-[#E8E4DC]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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

                    <div>
                      <p className={`text-xs font-bold ${isCurrentUser ? 'text-[#F47A18]' : 'text-[#172337]'}`}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-[#202B3C]/60">
                        {item.accuracy}% Accuracy
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-[#172337]">
                    {item.score} pts
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[#202B3C]/50 text-center pt-2.5">
            💡 Leaderboard scores reset back to zero when exiting or starting a new quiz.
          </p>
        </div>

        {/* ACTION BUTTONS (Play Again, Review Answers, Back to Home) */}
        <div className="pt-4 space-y-2.5">
          <button
            onClick={handlePlayAgain}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>Play again</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowReviewModal(true)}
              className="py-3 px-4 rounded-2xl bg-[#F7F4EF] hover:bg-[#EBE7DF] text-[#172337] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText size={15} />
              <span>Review Answers</span>
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
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
            <div className="p-6 border-b border-[#F0EEE9] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                  Detailed Breakdown
                </span>
                <h3 className="text-xl font-bold text-[#172337]">
                  Question by Question Review
                </h3>
                <p className="text-xs text-[#202B3C]/60 mt-0.5">
                  {quiz.title} • {correctAnswers} of {totalQuestions} answered correctly
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {quiz.questions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border ${
                      isCorrect ? 'bg-[#239B70]/5 border-[#239B70]/30' : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#172337]">
                        Question {idx + 1}
                      </span>
                      <span
                        className={`text-xs font-bold flex items-center gap-1 ${
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

                    <p className="text-sm font-bold text-[#172337] mb-3">
                      {q.question}
                    </p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-[#202B3C]/70 shrink-0">Your Answer:</span>
                        <span className={`font-bold ${isCorrect ? 'text-[#239B70]' : 'text-red-600'}`}>
                          {userAns || '(No answer provided)'}
                        </span>
                      </div>

                      {!isCorrect && (
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-[#202B3C]/70 shrink-0">Correct Answer:</span>
                          <span className="font-bold text-[#239B70]">
                            {q.correctAnswer}
                          </span>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DC] text-[#202B3C]/80 mt-2">
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
                className="py-2.5 px-6 rounded-xl bg-[#172337] hover:bg-[#202B3C] text-white font-bold text-xs"
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
