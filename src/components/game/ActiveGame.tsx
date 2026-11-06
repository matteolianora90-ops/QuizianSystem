import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Question, ParticipantScore } from '../../types';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  AlertTriangle, 
  X, 
  Sparkles, 
  Trophy,
  Medal,
  Users,
  Flame,
  Award
} from 'lucide-react';

export const ActiveGame: React.FC = () => {
  const { currentGameSession, exitGame, finishGame, user } = useApp();

  if (!currentGameSession) {
    return null;
  }

  const { quiz, mode, timeLimitMinutes, roomCode, participants } = currentGameSession;
  const questions = quiz.questions;

  // Active question index
  const [currentIndex, setCurrentIndex] = useState(0);

  // User answers state: questionId -> selected answer
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

  // Floating point indicator animation
  const [recentPointsEarned, setRecentPointsEarned] = useState<number | null>(null);

  // Scrambled word interactive state for current question if applicable
  const [assembledWord, setAssembledWord] = useState<string>('');

  // Countdown timer in seconds
  const totalSeconds = (timeLimitMinutes || 10) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);

  // Score tracking - strictly starts at 0 for every game session
  const [currentScore, setCurrentScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // LIVE LEADERBOARD: strictly starts at 0 points for every participant
  const [liveLeaderboard, setLiveLeaderboard] = useState<ParticipantScore[]>(() => {
    return participants.map((p) => ({
      ...p,
      score: 0,
      correctAnswers: 0,
      totalQuestions: questions.length,
      accuracy: 0,
      completed: false,
    }));
  });

  const currentQ: Question | undefined = questions[currentIndex];

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCompleteQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (chosen: string) => {
    if (isAnswerLocked) return;

    setIsAnswerLocked(true);
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: chosen,
    }));

    const isCorrect = chosen.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    const pointsToAdd = isCorrect ? 100 : 0;

    if (isCorrect) {
      setCurrentScore((prev) => prev + pointsToAdd);
      setCorrectCount((prev) => prev + 1);
      setRecentPointsEarned(pointsToAdd);
      setTimeout(() => setRecentPointsEarned(null), 1800);
    }

    // UPDATE LIVE LEADERBOARD IMMEDIATELY: add points to user and update competitors
    setLiveLeaderboard((prev) => {
      return prev.map((p) => {
        const isUser = p.id === (user?.id || 'player-user') || p.name === (user?.name || 'Matteo Llanora') || p.isHost;
        if (isUser) {
          const newCorrect = isCorrect ? p.correctAnswers + 1 : p.correctAnswers;
          const newScore = isCorrect ? p.score + pointsToAdd : p.score;
          return {
            ...p,
            score: newScore,
            correctAnswers: newCorrect,
            accuracy: Math.round((newCorrect / (currentIndex + 1)) * 100),
          };
        } else {
          // If in challenge mode, simulate classmate peers answering question dynamically
          if (mode === 'challenge') {
            const peerCorrect = Math.random() < 0.65; // realistic peer accuracy
            const peerPoints = peerCorrect ? 100 : 0;
            const peerNewCorrect = peerCorrect ? p.correctAnswers + 1 : p.correctAnswers;
            return {
              ...p,
              score: p.score + peerPoints,
              correctAnswers: peerNewCorrect,
              accuracy: Math.round((peerNewCorrect / (currentIndex + 1)) * 100),
            };
          }
          return p;
        }
      });
    });
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswerLocked(false);
      setAssembledWord('');
    } else {
      handleCompleteQuiz();
    }
  };

  const handleCompleteQuiz = () => {
    const totalQ = questions.length;
    const finalAccuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const finalScore = currentScore;
    const timeSpent = totalSeconds - secondsRemaining;

    // Finalize all participant rankings sorted by score
    const finalizedBoard = liveLeaderboard
      .map((p) => {
        const isUser = p.id === (user?.id || 'player-user') || p.name === (user?.name || 'Matteo Llanora') || p.isHost;
        return isUser
          ? {
              ...p,
              score: finalScore,
              correctAnswers: correctCount,
              totalQuestions: totalQ,
              accuracy: finalAccuracy,
              completed: true,
            }
          : {
              ...p,
              totalQuestions: totalQ,
              completed: true,
            };
      })
      .sort((a, b) => b.score - a.score);

    // Submit score to server room if room code exists
    if (roomCode) {
      fetch(`/api/rooms/${roomCode}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: user?.id || 'player-user',
          score: finalScore,
          correctAnswers: correctCount,
          totalQuestions: totalQ,
        }),
      }).catch(() => {});
    }

    finishGame({
      score: finalScore,
      maxScore: totalQ * 100,
      correctAnswers: correctCount,
      totalQuestions: totalQ,
      accuracy: finalAccuracy,
      timeSpentSeconds: timeSpent,
      userAnswers: selectedAnswers,
      leaderboard: finalizedBoard,
      quiz,
      mode,
    });
  };

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const currentAnswer = selectedAnswers[currentQ?.id];

  // Current sorted live leaderboard
  const sortedLiveLeaderboard = [...liveLeaderboard].sort((a, b) => b.score - a.score);
  const userRank = sortedLiveLeaderboard.findIndex((p) => p.id === (user?.id || 'player-user') || p.name === (user?.name || 'Matteo Llanora') || p.isHost) + 1 || 1;

  return (
    <div className="min-h-full flex-1 bg-[#F7F4EF] flex flex-col justify-between p-3.5 sm:p-4 md:p-8 select-none overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* GAME HEADER WITH LIVE LEADERBOARD QUICK BADGES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EBE7DF] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-[#172337] font-['Outfit']">
                Quizian
              </span>
              <span className="text-xs bg-[#FFF0E3] text-[#F47A18] px-2 py-0.5 rounded-md font-bold uppercase">
                {mode === 'challenge' ? 'Live Challenge' : 'Solo Practice'}
              </span>
            </div>
            <p className="text-xs font-bold text-[#202B3C]/70 mt-0.5">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Rank & Points Badge */}
            <div className="flex items-center gap-2 bg-[#FFF0E3] border border-[#F47A18]/30 px-3 py-1.5 rounded-xl shadow-xs">
              <Trophy size={15} className="text-[#F47A18]" />
              <span className="text-xs font-extrabold text-[#F47A18]">
                Rank #{userRank}
              </span>
              <span className="text-xs text-[#202B3C]/30">•</span>
              <span className="text-xs font-extrabold text-[#172337]">
                {currentScore} pts
              </span>

              {/* Point earned popover */}
              {recentPointsEarned && (
                <span className="bg-[#239B70] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md animate-bounce">
                  +{recentPointsEarned}
                </span>
              )}
            </div>

            {/* Toggle mobile leaderboard modal */}
            {liveLeaderboard.length > 1 && (
              <button
                onClick={() => setShowMobileLeaderboard(true)}
                className="md:hidden py-1.5 px-3 rounded-xl bg-white border border-[#E8E4DC] text-xs font-bold text-[#172337] flex items-center gap-1.5"
              >
                <Users size={14} className="text-[#F47A18]" />
                <span>Leaderboard</span>
              </button>
            )}

            {/* Timer Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors ${
                secondsRemaining < 60
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'bg-white border border-[#E8E4DC] text-[#172337]'
              }`}
            >
              <Clock size={14} className={secondsRemaining < 60 ? 'text-red-600' : 'text-[#F47A18]'} />
              <span>{formatTime(secondsRemaining)} remaining</span>
            </div>

            {/* Exit button with confirmation */}
            <button
              onClick={() => setShowExitConfirm(true)}
              className="w-8 h-8 rounded-full bg-white hover:bg-red-50 hover:text-red-600 border border-[#E8E4DC] flex items-center justify-center text-[#202B3C]/60 transition-colors cursor-pointer"
              title="Exit Game"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-[#E8E4DC] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#F47A18] h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* MAIN GAMEPLAY + LIVE LEADERBOARD DUAL COLUMN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question & Answer Card (2 Cols on Desktop) */}
          <div className="lg:col-span-2 space-y-5">
            {currentQ && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EBE7DF] shadow-md space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-[#202B3C]/60">
                  <span className="uppercase tracking-wider">
                    {currentQ.type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#F47A18] font-bold">
                      Current Score: {currentScore} pts
                    </span>
                    {recentPointsEarned && (
                      <span className="text-[#239B70] font-black text-xs animate-pulse">
                        +{recentPointsEarned} pts!
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-extrabold text-[#172337] leading-snug font-['Outfit']">
                  {currentQ.question}
                </h2>

                {/* SCRAMBLED WORD HELPER */}
                {currentQ.type === 'scrambled_word' && currentQ.scrambledClue && (
                  <div className="p-3 rounded-2xl bg-[#FFF0E3]/70 border border-[#F47A18]/20 text-xs text-[#172337]">
                    <span className="font-bold text-[#F47A18]">Clue:</span> {currentQ.scrambledClue}
                  </div>
                )}

                {/* ANSWER CHOICES */}
                <div className="space-y-3 pt-2">
                  {currentQ.options && currentQ.options.length > 0 ? (
                    currentQ.options.map((option, idx) => {
                      const isSelected = currentAnswer === option;
                      const isCorrect = option.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();

                      let cardStyle = 'bg-[#F7F4EF] hover:bg-[#F0EEE9] border-[#E8E4DC] text-[#202B3C]';

                      if (isAnswerLocked) {
                        if (isCorrect) {
                          cardStyle = 'bg-[#239B70]/10 border-[#239B70] text-[#239B70] font-bold shadow-xs';
                        } else if (isSelected) {
                          cardStyle = 'bg-red-50 border-red-500 text-red-700 font-bold';
                        } else {
                          cardStyle = 'bg-[#F7F4EF]/50 border-[#E8E4DC]/50 text-[#202B3C]/40';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isAnswerLocked}
                          onClick={() => handleSelectAnswer(option)}
                          className={`w-full p-4 rounded-2xl border text-left text-sm md:text-base font-medium transition-all flex items-center justify-between cursor-pointer ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-white/80 border border-current/20 flex items-center justify-center text-xs font-bold shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="leading-snug">{option}</span>
                          </div>

                          {isAnswerLocked && (
                            <div>
                              {isCorrect && (
                                <span className="text-[#239B70] font-bold text-xs flex items-center gap-1">
                                  <CheckCircle2 size={18} />
                                  <span>+100 pts</span>
                                </span>
                              )}
                              {isSelected && !isCorrect && (
                                <span className="text-red-600 font-bold text-xs flex items-center gap-1">
                                  <XCircle size={18} />
                                  <span>Incorrect</span>
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        disabled={isAnswerLocked}
                        placeholder="Type your answer..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSelectAnswer((e.target as HTMLInputElement).value);
                          }
                        }}
                        className="w-full p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-base font-semibold focus:outline-none focus:border-[#F47A18]"
                      />
                    </div>
                  )}
                </div>

                {/* EXPLANATION FEEDBACK */}
                {isAnswerLocked && (
                  <div className="pt-2 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-xs leading-relaxed text-[#172337]">
                      <span className="font-bold text-[#F47A18] block mb-1">
                        💡 Study Explanation:
                      </span>
                      {currentQ.explanation || `The correct answer is: "${currentQ.correctAnswer}"`}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BOTTOM QUESTION CONTROLS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-[#202B3C]/50 text-center sm:text-left">
                Answers lock after submission. Correct answers immediately add +100 points to the leaderboard!
              </p>

              <button
                disabled={!isAnswerLocked}
                onClick={handleNextQuestion}
                className={`w-full sm:w-auto py-3.5 px-8 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isAnswerLocked
                    ? 'bg-[#F47A18] hover:bg-[#e0690f] text-white shadow-[#F47A18]/25'
                    : 'bg-[#E8E4DC] text-[#202B3C]/40 cursor-not-allowed shadow-none'
                }`}
              >
                <span>{currentIndex < questions.length - 1 ? 'Next question' : 'Finish challenge'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* LIVE LEADERBOARD SIDEBAR (Desktop 1 Col) */}
          <div className="hidden lg:block space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center font-bold">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#172337]">
                      Live Leaderboard
                    </h3>
                    <p className="text-[10px] text-[#202B3C]/50">
                      Resets to 0 for each new quiz
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-[#239B70]/10 text-[#239B70] px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              </div>

              {/* Roster of participants with live points */}
              <div className="space-y-2.5">
                {sortedLiveLeaderboard.map((item, index) => {
                  const isUser = item.id === (user?.id || 'player-user') || item.name === (user?.name || 'Matteo Llanora') || item.isHost;
                  return (
                    <div
                      key={item.id || index}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isUser
                          ? 'bg-[#FFF0E3]/70 border-[#F47A18]/60 shadow-xs'
                          : 'bg-[#F7F4EF] border-[#E8E4DC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                            index === 0
                              ? 'bg-amber-400 text-white'
                              : index === 1
                              ? 'bg-slate-300 text-slate-800'
                              : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-[#202B3C]/70 border border-[#E8E4DC]'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="w-7 h-7 rounded-full bg-[#F47A18] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {item.avatar || item.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isUser ? 'text-[#F47A18]' : 'text-[#172337]'}`}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[#202B3C]/50">
                            {item.correctAnswers} correct
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-[#172337] block">
                          {item.score} pts
                        </span>
                        {isUser && recentPointsEarned && (
                          <span className="text-[10px] text-[#239B70] font-black animate-fade-in block">
                            +{recentPointsEarned}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F4EF] text-[11px] text-[#202B3C]/60 leading-relaxed text-center">
                🎯 Correct answers add <span className="font-bold text-[#F47A18]">+100 points</span>. When the quiz ends or resets, the leaderboard starts fresh at 0.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE LIVE LEADERBOARD DRAWER */}
      {showMobileLeaderboard && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[#F47A18]" />
                <h3 className="font-bold text-base text-[#172337]">Live Leaderboard</h3>
              </div>
              <button
                onClick={() => setShowMobileLeaderboard(false)}
                className="w-7 h-7 rounded-full bg-[#F7F4EF] flex items-center justify-center text-[#202B3C]/70"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedLiveLeaderboard.map((item, index) => {
                const isUser = item.id === (user?.id || 'player-user') || item.name === (user?.name || 'Matteo Llanora') || item.isHost;
                return (
                  <div
                    key={item.id || index}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isUser ? 'bg-[#FFF0E3] border-[#F47A18]' : 'bg-[#F7F4EF] border-[#E8E4DC]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs w-5">#{index + 1}</span>
                      <span className={`text-xs font-bold ${isUser ? 'text-[#F47A18]' : 'text-[#172337]'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[#172337]">
                      {item.score} pts
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-[#202B3C]/60 text-center">
              Scores reset back to 0 when starting a new quiz.
            </p>

            <button
              onClick={() => setShowMobileLeaderboard(false)}
              className="w-full py-2.5 rounded-xl bg-[#172337] text-white font-bold text-xs"
            >
              Back to Quiz
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM EXIT MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#172337]">Exit Quiz & Reset?</h3>
            <p className="text-xs text-[#202B3C]/70">
              Exiting will cancel this match. The leaderboard and scores will be completely reset back to zero.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C]"
              >
                Keep Playing
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  exitGame(); // Clears session and resets leaderboard to zero
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Exit & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
