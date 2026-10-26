import { useEffect, useRef } from 'react';
import { useGame } from '../state/store';

// Optional procedural UI sounds; no recordings, remote assets or background playback.
export function AudioRuntime() {
  const enabled = useGame(s => s.audio), spent = useGame(s => s.city.totalConstruction), event = useGame(s => s.city.event);
  const context = useRef<AudioContext | null>(null);
  const previous = useRef(spent);
  useEffect(() => {
    if (!enabled) { previous.current = spent; return; }
    const ctx = context.current ?? new AudioContext(); context.current = ctx;
    void ctx.resume().catch(() => {});
    if (spent !== previous.current || event) {
      const gain = ctx.createGain(), osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.setValueAtTime(event ? 440 : 620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(event ? 660 : 380, ctx.currentTime + .18);
      gain.gain.setValueAtTime(.025, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .24);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .25);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    previous.current = spent;
  }, [enabled, spent, event]);
  useEffect(() => () => { void context.current?.close(); }, []);
  return null;
}
