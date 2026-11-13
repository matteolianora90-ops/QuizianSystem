import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Question, ParticipantScore } from '../../types';
import {
  subscribeToChallengeRoom,
  updateChallengeParticipantScoreInFirestore,
  completeChallengeRoomInFirestore,
} from '../../utils/firestoreSync';
import {
  POINTS_PER_CORRECT,
  createScrambledTiles,
  evaluateQuestionAnswer,
  formatQuestionTypeLabel,
  formatCorrectAnswerForDisplay,
} from '../../utils/questionUtils';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  X,
  Trophy,
  Users,
  RotateCcw,
} from 'lucide-react';

export const ActiveGame: React.FC = () => {
  const { currentGameSession, exitGame, finishGame, awardQuestionReward, user, authMode } = useApp();

  if (!currentGameSession) {
    return null;
  }

  const { sessionId, quiz, mode, timeLimitMinutes, roomCode, participants, userPlayerId } =
    currentGameSession;
  const questions = quiz.questions;
  const activePlayerId = userPlayerId || user?.id || 'player-user';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Type-specific staging states before Submit Answer is clicked
  const [stagedChoice, setStagedChoice] = useState<string>('');
  const [textInput, setTextInput] = useState('');
  const [selectedTileIds, setSelectedTileIds] = useState<number[]>([]);

  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [recentRewardBurst, setRecentRewardBurst] = useState<{
    points: number;
    key: number;
  } | null>(null);

  const totalSeconds = (timeLimitMinutes || 10) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);

  const [currentScore, setCurrentScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

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

  const hasCompletedRef = useRef(false);
  const submittedQuestionIdsRef = useRef<Set<string>>(new Set());
  const rewardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentQ: Question | undefined = questions[currentIndex];

  // Reset per-question transient inputs when moving to a new question
  useEffect(() => {
    setStagedChoice('');
    setTextInput('');
    setSelectedTileIds([]);
  }, [currentIndex, currentQ?.id]);

  useEffect(() => {
    return () => {
      if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
    };
  }, []);

  // Deterministic scrambled letter tiles for scrambled_word questions
  const scrambledTilePool = useMemo(() => {
    if (!currentQ || currentQ.type !== 'scrambled_word') return [];
    return createScrambledTiles(currentQ.correctAnswer, currentQ.id);
  }, [currentQ]);

  const assembledScrambledWord = useMemo(() => {
    return selectedTileIds
      .map((id) => scrambledTilePool.find((tile) => tile.id === id)?.char || '')
      .join('');
  }, [selectedTileIds, scrambledTilePool]);

  const isCurrentPlayer = useCallback(
    (p: ParticipantScore) => p.id === activePlayerId || (p.uid !== undefined && p.uid === activePlayerId),
    [activePlayerId]
  );

  // Real-time challenge leaderboard sync (Firestore onSnapshot + /ws/challenges WebSocket)
  useEffect(() => {
    if (mode !== 'challenge' || !roomCode || roomCode.startsWith('QZ-')) return;

    const mergeRemoteParticipants = (remoteParticipants: ParticipantScore[]) => {
      if (!Array.isArray(remoteParticipants) || remoteParticipants.length === 0) return;
      setLiveLeaderboard((prev) => {
        const byId = new Map<string, ParticipantScore>();
        for (const p of prev) byId.set(p.id, p);
        for (const remote of remoteParticipants) {
          if (remote.id === activePlayerId || remote.uid === activePlayerId) continue;
          byId.set(remote.id, { ...remote, totalQuestions: questions.length });
        }
        return Array.from(byId.values());
      });
    };

    let unsubFirestore: (() => void) | null = null;
    if (authMode === 'firebase') {
      try {
        unsubFirestore = subscribeToChallengeRoom(roomCode, (room) => {
          if (room?.participants) {
            mergeRemoteParticipants(room.participants);
          }
        });
      } catch {
        // Fallback cleanly to WS / HTTP polling
      }
    }

    // Also attach live WebSocket listener on same origin if available
    try {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${wsProto}//${window.location.host}/ws/challenges`);
      wsRef.current = socket;
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'subscribe', roomCode }));
      };
      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.type === 'room_update' && msg.room?.participants) {
            mergeRemoteParticipants(msg.room.participants);
          }
        } catch {
          // ignore
        }
      };
      socket.onerror = () => {};
    } catch {
      // Static deploy without Express WS relies cleanly on Firestore
    }

    return () => {
      unsubFirestore?.();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [mode, roomCode, authMode, activePlayerId, questions.length]);

  // Countdown tick without calling finishGame inside state updater
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCompleteQuiz = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    const totalQ = questions.length;
    const finalAccuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const finalScore = currentScore;
    const timeSpent = totalSeconds - secondsRemaining;

    const finalizedBoard = liveLeaderboard
      .map((p) => {
        if (isCurrentPlayer(p)) {
          return {
            ...p,
            score: finalScore,
            correctAnswers: correctCount,
            totalQuestions: totalQ,
            accuracy: finalAccuracy,
            completed: true,
          };
        }
        if (p.isBot || p.id.startsWith('bot-')) {
          return {
            ...p,
            totalQuestions: totalQ,
            completed: true,
          };
        }
        return {
          ...p,
          totalQuestions: totalQ,
        };
      })
      .sort((a, b) => b.score - a.score);

    if (roomCode && !roomCode.startsWith('QZ-')) {
      if (authMode === 'firebase') {
        void updateChallengeParticipantScoreInFirestore({
          code: roomCode,
          participantId: activePlayerId,
          score: finalScore,
          correctAnswers: correctCount,
          totalQuestions: totalQ,
          completed: true,
        })
          .then(() => {
            const allHumansDone = finalizedBoard
              .filter((p) => !p.isBot && !p.id.startsWith('bot-'))
              .every((p) => p.completed);
            if (allHumansDone) {
              return completeChallengeRoomInFirestore(roomCode);
            }
          })
          .catch(() => {});
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'score_progress',
            roomCode,
            playerId: activePlayerId,
            score: finalScore,
            correctAnswers: correctCount,
            totalQuestions: totalQ,
            completed: true,
          })
        );
      }

      fetch(`/api/rooms/${roomCode}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activePlayerId,
          score: finalScore,
          correctAnswers: correctCount,
          totalQuestions: totalQ,
        }),
      }).catch(() => {});
    }

    finishGame({
      score: finalScore,
      maxScore: totalQ * POINTS_PER_CORRECT,
      correctAnswers: correctCount,
      totalQuestions: totalQ,
      accuracy: finalAccuracy,
      timeSpentSeconds: timeSpent,
      userAnswers: selectedAnswers,
      leaderboard: finalizedBoard,
      quiz,
      mode,
      userPlayerId: activePlayerId,
    });
  }, [
    questions.length,
    correctCount,
    currentScore,
    totalSeconds,
    secondsRemaining,
    liveLeaderboard,
    isCurrentPlayer,
    roomCode,
    authMode,
    activePlayerId,
    finishGame,
    selectedAnswers,
    quiz,
    mode,
  ]);

  // Trigger completion safely when timer reaches 0
  useEffect(() => {
    if (secondsRemaining === 0 && !hasCompletedRef.current) {
      handleCompleteQuiz();
    }
  }, [secondsRemaining, handleCompleteQuiz]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const submitLockedAnswer = (chosen: string) => {
    if (isAnswerLocked || !currentQ) return;
    if (submittedQuestionIdsRef.current.has(currentQ.id)) return;

    const trimmed = chosen.trim();
    if (!trimmed) return;

    submittedQuestionIdsRef.current.add(currentQ.id);
    setIsAnswerLocked(true);
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: trimmed,
    }));

    const isCorrect = evaluateQuestionAnswer(currentQ, trimmed);
    let pointsToAdd = 0;

    if (isCorrect) {
      const rewardResult = awardQuestionReward(sessionId, currentQ.id, roomCode);
      if (rewardResult.awarded) {
        pointsToAdd = rewardResult.pointsAdded;
        setCurrentScore((prev) => prev + pointsToAdd);
        setCorrectCount((prev) => prev + 1);
        setRecentRewardBurst({
          points: pointsToAdd,
          key: Date.now(),
        });
        if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
        rewardTimerRef.current = setTimeout(() => setRecentRewardBurst(null), 1700);
      }
    }

    const nextScore = currentScore + pointsToAdd;
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    setLiveLeaderboard((prev) =>
      prev.map((p) => {
        if (isCurrentPlayer(p)) {
          return {
            ...p,
            score: nextScore,
            correctAnswers: nextCorrectCount,
            accuracy: Math.round((nextCorrectCount / (currentIndex + 1)) * 100),
          };
        }
        // Only simulate answers for explicit practice bot opponents; real humans sync via Firestore/WebSocket
        if (mode === 'challenge' && (p.isBot || p.id.startsWith('bot-'))) {
          const peerCorrect = Math.random() < 0.65;
          const peerPoints = peerCorrect ? POINTS_PER_CORRECT : 0;
          const peerNewCorrect = peerCorrect ? p.correctAnswers + 1 : p.correctAnswers;
          const updatedBot = {
            ...p,
            score: p.score + peerPoints,
            correctAnswers: peerNewCorrect,
            accuracy: Math.round((peerNewCorrect / (currentIndex + 1)) * 100),
          };
          if (roomCode && !roomCode.startsWith('QZ-') && authMode === 'firebase') {
            void updateChallengeParticipantScoreInFirestore({
              code: roomCode,
              participantId: p.id,
              score: updatedBot.score,
              correctAnswers: updatedBot.correctAnswers,
              totalQuestions: questions.length,
              completed: currentIndex >= questions.length - 1,
            }).catch(() => {});
          }
          return updatedBot;
        }
        return p;
      })
    );

    // Sync live player progress immediately to Firestore & WebSocket
    if (mode === 'challenge' && roomCode && !roomCode.startsWith('QZ-')) {
      if (authMode === 'firebase') {
        void updateChallengeParticipantScoreInFirestore({
          code: roomCode,
          participantId: activePlayerId,
          score: nextScore,
          correctAnswers: nextCorrectCount,
          totalQuestions: questions.length,
          completed: false,
        }).catch(() => {});
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'score_progress',
            roomCode,
            playerId: activePlayerId,
            score: nextScore,
            correctAnswers: nextCorrectCount,
            totalQuestions: questions.length,
            completed: false,
          })
        );
      } else {
        fetch(`/api/rooms/${roomCode}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: activePlayerId,
            score: nextScore,
            correctAnswers: nextCorrectCount,
            totalQuestions: questions.length,
            completed: false,
          }),
        }).catch(() => {});
      }
    }
  };

  const handleChoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswerLocked || !stagedChoice.trim()) return;
    submitLockedAnswer(stagedChoice);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswerLocked || !textInput.trim()) return;
    submitLockedAnswer(textInput);
  };

  const handleScrambledSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswerLocked || selectedTileIds.length === 0) return;
    submitLockedAnswer(assembledScrambledWord);
  };

  const handlePickTile = (tileId: number) => {
    if (isAnswerLocked) return;
    setSelectedTileIds((prev) => (prev.includes(tileId) ? prev : [...prev, tileId]));
  };

  const handleRemovePlacedTile = (tileId: number) => {
    if (isAnswerLocked) return;
    setSelectedTileIds((prev) => prev.filter((id) => id !== tileId));
  };

  const handleResetTiles = () => {
    if (isAnswerLocked) return;
    setSelectedTileIds([]);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswerLocked(false);
    } else {
      handleCompleteQuiz();
    }
  };

  const progressPercent =
    questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const currentAnswer = currentQ ? selectedAnswers[currentQ.id] : undefined;
  const isCurrentAnswerCorrect =
    currentQ && currentAnswer ? evaluateQuestionAnswer(currentQ, currentAnswer) : false;

  const sortedLiveLeaderboard = [...liveLeaderboard].sort((a, b) => b.score - a.score);
  const foundRank = sortedLiveLeaderboard.findIndex((p) => isCurrentPlayer(p));
  const userRank = foundRank >= 0 ? foundRank + 1 : 1;

  return (
    <div className="min-h-screen w-full flex-1 bg-[#F7F4EF] flex flex-col justify-between p-3.5 sm:p-5 md:p-8 select-none overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-5 sm:space-y-6">
        {/* GAME HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EBE7DF] gap-3">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
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

          <div className="flex items-center flex-wrap gap-2 relative">
            {/* Live Rank & Points Earned Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#FFF0E3] border border-[#F47A18]/30 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs tabular-nums">
              <Trophy size={15} className="text-[#F47A18] shrink-0" />
              <span className="text-xs font-extrabold text-[#F47A18]">
                Rank #{userRank}
              </span>
              <span className="text-xs text-[#202B3C]/30">•</span>
              <span className="text-xs font-extrabold text-[#172337]" data-testid="session-points">
                {currentScore} pts
              </span>
            </div>

            {/* Animated Floating +5 Points Notification */}
            {recentRewardBurst && (
              <div
                key={recentRewardBurst.key}
                data-testid="points-notification"
                className="animate-points-pop pointer-events-none flex items-center gap-1 bg-[#239B70] text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md"
              >
                <Trophy size={12} className="text-amber-200" />
                <span>+{recentRewardBurst.points} Points!</span>
              </div>
            )}

            {/* Toggle mobile & tablet leaderboard modal */}
            {liveLeaderboard.length > 1 && (
              <button
                type="button"
                onClick={() => setShowMobileLeaderboard(true)}
                className="lg:hidden py-1.5 px-3 rounded-xl bg-white border border-[#E8E4DC] text-xs font-bold text-[#172337] flex items-center gap-1.5 cursor-pointer"
              >
                <Users size={14} className="text-[#F47A18]" />
                <span>Leaderboard</span>
              </button>
            )}

            {/* Timer Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold font-mono tabular-nums transition-colors ${
                secondsRemaining < 60
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'bg-white border border-[#E8E4DC] text-[#172337]'
              }`}
            >
              <Clock size={14} className={secondsRemaining < 60 ? 'text-red-600' : 'text-[#F47A18]'} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            {/* Exit button */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="w-9 h-9 rounded-full bg-white hover:bg-red-50 hover:text-red-600 border border-[#E8E4DC] flex items-center justify-center text-[#202B3C]/60 transition-colors cursor-pointer shrink-0"
              title="Exit Game"
              aria-label="Exit Game"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PROGRESS BAR WITH MILESTONE PERCENTAGE */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#202B3C]/65 tabular-nums">
            <span>Progress</span>
            <span className="text-[#F47A18]">{progressPercent}% complete</span>
          </div>
          <div className="w-full bg-[#E8E4DC] h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-[#F47A18] to-[#239B70] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* MAIN GAMEPLAY + LIVE LEADERBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question & Answer Card */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            {currentQ && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 border border-[#EBE7DF] shadow-md space-y-5 sm:space-y-6 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#202B3C]/60">
                  <span className="uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#F7F4EF] border border-[#E8E4DC] text-[#172337]">
                    {formatQuestionTypeLabel(currentQ.type)}
                  </span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-[#F47A18] font-bold">
                      +{POINTS_PER_CORRECT} Points / correct
                    </span>
                  </div>
                </div>

                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#172337] leading-snug font-['Outfit'] break-words">
                  {currentQ.question}
                </h2>

                {currentQ.type === 'scrambled_word' && currentQ.scrambledClue && (
                  <div className="p-3 rounded-2xl bg-[#FFF0E3]/70 border border-[#F47A18]/20 text-xs text-[#172337]">
                    <span className="font-bold text-[#F47A18]">Clue:</span> {currentQ.scrambledClue}
                  </div>
                )}

                {/* QUESTION-TYPE-SPECIFIC ANSWER INPUT AREA */}
                <div className="space-y-3 pt-1">
                  {/* 1. MULTIPLE CHOICE (Select -> Change Allowed -> Submit Answer) */}
                  {currentQ.type === 'multiple_choice' && (
                    <form onSubmit={handleChoiceSubmit} className="space-y-3">
                      <p className="text-xs font-semibold text-[#202B3C]/65">
                        Select one option (you can switch before submitting):
                      </p>

                      <div className="space-y-2.5">
                        {(currentQ.options || []).slice(0, 4).map((option, idx) => {
                          const isStaged = !isAnswerLocked && stagedChoice === option;
                          const isSubmittedChoice = isAnswerLocked && currentAnswer === option;
                          const isCorrectOption = evaluateQuestionAnswer(currentQ, option);

                          let cardStyle =
                            'bg-[#F7F4EF] hover:bg-[#FFF0E3]/50 hover:border-[#F47A18]/50 border-[#E8E4DC] text-[#202B3C] active:scale-[0.99]';

                          if (isStaged) {
                            cardStyle =
                              'bg-[#FFF0E3] border-[#F47A18] ring-2 ring-[#F47A18]/25 text-[#172337] font-bold shadow-xs';
                          } else if (isAnswerLocked) {
                            if (isCorrectOption) {
                              cardStyle =
                                'bg-[#239B70]/12 border-[#239B70] ring-2 ring-[#239B70]/20 text-[#239B70] font-bold shadow-xs animate-celebrate';
                            } else if (isSubmittedChoice) {
                              cardStyle =
                                'bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-700 font-bold';
                            } else {
                              cardStyle = 'bg-[#F7F4EF]/50 border-[#E8E4DC]/50 text-[#202B3C]/40';
                            }
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={isAnswerLocked}
                              onClick={() => setStagedChoice(option)}
                              aria-pressed={isStaged || isSubmittedChoice}
                              className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left text-sm md:text-base font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${cardStyle}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isStaged
                                      ? 'bg-[#F47A18] border-[#F47A18] text-white'
                                      : 'bg-white/80 border-current/20'
                                  }`}
                                >
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="leading-snug break-words">{option}</span>
                              </div>

                              {isStaged && (
                                <span className="text-[11px] font-extrabold text-[#F47A18] shrink-0">
                                  Selected
                                </span>
                              )}

                              {isAnswerLocked && (
                                <div className="shrink-0">
                                  {isCorrectOption && (
                                    <span className="text-[#239B70] font-bold text-xs flex items-center gap-1">
                                      <CheckCircle2 size={18} />
                                      <span className="hidden sm:inline">
                                        {isSubmittedChoice
                                          ? `+${POINTS_PER_CORRECT} Points!`
                                          : 'Correct answer'}
                                      </span>
                                    </span>
                                  )}
                                  {isSubmittedChoice && !isCorrectOption && (
                                    <span className="text-red-600 font-bold text-xs flex items-center gap-1">
                                      <XCircle size={18} />
                                      <span className="hidden sm:inline">Incorrect</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {!isAnswerLocked ? (
                        <button
                          type="submit"
                          disabled={!stagedChoice.trim()}
                          className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#172337] hover:bg-[#202B3C] disabled:bg-[#E8E4DC] disabled:text-[#202B3C]/40 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <div
                          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            isCurrentAnswerCorrect
                              ? 'bg-[#239B70]/10 text-[#239B70]'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {isCurrentAnswerCorrect ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>
                                Correct! +{POINTS_PER_CORRECT} Points!
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              <span>Incorrect. Correct answer: {currentQ.correctAnswer}</span>
                            </>
                          )}
                        </div>
                      )}
                    </form>
                  )}

                  {/* 2. SCRAMBLED WORDS (Interactive Letter Tiles + Answer Tray + Reset + Submit) */}
                  {currentQ.type === 'scrambled_word' && (
                    <form onSubmit={handleScrambledSubmit} className="space-y-4">
                      {/* Answer Construction Tray */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#202B3C]/70">
                            Tap letters below to spell your answer ({selectedTileIds.length}/
                            {scrambledTilePool.length}):
                          </span>
                          {!isAnswerLocked && (
                            <button
                              type="button"
                              onClick={handleResetTiles}
                              disabled={selectedTileIds.length === 0}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-[#F7F4EF] hover:bg-[#EBE7DF] disabled:opacity-40 text-xs font-bold text-[#172337] transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                              <RotateCcw size={13} />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>

                        <div
                          data-testid="scrambled-answer-tray"
                          className={`min-h-[64px] p-3 rounded-2xl border-2 border-dashed flex flex-wrap items-center gap-2 transition-colors ${
                            isAnswerLocked
                              ? isCurrentAnswerCorrect
                                ? 'bg-[#239B70]/10 border-[#239B70]'
                                : 'bg-red-50 border-red-400'
                              : 'bg-[#F7F4EF] border-[#E8E4DC]'
                          }`}
                        >
                          {selectedTileIds.length === 0 ? (
                            <span className="text-xs font-medium text-[#202B3C]/45 px-1">
                              Your assembled word will appear here...
                            </span>
                          ) : (
                            selectedTileIds.map((tileId) => {
                              const tile = scrambledTilePool.find((t) => t.id === tileId);
                              if (!tile) return null;
                              return (
                                <button
                                  key={tile.id}
                                  type="button"
                                  disabled={isAnswerLocked}
                                  onClick={() => handleRemovePlacedTile(tile.id)}
                                  className={`min-w-[44px] min-h-[44px] px-3 rounded-xl font-extrabold text-base shadow-xs border transition-all flex items-center justify-center ${
                                    isAnswerLocked
                                      ? isCurrentAnswerCorrect
                                        ? 'bg-[#239B70] border-[#239B70] text-white'
                                        : 'bg-red-600 border-red-600 text-white'
                                      : 'bg-[#F47A18] border-[#e0690f] text-white hover:bg-[#e0690f] cursor-pointer active:scale-95'
                                  }`}
                                  title={isAnswerLocked ? undefined : 'Click to remove letter'}
                                >
                                  {tile.char}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Scrambled Letter Pool */}
                      {!isAnswerLocked && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#202B3C]/55 block">
                            Available Letter Tiles
                          </span>
                          <div
                            className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#FAFAF8] border border-[#EBE7DF]"
                            data-testid="scrambled-letter-pool"
                          >
                            {scrambledTilePool.map((tile) => {
                              const isUsed = selectedTileIds.includes(tile.id);
                              return (
                                <button
                                  key={tile.id}
                                  type="button"
                                  disabled={isUsed}
                                  onClick={() => handlePickTile(tile.id)}
                                  aria-label={`Letter tile ${tile.char}`}
                                  className={`min-w-[44px] min-h-[44px] px-3 rounded-xl font-extrabold text-base border transition-all flex items-center justify-center ${
                                    isUsed
                                      ? 'bg-[#E8E4DC]/60 border-[#E8E4DC] text-[#202B3C]/25 cursor-not-allowed scale-95'
                                      : 'bg-white hover:bg-[#FFF0E3] border-[#E8E4DC] hover:border-[#F47A18] text-[#172337] shadow-xs cursor-pointer active:scale-95'
                                  }`}
                                >
                                  {tile.char}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!isAnswerLocked ? (
                        <button
                          type="submit"
                          disabled={selectedTileIds.length === 0}
                          className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#172337] hover:bg-[#202B3C] disabled:bg-[#E8E4DC] disabled:text-[#202B3C]/40 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <div
                          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            isCurrentAnswerCorrect
                              ? 'bg-[#239B70]/10 text-[#239B70]'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {isCurrentAnswerCorrect ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>
                                Unscrambled correctly! +{POINTS_PER_CORRECT} Points!
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              <span>Correct word: {currentQ.correctAnswer}</span>
                            </>
                          )}
                        </div>
                      )}
                    </form>
                  )}

                  {/* 3. IDENTIFICATION (Strict Text Input ONLY, Never Options) */}
                  {currentQ.type === 'identification' && (
                    <form onSubmit={handleTextSubmit} className="space-y-3">
                      <p className="text-xs font-semibold text-[#202B3C]/65">
                        Type the exact term, name, or concept (case &amp; extra spaces ignored):
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          disabled={isAnswerLocked}
                          value={isAnswerLocked ? currentAnswer || textInput : textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="Type the term or concept..."
                          className="flex-1 p-3.5 sm:p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm sm:text-base font-semibold text-[#172337] focus:outline-none focus:border-[#F47A18]"
                        />
                        {!isAnswerLocked && (
                          <button
                            type="submit"
                            disabled={!textInput.trim()}
                            className="py-3.5 px-5 rounded-2xl bg-[#172337] hover:bg-[#202B3C] disabled:bg-[#E8E4DC] disabled:text-[#202B3C]/40 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                          >
                            Submit Answer
                          </button>
                        )}
                      </div>

                      {isAnswerLocked && (
                        <div
                          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            isCurrentAnswerCorrect
                              ? 'bg-[#239B70]/10 text-[#239B70]'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {isCurrentAnswerCorrect ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>
                                Correct! +{POINTS_PER_CORRECT} Points!
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              <span>Correct answer: {currentQ.correctAnswer}</span>
                            </>
                          )}
                        </div>
                      )}
                    </form>
                  )}
                </div>

                {/* EXPLANATION FEEDBACK */}
                {isAnswerLocked && (
                  <div className="pt-2 animate-fade-in">
                    <div className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-xs leading-relaxed text-[#172337]">
                      <span className="font-bold text-[#F47A18] block mb-1">
                        💡 Study Explanation:
                      </span>
                      {currentQ.explanation ||
                        `The correct answer is: "${formatCorrectAnswerForDisplay(currentQ)}"`}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BOTTOM QUESTION CONTROLS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[#202B3C]/55 text-center sm:text-left">
                Each correct answer rewards +{POINTS_PER_CORRECT} points to your account!
              </p>

              <button
                type="button"
                disabled={!isAnswerLocked}
                onClick={handleNextQuestion}
                className={`w-full sm:w-auto py-3.5 px-8 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                  isAnswerLocked
                    ? 'bg-[#F47A18] hover:bg-[#e0690f] text-white shadow-[#F47A18]/25'
                    : 'bg-[#E8E4DC] text-[#202B3C]/40 cursor-not-allowed shadow-none'
                }`}
              >
                <span>
                  {currentIndex < questions.length - 1 ? 'Next question' : 'Finish challenge'}
                </span>
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
                    <h3 className="font-extrabold text-sm text-[#172337]">Live Leaderboard</h3>
                    <p className="text-[10px] text-[#202B3C]/50">
                      Resets to 0 for each new quiz
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-[#239B70]/10 text-[#239B70] px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              </div>

              <div className="space-y-2.5">
                {sortedLiveLeaderboard.map((item, index) => {
                  const isUser = isCurrentPlayer(item);
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
                          <p
                            className={`text-xs font-bold truncate ${
                              isUser ? 'text-[#F47A18]' : 'text-[#172337]'
                            }`}
                          >
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[#202B3C]/50">
                            {item.correctAnswers} correct
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <span className="text-xs font-extrabold text-[#172337] block">
                          {item.score} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-2xl bg-[#F7F4EF] text-[11px] text-[#202B3C]/65 leading-relaxed text-center">
                🎯 Correct answers earn{' '}
                <span className="font-bold text-[#F47A18]">+{POINTS_PER_CORRECT} points</span>.
                Incorrect or unanswered earn 0.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE & TABLET LIVE LEADERBOARD DRAWER */}
      {showMobileLeaderboard && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90dvh] flex flex-col p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[#F47A18]" />
                <h3 className="font-bold text-base text-[#172337]">Live Leaderboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileLeaderboard(false)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] flex items-center justify-center text-[#202B3C]/70 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1">
              {sortedLiveLeaderboard.map((item, index) => {
                const isUser = isCurrentPlayer(item);
                return (
                  <div
                    key={item.id || index}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isUser ? 'bg-[#FFF0E3] border-[#F47A18]' : 'bg-[#F7F4EF] border-[#E8E4DC]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-xs w-5 shrink-0">#{index + 1}</span>
                      <span
                        className={`text-xs font-bold truncate ${
                          isUser ? 'text-[#F47A18]' : 'text-[#172337]'
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[#172337] shrink-0 tabular-nums">
                      {item.score} pts
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-[#202B3C]/60 text-center">
              Session leaderboard starts at 0 for each quiz; earned points persist in your account.
            </p>

            <button
              type="button"
              onClick={() => setShowMobileLeaderboard(false)}
              className="w-full py-2.5 rounded-xl bg-[#172337] text-white font-bold text-xs cursor-pointer"
            >
              Back to Quiz
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM EXIT MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#172337]">Exit Quiz &amp; Reset?</h3>
            <p className="text-xs text-[#202B3C]/70">
              Exiting will end this match. Any points already earned on submitted correct answers remain safely in your account.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C] cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  exitGame();
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Exit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
