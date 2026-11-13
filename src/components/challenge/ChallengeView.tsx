import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { ChallengeArenaIllustration } from '../common/EducationalIllustrations';
import { getCategoryVisual } from '../../utils/categoryVisuals';
import { ChallengeRoomState, ParticipantScore } from '../../types';
import {
  Swords,
  Copy,
  Check,
  Play,
  Share2,
  UserPlus,
  AlertCircle,
  Loader2,
  Users,
  Crown,
  Clock,
  Trophy,
  CheckCircle2,
  Hourglass,
  Radio
} from 'lucide-react';

export const ChallengeView: React.FC = () => {
  const {
    user,
    quizzes,
    activities,
    selectedQuizForChallenge,
    currentRoom,
    setCurrentRoom,
    startGame,
    showToast
  } = useApp();

  const [challengeMode, setChallengeMode] = useState<'create' | 'join'>('create');

  const [selectedQuizId, setSelectedQuizId] = useState<string>(
    selectedQuizForChallenge?.id || quizzes[0]?.id || ''
  );
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [timeLimit, setTimeLimit] = useState<number>(10);
  const [gameMode, setGameMode] = useState<'Normal' | 'Hard'>('Normal');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const startedFromPollRef = useRef(false);

  const completedChallenges = activities.filter((a) => a.type === 'challenge');

  // Auto-open Join tab and pre-fill room code when arriving via ?challenge=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('challenge');
    if (codeFromUrl && codeFromUrl.trim()) {
      setChallengeMode('join');
      setJoinCodeInput(codeFromUrl.trim().toUpperCase());
    }
  }, []);

  // Sync selected quiz when chosen from My Quizzes or when quizzes list changes
  useEffect(() => {
    if (selectedQuizForChallenge) {
      setSelectedQuizId(selectedQuizForChallenge.id);
    } else if (!quizzes.some((q) => q.id === selectedQuizId)) {
      setSelectedQuizId(quizzes[0]?.id || '');
    }
  }, [selectedQuizForChallenge, quizzes, selectedQuizId]);

  const activeSelectedQuiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0];

  // Poll room updates if in waiting room
  useEffect(() => {
    if (!currentRoom) {
      startedFromPollRef.current = false;
      return;
    }

    if (currentRoom.code.startsWith('QZ-')) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${currentRoom.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            setCurrentRoom(data.room);
            if (data.room.status === 'active' && !startedFromPollRef.current) {
              startedFromPollRef.current = true;
              const quizToPlay = quizzes.find((q) => q.id === data.room.quizId) || activeSelectedQuiz;
              if (quizToPlay) {
                startGame(quizToPlay, 'challenge', data.room.timeLimitMinutes, data.room);
              }
            }
          }
        }
      } catch {
        // silent fail on poll
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentRoom?.code, currentRoom?.status, quizzes, activeSelectedQuiz]);

  // Create Challenge Room
  const handleCreateChallenge = async () => {
    if (!activeSelectedQuiz) {
      showToast('Please select a quiz to start a challenge.');
      return;
    }

    setIsCreatingRoom(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${activeSelectedQuiz.title} Challenge`,
          quizId: activeSelectedQuiz.id,
          questions: activeSelectedQuiz.questions,
          maxPlayers: playerCount,
          timeLimitMinutes: timeLimit,
          mode: gameMode,
          hostId: user?.id || 'player-user',
          hostName: user?.name || 'Matteo Llanora',
          hostAvatar: user?.avatar || 'M',
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setCurrentRoom(data.room);
        showToast(`Challenge Room ${data.room.code} created!`);
      } else {
        showToast(data.error || 'Could not create challenge room.');
      }
    } catch (err) {
      console.error('Failed to create room:', err);
      const localCode = `QZ-${Math.floor(1000 + Math.random() * 9000)}`;
      const localRoom: ChallengeRoomState = {
        code: localCode,
        title: `${activeSelectedQuiz.title} Challenge`,
        quizId: activeSelectedQuiz.id,
        questions: activeSelectedQuiz.questions,
        maxPlayers: playerCount,
        timeLimitMinutes: timeLimit,
        mode: gameMode,
        status: 'waiting',
        hostId: user?.id || 'player-user',
        createdAt: Date.now(),
        participants: [
          {
            id: user?.id || 'player-user',
            name: user?.name || 'Matteo Llanora',
            avatar: user?.avatar || 'M',
            score: 0,
            correctAnswers: 0,
            totalQuestions: activeSelectedQuiz.questions.length,
            accuracy: 0,
            completed: false,
            isHost: true,
          },
        ],
      };
      setCurrentRoom(localRoom);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join room by code
  const handleJoinChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a room code.');
      return;
    }

    setIsJoiningRoom(true);
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: user?.id || 'player-user',
          playerName: user?.name || 'Guest Student',
          avatar: user?.avatar || 'G',
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setCurrentRoom(data.room);
        showToast(`Joined Room ${data.room.code}!`);
      } else {
        setJoinError(data.error || 'Room not found or game already active.');
      }
    } catch {
      setJoinError('Could not reach room. Please check the code.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Add simulated classmate bot
  const handleAddClassmateBot = async () => {
    if (!currentRoom || isAddingBot) return;

    const currentCount = currentRoom.participants.length;
    if (currentCount >= currentRoom.maxPlayers) {
      showToast('Room has reached max players limit.');
      return;
    }

    const botNames = [
      { name: 'Sarah K.', avatar: 'S' },
      { name: 'Liam M.', avatar: 'L' },
      { name: 'David P.', avatar: 'D' },
      { name: 'Emma Watson', avatar: 'E' },
    ];
    const bot = botNames[(currentCount - 1) % botNames.length];

    if (!currentRoom.code.startsWith('QZ-')) {
      setIsAddingBot(true);
      try {
        const res = await fetch(`/api/rooms/${currentRoom.code}/add-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botName: bot.name, avatar: bot.avatar }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          setCurrentRoom(data.room);
          showToast(`Added classmate ${data.addedBot?.name || bot.name}!`);
          return;
        }
        showToast(data.error || 'Could not add classmate.');
        return;
      } catch {
        // fall through to local update if network fails
      } finally {
        setIsAddingBot(false);
      }
    }

    const newParticipant: ParticipantScore = {
      id: `bot-${Date.now()}-${currentCount}`,
      name: bot.name,
      avatar: bot.avatar,
      score: 0,
      correctAnswers: 0,
      totalQuestions: currentRoom.questions.length,
      accuracy: 0,
      completed: false,
    };

    setCurrentRoom({
      ...currentRoom,
      participants: [...currentRoom.participants, newParticipant],
    });
    showToast(`Added classmate ${bot.name}!`);
  };

  // Start the live challenge
  const handleStartChallengeNow = async () => {
    if (!currentRoom) return;

    if (!currentRoom.code.startsWith('QZ-')) {
      try {
        await fetch(`/api/rooms/${currentRoom.code}/start`, { method: 'POST' });
      } catch {
        // continue into local game even if offline
      }
    }

    const quizToPlay = quizzes.find((q) => q.id === currentRoom.quizId) || activeSelectedQuiz;
    if (!quizToPlay) {
      showToast('Quiz data not found for this room.');
      return;
    }
    startedFromPollRef.current = true;
    startGame(quizToPlay, 'challenge', currentRoom.timeLimitMinutes, currentRoom);
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard?.writeText(currentRoom.code).catch(() => {});
    setCopiedCode(true);
    showToast(`Copied room code: ${currentRoom.code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!currentRoom) return;
    const link = `${window.location.origin}?challenge=${currentRoom.code}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    showToast('Copied challenge invite link!');
  };

  // Waiting Room View
  if (currentRoom && currentRoom.status === 'waiting') {
    const emptySeatsCount = Math.max(0, currentRoom.maxPlayers - currentRoom.participants.length);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Header
          title="Challenge Waiting Room"
          subtitle="Friends can join using the room code below. Once everyone is ready, start the match."
        />

        {/* Room Code Showcase Card */}
        <div className="bg-gradient-to-br from-[#172337] to-[#23344f] text-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-lg text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F47A18]/20 border border-[#F47A18]/40 text-xs font-bold text-[#FFF0E3]">
            <Hourglass size={13} className="text-[#F47A18]" />
            <span>Status: Waiting for Players</span>
          </div>

          <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-widest text-white font-mono break-all">
            {currentRoom.code}
          </div>

          <p className="text-xs text-white/75 max-w-sm mx-auto">
            Share this 6-character room code with your classmates or send them the direct invite link.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="py-2.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Room Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 size={16} />
              <span>Copy Invitation Link</span>
            </button>
          </div>
        </div>

        {/* Participants Roster */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F0EEE9]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#F47A18]" />
                <h3 className="font-extrabold text-base text-[#172337] tabular-nums">
                  Joined Participants ({currentRoom.participants.length} / {currentRoom.maxPlayers})
                </h3>
              </div>
              <p className="text-xs text-[#202B3C]/65 mt-0.5 break-words">
                Quiz: {currentRoom.title} · {currentRoom.timeLimitMinutes} min · {currentRoom.mode} mode
              </p>
            </div>

            {currentRoom.participants.length < currentRoom.maxPlayers && (
              <button
                type="button"
                onClick={handleAddClassmateBot}
                disabled={isAddingBot}
                className="py-2 px-3 rounded-xl bg-[#FFF0E3] hover:bg-[#ffe4cc] text-[#F47A18] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
              >
                <UserPlus size={14} />
                <span>{isAddingBot ? 'Adding...' : '+ Add Classmate'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentRoom.participants.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#F47A18] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {p.avatar || p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#172337] flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{p.name}</span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-[#FFF0E3] text-[#F47A18] px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                          <Crown size={10} /> Host
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#239B70] font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} /> Ready to play
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {Array.from({ length: emptySeatsCount }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FDFCFB] text-[#202B3C]/45"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#F7F4EF] flex items-center justify-center shrink-0">
                  <UserPlus size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold">Open Player Seat</p>
                  <p className="text-[11px]">Waiting for classmate to join</p>
                </div>
              </div>
            ))}
          </div>

          {currentRoom.participants.length === 1 && (
            <div className="p-3.5 rounded-2xl bg-[#FFF0E3]/60 border border-[#F47A18]/25 text-[#172337] text-xs">
              Waiting for friends to join... or click &ldquo;+ Add Classmate&rdquo; to test a group match right now!
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setCurrentRoom(null)}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-[#E8E4DC] hover:bg-white text-xs font-bold text-[#202B3C] cursor-pointer"
          >
            Leave Room
          </button>
          <button
            type="button"
            onClick={handleStartChallengeNow}
            className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-sm shadow-lg shadow-[#F47A18]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            <span>Start Challenge Now</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 min-w-0">
      <Header
        title="Play and learn together"
        subtitle="Challenge classmates with your saved study quizzes and compare scores on the live leaderboard."
      />

      {/* Exciting Challenge Arena Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#172337] via-[#1c2b43] to-[#263856] rounded-3xl p-5 sm:p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[#F47A18]">
                <Hourglass size={13} /> Waiting Lobby
              </span>
              <span className="text-white/30">·</span>
              <span className="inline-flex items-center gap-1.5 text-[#239B70]">
                <Radio size={13} /> Live Scoring
              </span>
              <span className="text-white/30">·</span>
              <span className="inline-flex items-center gap-1.5 text-white/80">
                <Trophy size={13} className="text-amber-400" /> Instant Rankings
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold font-['Outfit'] tracking-tight">
              Head-to-Head &amp; Group Study Matches
            </h2>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
              Create a study room in one tap, invite up to 6 classmates with a 6-character code, and race for top accuracy.
            </p>
          </div>

          <div className="hidden md:flex items-center justify-center shrink-0">
            <ChallengeArenaIllustration className="w-44 h-auto" />
          </div>
        </div>
      </div>

      {/* Tabs: Create Challenge vs Join Challenge */}
      <div className="flex items-center bg-[#F0EEE9] p-1.5 rounded-2xl w-full sm:max-w-md">
        <button
          type="button"
          onClick={() => setChallengeMode('create')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            challengeMode === 'create'
              ? 'bg-white text-[#172337] shadow-xs'
              : 'text-[#202B3C]/70 hover:text-[#172337]'
          }`}
        >
          <Swords size={14} className={challengeMode === 'create' ? 'text-[#F47A18]' : ''} />
          <span>Create Challenge</span>
        </button>
        <button
          type="button"
          onClick={() => setChallengeMode('join')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            challengeMode === 'join'
              ? 'bg-white text-[#172337] shadow-xs'
              : 'text-[#202B3C]/70 hover:text-[#172337]'
          }`}
        >
          <Users size={14} className={challengeMode === 'join' ? 'text-[#F47A18]' : ''} />
          <span>Join with Room Code</span>
        </button>
      </div>

      {/* JOIN WITH ROOM CODE VIEW */}
      {challengeMode === 'join' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 border border-[#EBE7DF] shadow-xs max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center mx-auto mb-2">
            <Swords size={24} />
          </div>
          <h3 className="text-xl font-bold text-[#172337] text-center font-['Outfit']">
            Enter 6-Character Room Code
          </h3>
          <p className="text-xs text-[#202B3C]/70 text-center">
            Your classmate or host generated a unique room code. Enter it below to join the match.
          </p>

          {joinError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoinChallenge} className="space-y-4 pt-2">
            <div>
              <input
                type="text"
                maxLength={10}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. QZ8492"
                className="w-full text-center text-xl sm:text-2xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] focus:outline-none focus:border-[#F47A18] uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isJoiningRoom}
              className="w-full py-3.5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer disabled:opacity-60"
            >
              {isJoiningRoom ? 'Connecting...' : 'Join Challenge Room'}
            </button>
          </form>
        </div>
      )}

      {/* CREATE CHALLENGE VIEW */}
      {challengeMode === 'create' && (
        <div className="space-y-6">
          {/* Section 1: Choose a saved quiz */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              CHOOSE A SAVED QUIZ
            </h3>

            {quizzes.length === 0 ? (
              <p className="text-xs text-[#202B3C]/60">No saved quizzes yet. Generate or create one first!</p>
            ) : (
              <div className="space-y-2.5">
                {quizzes.map((quiz) => {
                  const isSelected = selectedQuizId === quiz.id;
                  const catVisual = getCategoryVisual(quiz.category, quiz.title);
                  const CategoryIcon = catVisual.icon;

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className={`quizian-card w-full min-w-0 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#FFF0E3]/70 border-[#F47A18] shadow-xs'
                          : 'bg-[#F7F4EF] border-[#E8E4DC] hover:bg-[#F0EEE9]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#F47A18] text-white'
                              : `${catVisual.bgClass} ${catVisual.textClass} border ${catVisual.borderClass}`
                          }`}
                        >
                          <CategoryIcon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#172337] truncate">
                            {quiz.title}
                          </h4>
                          <p className="text-xs text-[#202B3C]/60 mt-0.5 tabular-nums">
                            {catVisual.label} · {quiz.questions.length} questions · {quiz.difficulty}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F47A18] text-white shadow-xs shrink-0">
                          Selected
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#202B3C]/60 hover:text-[#172337] shrink-0">
                          Select
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Challenge Settings */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              CHALLENGE SETTINGS
            </h3>

            {/* Players */}
            <div>
              <label className="block text-xs font-bold text-[#172337] mb-2">
                Group Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[2, 3, 4, 6].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlayerCount(p)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      playerCount === p
                        ? 'bg-[#F47A18] text-white shadow-xs'
                        : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    <Users size={14} />
                    <span>{p} players</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time limit */}
            <div>
              <label className="block text-xs font-bold text-[#172337] mb-2">
                Time limit
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[5, 10, 20].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeLimit(t)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      timeLimit === t
                        ? 'bg-[#172337] text-white shadow-xs'
                        : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    <Clock size={14} />
                    <span>{t} min</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Game mode */}
            <div>
              <label className="block text-xs font-bold text-[#172337] mb-2">
                Game mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['Normal', 'Hard'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGameMode(mode)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      gameMode === mode
                        ? 'bg-[#F47A18] text-white shadow-xs'
                        : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    {mode} {mode === 'Hard' ? '⚡ (Fast pace)' : '🎯 (Standard)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Challenge Button */}
            <button
              type="button"
              onClick={handleCreateChallenge}
              disabled={isCreatingRoom}
              className="w-full py-4 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-base shadow-lg shadow-[#F47A18]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-60"
            >
              {isCreatingRoom ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Creating Room...</span>
                </>
              ) : (
                <>
                  <Swords size={20} />
                  <span>Create challenge</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-[#202B3C]/60">
              Invite friends with a code: Share a link or 6-character room code.
            </p>
          </div>
        </div>
      )}

      {/* COMPLETED CHALLENGES & LEADERBOARD PREVIEW */}
      {completedChallenges.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0EEE9]">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-[#F47A18]" />
              <h3 className="text-sm font-extrabold text-[#172337] font-['Outfit']">
                Completed Challenges &amp; Podium Results
              </h3>
            </div>
            <span className="text-xs font-bold text-[#239B70] flex items-center gap-1">
              <CheckCircle2 size={14} /> {completedChallenges.length} Completed
            </span>
          </div>

          <div className="space-y-3">
            {completedChallenges.slice(0, 3).map((match) => (
              <div
                key={match.id}
                className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#172337] truncate">
                      {match.quizTitle}
                    </h4>
                    <p className="text-xs text-[#202B3C]/60 tabular-nums">
                      {match.date} · {match.opponentCount || 2} players · {match.accuracy}% accuracy
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-xs font-extrabold text-[#F47A18]">
                      Rank #{match.rank || 1}
                    </span>
                    <span className="text-xs font-extrabold text-[#172337]">
                      {match.score} pts
                    </span>
                  </div>
                </div>

                {match.leaderboard && match.leaderboard.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {match.leaderboard.slice(0, 3).map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#EBE7DF] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-white'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-800'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#172337] truncate">{p.name}</span>
                        </div>
                        <span className="font-extrabold text-[#F47A18] shrink-0 tabular-nums">
                          {p.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
