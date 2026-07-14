import { useCallback, useRef, useState } from 'react';

export function useTagSound() {
  const audioContextRef = useRef(null);
  const [muted, setMuted] = useState(false);

  const playTagSound = useCallback(() => {
    if (muted) {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(620, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(900, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
  }, [muted]);

  return {
    muted,
    toggleMuted: () => setMuted((value) => !value),
    playTagSound,
  };
}
