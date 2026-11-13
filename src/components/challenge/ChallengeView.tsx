import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { ChallengeArenaIllustration } from '../common/EducationalIllustrations';
import { getCategoryVisual } from '../../utils/categoryVisuals';
import { ChallengeRoomState, ParticipantScore, Quiz } from '../../types';
import {
  addBotParticipantToFirestore,
  createChallengeRoomInFirestore,
  joinChallengeRoomInFirestore,
  startChallengeRoomInFirestore,
  subscribeToChallengeRoom,
} from '../../utils/firestoreSync';
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
  Radio,
  Mail,
  Send,
  Bot,
  X,
} from 'lucide-react';

export const ChallengeView: React.FC = () => {
  const {
    user,
    authMode,
    quizzes,
    activities,
    selectedQuizForChallenge,
    currentRoom,
    setCurrentRoom,
    pendingInvitations,
    sendChallengeInvite,
    acceptChallengeInvite,
    declineChallengeInvite,
    startGame,
    showToast,
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

  // Direct email invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ isError: boolean; text: string } | null>(
    null
  );

  const startedFromRealtimeRef = useRef(false);

  const completedChallenges = activities.filter((a) => a.type === 'challenge');

  // Reconstruct the exact shared Quiz from room.questions so joiners across devices play the identical quiz
  const buildQuizFromRoom = (room: ChallengeRoomState): Quiz => {
    const localMatch = quizzes.find((q) => q.id === room.quizId);
    const today = new Date().toISOString().split('T')[0];
    return {
      id: room.quizId || localMatch?.id || `room-quiz-${room.code}`,
      title: room.title.replace(/\s+Challenge$/i, '') || localMatch?.title || 'Challenge Quiz',
      description: localMatch?.description || 'Live multiplayer study challenge.',
      category: localMatch?.category || 'Challenge',
      difficulty:
        room.mode === 'Hard' ? 'Hard' : localMatch?.difficulty || 'Medium',
      questions:
        Array.isArray(room.questions) && room.questions.length > 0
          ? room.questions
          : localMatch?.questions || [],
      createdAt: localMatch?.createdAt || today,
      updatedAt: today,
      timesPlayed: localMatch?.timesPlayed || 0,
    };
  };

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

  // Real-time room updates via Firestore onSnapshot AND Express WebSocket/Polling fallback
  useEffect(() => {
    if (!currentRoom) {
      startedFromRealtimeRef.current = false;
      return;
    }

    if (currentRoom.code.startsWith('QZ-')) return;

    const handleRoomTransition = (updatedRoom: ChallengeRoomState) => {
      setCurrentRoom(updatedRoom);
      if (updatedRoom.status === 'active' && !startedFromRealtimeRef.current) {
        startedFromRealtimeRef.current = true;
        const quizToPlay = buildQuizFromRoom(updatedRoom);
        if (quizToPlay.questions.length > 0) {
          startGame(quizToPlay, 'challenge', updatedRoom.timeLimitMinutes, updatedRoom);
        }
      }
    };

    if (authMode === 'firebase') {
      const unsub = subscribeToChallengeRoom(currentRoom.code, (room) => {
        if (room) {
          handleRoomTransition(room);
        }
      });
      return () => unsub();
    }

    // Demo / Express mode: WebSocket + lightweight polling backup
    let socket: WebSocket | null = null;
    try {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${wsProto}//${window.location.host}/ws/challenges`);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: 'subscribe', roomCode: currentRoom.code }));
      };
      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.type === 'room_update' && msg.room) {
            handleRoomTransition(msg.room);
          }
        } catch {
          // ignore
        }
      };
      socket.onerror = () => {};
    } catch {
      // fallback to polling below
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${currentRoom.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            handleRoomTransition(data.room);
          }
        }
      } catch {
        // silent fail on poll
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
    };
  }, [currentRoom?.code, currentRoom?.status, authMode]);

  // Create Challenge Room
  const handleCreateChallenge = async () => {
    if (!activeSelectedQuiz) {
      showToast('Please select a quiz to start a challenge.');
      return;
    }

    setIsCreatingRoom(true);
    try {
      if (authMode === 'firebase' && user) {
        const cloudRoom = await createChallengeRoomInFirestore({
          quiz: activeSelectedQuiz,
          maxPlayers: playerCount,
          timeLimitMinutes: timeLimit,
          mode: gameMode,
          hostProfile: user,
        });
        // Mirror room to Express server if available (best effort)
        fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cloudRoom.code,
            title: cloudRoom.title,
            quizId: cloudRoom.quizId,
            questions: cloudRoom.questions,
            maxPlayers: cloudRoom.maxPlayers,
            timeLimitMinutes: cloudRoom.timeLimitMinutes,
            mode: cloudRoom.mode,
            hostId: cloudRoom.hostId,
            hostName: user.name,
            hostAvatar: user.avatar,
          }),
        }).catch(() => {});

        setCurrentRoom(cloudRoom);
        showToast(`Cloud Challenge Room ${cloudRoom.code} created!`);
        return;
      }

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
            isBot: false,
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
      if (authMode === 'firebase' && user) {
        const joinedRoom = await joinChallengeRoomInFirestore(cleanCode, user);
        setCurrentRoom(joinedRoom);
        showToast(`Joined Room ${joinedRoom.code}!`);
        return;
      }

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
    } catch (err: any) {
      setJoinError(err?.message || 'Could not reach room. Please check the code.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Add simulated practice bot (host only or offline)
  const handleAddClassmateBot = async () => {
    if (!currentRoom || isAddingBot) return;

    const currentCount = currentRoom.participants.length;
    if (currentCount >= currentRoom.maxPlayers) {
      showToast('Room has reached max players limit.');
      return;
    }

    const botNames = [
      { name: 'Sarah K. (Bot)', avatar: 'S' },
      { name: 'Liam M. (Bot)', avatar: 'L' },
      { name: 'David P. (Bot)', avatar: 'D' },
      { name: 'Emma W. (Bot)', avatar: 'E' },
    ];
    const bot = botNames[(currentCount - 1) % botNames.length];

    if (!currentRoom.code.startsWith('QZ-')) {
      setIsAddingBot(true);
      try {
        if (authMode === 'firebase') {
          const added = await addBotParticipantToFirestore(
            currentRoom.code,
            bot.name,
            bot.avatar,
            currentRoom.questions.length
          );
          showToast(`Added practice opponent ${added.name}!`);
          return;
        }

        const res = await fetch(`/api/rooms/${currentRoom.code}/add-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botName: bot.name,
            avatar: bot.avatar,
            hostId: user?.id || currentRoom.hostId,
          }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          setCurrentRoom(data.room);
          showToast(`Added practice opponent ${data.addedBot?.name || bot.name}!`);
          return;
        }
        showToast(data.error || 'Could not add practice bot.');
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
      isHost: false,
      isBot: true,
    };

    setCurrentRoom({
      ...currentRoom,
      participants: [...currentRoom.participants, newParticipant],
    });
    showToast(`Added practice opponent ${bot.name}!`);
  };

  const handleSendInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom) return;
    setInviteFeedback(null);
    setIsSendingInvite(true);
    try {
      const res = await sendChallengeInvite(currentRoom.code, currentRoom.title, inviteEmail);
      setInviteFeedback({ isError: !res.success, text: res.message });
      if (res.success) {
        setInviteEmail('');
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Start the live challenge
  const handleStartChallengeNow = async () => {
    if (!currentRoom) return;

    const quizToPlay = buildQuizFromRoom(currentRoom);
    if (quizToPlay.questions.length === 0) {
      showToast('Quiz data not found for this room.');
      return;
    }

    // Lock realtime listener before awaiting start so Firestore latency-compensated snapshot / WS update never triggers a duplicate startGame()
    startedFromRealtimeRef.current = true;

    if (!currentRoom.code.startsWith('QZ-')) {
      if (authMode === 'firebase') {
        try {
          await startChallengeRoomInFirestore(currentRoom.code);
        } catch {
          startedFromRealtimeRef.current = false;
          showToast('Only the room host can start the challenge.');
          return;
        }
      } else {
        try {
          const res = await fetch(`/api/rooms/${currentRoom.code}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: user?.id || currentRoom.hostId }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            startedFromRealtimeRef.current = false;
            showToast(errData.error || 'Could not start the challenge.');
            return;
          }
        } catch {
          // continue into local game even if offline
        }
      }
    }

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
    const link = `${window.location.origin}${window.location.pathname}?challenge=${currentRoom.code}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    showToast('Copied challenge invite link!');
  };

  // Waiting Room View
  if (currentRoom && currentRoom.status === 'waiting') {
    const emptySeatsCount = Math.max(0, currentRoom.maxPlayers - currentRoom.participants.length);
    const isHost = currentRoom.hostId === user?.id || currentRoom.participants.some((p) => p.id === user?.id && p.isHost);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Header
          title="Challenge Waiting Room"
          subtitle="Invite classmates by email, room code, or link. Once everyone is ready, start the match."
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

        {/* Invite Friend by Email Card */}
        {isHost && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-[#F47A18]" />
              <h3 className="font-extrabold text-sm text-[#172337]">Invite Classmate Directly</h3>
            </div>
            <p className="text-xs text-[#202B3C]/65">
              Send an in-app challenge notification directly to a classmate signed in with Google or Firebase.
            </p>
            <form onSubmit={handleSendInviteEmail} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="classmate@gmail.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
              />
              <button
                type="submit"
                disabled={isSendingInvite}
                className="py-2.5 px-4 rounded-xl bg-[#172337] hover:bg-[#202B3C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
              >
                {isSendingInvite ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{isSendingInvite ? 'Sending...' : 'Send Invite'}</span>
              </button>
            </form>
            {inviteFeedback && (
              <p
                className={`text-xs font-medium ${
                  inviteFeedback.isError ? 'text-red-600' : 'text-[#239B70]'
                }`}
              >
                {inviteFeedback.text}
              </p>
            )}
          </div>
        )}

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
                Quiz: {currentRoom.title} · {currentRoom.questions.length} Qs ·{' '}
                {currentRoom.timeLimitMinutes} min · {currentRoom.mode} mode
              </p>
            </div>

            {isHost && currentRoom.participants.length < currentRoom.maxPlayers && (
              <button
                type="button"
                onClick={handleAddClassmateBot}
                disabled={isAddingBot}
                className="py-2 px-3 rounded-xl bg-[#FFF0E3] hover:bg-[#ffe4cc] text-[#F47A18] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
              >
                <Bot size={14} />
                <span>{isAddingBot ? 'Adding...' : '+ Add Practice Bot'}</span>
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
                      {(p.isBot || p.id.startsWith('bot-')) && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-[#E8E4DC] text-[#172337] px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                          Bot
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
              Share your room code or send an email invite above — or click &ldquo;+ Add Practice Bot&rdquo; to test a group match immediately!
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              startedFromRealtimeRef.current = false;
              setCurrentRoom(null);
            }}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-[#E8E4DC] hover:bg-white text-xs font-bold text-[#202B3C] cursor-pointer"
          >
            Leave Room
          </button>
          {isHost ? (
            <button
              type="button"
              onClick={handleStartChallengeNow}
              className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-sm shadow-lg shadow-[#F47A18]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span>Start Challenge Now</span>
            </button>
          ) : (
            <div className="py-3 px-5 rounded-2xl bg-[#FFF0E3] border border-[#F47A18]/30 text-xs font-bold text-[#F47A18] flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span>Waiting for host to start the challenge...</span>
            </div>
          )}
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

      {/* INCOMING CHALLENGE INVITATIONS */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#F47A18] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[#F47A18]" />
            <h3 className="text-sm font-extrabold text-[#172337]">
              Incoming Challenge Invitations ({pendingInvitations.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF0E3]/60 border border-[#F47A18]/25"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#172337] truncate">
                    {inv.senderName} invited you to {inv.quizTitle}
                  </p>
                  <p className="text-xs text-[#202B3C]/70 font-mono">
                    Room Code: <span className="font-bold text-[#F47A18]">{inv.roomCode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => acceptChallengeInvite(inv)}
                    className="py-2 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Accept &amp; Join</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => declineChallengeInvite(inv)}
                    className="py-2 px-3 rounded-xl bg-white border border-[#E8E4DC] hover:bg-red-50 hover:text-red-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              Invite friends with a code, link, or direct in-app email invitation.
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
