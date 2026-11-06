// Pleasant Web Audio synthesizer for Quizian study notifications and answer cues
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Two-tone warm chime (C5 -> E5 -> G5)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playTone(523.25, now, 0.25); // C5
    playTone(659.25, now + 0.12, 0.35); // E5
    playTone(783.99, now + 0.24, 0.5); // G5
  } catch (err) {
    // AudioContext might be blocked until user gesture, safely ignore
  }
};
