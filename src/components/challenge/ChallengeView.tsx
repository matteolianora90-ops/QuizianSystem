import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { Quiz, ChallengeRoomState, ParticipantScore } from '../../types';
import { 
  Swords, 
  Users, 
  Clock, 
  Copy, 
  Check, 
  Play, 
  Share2, 
  Sparkles, 
  UserPlus, 
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export const ChallengeView: React.FC = () => {
  const { 
    user, 
    quizzes, 
    selectedQuizForChallenge, 
    setSelectedQuizForChallenge,
    currentRoom,
    setCurrentRoom,
    startGame,
    showToast
  } = useApp();

  // Mode: 'setup' | 'waiting'
  const [challengeMode, setChallengeMode] = useState<'create' | 'join'>('create');

  // Setup options
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
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync selected quiz
  useEffect(() => {
    if (selectedQuizForChallenge) {
      setSelectedQuizId(selectedQuizForChallenge.id);
    }
  }, [selectedQuizForChallenge]);

  const activeSelectedQuiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0];

  // Poll room updates if in waiting room
  useEffect(() => {
    if (!currentRoom) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${currentRoom.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            setCurrentRoom(data.room);
            // If room became active and user is not host, start game!
            if (data.room.status === 'active') {
              const quizToPlay = quizzes.find((q) => q.id === data.room.quizId) || activeSelectedQuiz;
              startGame(quizToPlay, 'challenge', data.room.timeLimitMinutes, data.room);
            }
          }
        }
      } catch (err) {
        // silent fail on poll
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentRoom?.code, currentRoom?.status]);

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
          hostName: user?.name || 'Matteo Llanora',
          hostAvatar: user?.avatar || 'M',
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setCurrentRoom(data.room);
        showToast(`Challenge Room ${data.room.code} created!`);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
      // Local fallback room
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
        hostId: user?.id || 'host-1',
        createdAt: Date.now(),
        participants: [
          {
            id: user?.id || 'host-1',
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
      setJoinError('Please enter a 6-character room code.');
      return;
    }

    setIsJoiningRoom(true);
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    } catch (err: any) {
      setJoinError('Could not reach room. Please check the code.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Add simulated classmate bot so user can test multiplayer dynamics instantly!
  const handleAddClassmateBot = () => {
    if (!currentRoom) return;
    const botNames = [
      { name: 'Sarah K.', avatar: 'S' },
      { name: 'Liam M.', avatar: 'L' },
      { name: 'David P.', avatar: 'D' },
      { name: 'Emma Watson', avatar: 'E' },
    ];

    const currentCount = currentRoom.participants.length;
    if (currentCount >= currentRoom.maxPlayers) {
      showToast('Room has reached max players limit.');
      return;
    }

    const bot = botNames[(currentCount - 1) % botNames.length];
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

    const updatedRoom: ChallengeRoomState = {
      ...currentRoom,
      participants: [...currentRoom.participants, newParticipant],
    };
    setCurrentRoom(updatedRoom);
    showToast(`Added classmate ${bot.name}!`);
  };

  // Start the live challenge
  const handleStartChallengeNow = async () => {
    if (!currentRoom) return;

    try {
      await fetch(`/api/rooms/${currentRoom.code}/start`, { method: 'POST' });
    } catch (e) {
      // pass
    }

    const quizToPlay = quizzes.find((q) => q.id === currentRoom.quizId) || activeSelectedQuiz;
    startGame(quizToPlay, 'challenge', currentRoom.timeLimitMinutes, currentRoom);
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopiedCode(true);
    showToast(`Copied room code: ${currentRoom.code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!currentRoom) return;
    const link = `${window.location.origin}?challenge=${currentRoom.code}`;
    navigator.clipboard.writeText(link);
    showToast('Copied challenge invite link!');
  };

  // If already in a room waiting room, render the waiting room
  if (currentRoom && currentRoom.status === 'waiting') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-8">
        <Header
          title="Challenge Waiting Room"
          subtitle="Friends can join using the room code below. Once everyone is ready, start the match."
        />

        {/* Room Code Showcase Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EBE7DF] shadow-md text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
            Room Code
          </span>
          <div className="text-4xl md:text-5xl font-extrabold tracking-widest text-[#172337] font-mono">
            {currentRoom.code}
          </div>

          <p className="text-xs text-[#202B3C]/70 max-w-sm mx-auto">
            Share this 6-character room code with your classmates or send them the direct link.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleCopyCode}
              className="py-2.5 px-4 rounded-xl bg-[#FFF0E3] hover:bg-[#ffe3cc] text-[#F47A18] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Room Code'}</span>
            </button>
            <button
              onClick={handleCopyInviteLink}
              className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-[#202B3C] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 size={16} />
              <span>Copy Invitation Link</span>
            </button>
          </div>
        </div>

        {/* Participants Roster */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE9]">
            <div>
              <h3 className="font-extrabold text-base text-[#172337]">
                Joined Participants ({currentRoom.participants.length} / {currentRoom.maxPlayers})
              </h3>
              <p className="text-xs text-[#202B3C]/60 mt-0.5">
                Quiz: {currentRoom.title} • {currentRoom.timeLimitMinutes} min • {currentRoom.mode} mode
              </p>
            </div>

            {currentRoom.participants.length < currentRoom.maxPlayers && (
              <button
                onClick={handleAddClassmateBot}
                className="py-1.5 px-3 rounded-xl bg-[#FFF0E3] hover:bg-[#ffe4cc] text-[#F47A18] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} />
                <span>+ Add Classmate</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentRoom.participants.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F47A18] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {p.avatar || p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#172337] flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] bg-[#FFF0E3] text-[#F47A18] px-2 py-0.5 rounded-md font-bold uppercase">
                          Host
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#239B70] font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#239B70] inline-block animate-pulse" />
                      Ready to play
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {currentRoom.participants.length === 1 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span>Waiting for friends to join... or click "+ Add Classmate" to test group match right now!</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentRoom(null)}
            className="py-3 px-5 rounded-2xl border border-[#E8E4DC] hover:bg-white text-xs font-bold text-[#202B3C]"
          >
            Leave Room
          </button>
          <button
            onClick={handleStartChallengeNow}
            className="py-3.5 px-8 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-sm shadow-lg shadow-[#F47A18]/25 flex items-center gap-2 cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            <span>Start Challenge Now</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <Header
        title="Play and learn together"
        subtitle="Challenge classmates with your saved study quizzes and compare scores on the live leaderboard."
      />

      {/* Tabs: Create Challenge vs Join Challenge */}
      <div className="flex items-center bg-[#F0EEE9] p-1.5 rounded-2xl max-w-sm">
        <button
          onClick={() => setChallengeMode('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            challengeMode === 'create'
              ? 'bg-white text-[#172337] shadow-xs'
              : 'text-[#202B3C]/70 hover:text-[#172337]'
          }`}
        >
          Create Challenge
        </button>
        <button
          onClick={() => setChallengeMode('join')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            challengeMode === 'join'
              ? 'bg-white text-[#172337] shadow-xs'
              : 'text-[#202B3C]/70 hover:text-[#172337]'
          }`}
        >
          Join with Room Code
        </button>
      </div>

      {/* JOIN WITH ROOM CODE VIEW */}
      {challengeMode === 'join' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EBE7DF] shadow-xs max-w-md mx-auto space-y-4">
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
                maxLength={6}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. QZ8492"
                className="w-full text-center text-2xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] focus:outline-none focus:border-[#F47A18] uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isJoiningRoom}
              className="w-full py-3.5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer"
            >
              {isJoiningRoom ? 'Connecting...' : 'Join Challenge Room'}
            </button>
          </form>
        </div>
      )}

      {/* CREATE CHALLENGE VIEW (Matches Prototype Page 3) */}
      {challengeMode === 'create' && (
        <div className="space-y-6">
          {/* Section 1: Choose a saved quiz */}
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              CHOOSE A SAVED QUIZ
            </h3>

            {quizzes.length === 0 ? (
              <p className="text-xs text-[#202B3C]/60">No saved quizzes yet. Generate or create one first!</p>
            ) : (
              <div className="space-y-2.5">
                {quizzes.map((quiz) => {
                  const isSelected = selectedQuizId === quiz.id;
                  return (
                    <div
                      key={quiz.id}
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FFF0E3]/70 border-[#F47A18] shadow-xs'
                          : 'bg-[#F7F4EF] border-[#E8E4DC] hover:bg-[#F0EEE9]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-sm shrink-0 ${
                            isSelected ? 'bg-[#F47A18] text-white' : 'bg-white text-[#202B3C]'
                          }`}
                        >
                          Q
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#172337] truncate">
                            {quiz.title}
                          </h4>
                          <p className="text-xs text-[#202B3C]/60 mt-0.5">
                            {quiz.questions.length} questions • {quiz.difficulty}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F47A18] text-white shadow-xs">
                          Selected
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#202B3C]/60 hover:text-[#172337]">
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
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              CHALLENGE SETTINGS
            </h3>

            {/* Players */}
            <div>
              <label className="block text-xs font-bold text-[#172337] mb-2">
                Players
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {[2, 3, 4, 6].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlayerCount(p)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      playerCount === p
                        ? 'bg-[#F47A18] text-white shadow-xs'
                        : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    {p} players
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
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      timeLimit === t
                        ? 'bg-[#172337] text-white shadow-xs'
                        : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            {/* Game mode */}
            <div>
              <label className="block text-xs font-bold text-[#172337] mb-2">
                Game mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
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
                    {mode} {mode === 'Hard' ? '⚡ (Fast timer)' : '🎯 (Standard)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Challenge Button */}
            <button
              onClick={handleCreateChallenge}
              disabled={isCreatingRoom}
              className="w-full py-4 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-base shadow-lg shadow-[#F47A18]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
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

            {/* Info notice */}
            <p className="text-center text-xs text-[#202B3C]/60">
              Invite friends with a code: Share a link or 6-character room code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
