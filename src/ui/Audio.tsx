import { useEffect } from 'react';
import { useGame } from '../state/store';

/** Optional local synthesis, activated only by a user gesture and suspended offscreen. */
export function AudioRuntime() {
  useEffect(() => {
    let context: AudioContext | null = null, lastBuild = 0;
    const unlock = () => {
      if (!useGame.getState().audio || document.hidden || typeof AudioContext === 'undefined') return;
      try { context ??= new AudioContext(); void context.resume().catch(() => {}); }
      catch { /* Audio is optional; unsupported/blocked audio must never stop the game. */ }
    };
    const play = (notes: number[]) => {
      if (!context || context.state !== 'running' || document.hidden || !useGame.getState().audio) return;
      try {
        const ctx = context;
        notes.forEach((frequency, i) => {
          const gain = ctx.createGain(), osc = ctx.createOscillator(), time = ctx.currentTime + i * .1;
          osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, time);
          gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.025, time + .015); gain.gain.exponentialRampToValueAtTime(.001, time + .2);
          osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + .21);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });
      } catch { /* A browser can suspend or close an audio context at any point. */ }
    };
    const unsubscribe = useGame.subscribe((state, previous) => {
      if (!state.audio) { if (context?.state === 'running') void context.suspend().catch(() => {}); return; }
      if (state.city.id !== previous.city.id) return;
      if (state.city.event && state.city.event.id !== previous.city.event?.id) play([440, 554, 660]);
      else if (state.city.totalConstruction > previous.city.totalConstruction && performance.now() - lastBuild > 100) { play([620, 380]); lastBuild = performance.now(); }
    });
    const visibility = () => { if (document.hidden && context?.state === 'running') void context.suspend().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      unsubscribe(); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); document.removeEventListener('visibilitychange', visibility);
      void context?.close().catch(() => {});
    };
  }, []);
  return null;
}
