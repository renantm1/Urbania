import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { Scene } from './render/Scene';
import { Hud } from './ui/Hud';
import { Dialogs, Welcome } from './ui/Dialogs';
import { useGame } from './state/store';
import { saveCity } from './core/persistence';
import type { Tool } from './core/types';
import { trafficEngine } from './core/traffic';
import { AudioRuntime } from './ui/Audio';

async function quickSave() {
  const state = useGame.getState();
  if (!state.started) return;
  try { await saveCity('slot-1', state.city); state.saved(); state.notify('Cidade salva no espaço 1.'); }
  catch { state.notify('Não foi possível salvar. Abra Salvamentos para exportar um JSON.', 'error'); }
}

function GameRuntime() {
  useEffect(() => {
    let last = performance.now(), accumulator = 0, trafficAccumulator = 0;
    const timer = window.setInterval(() => {
      const now = performance.now(), state = useGame.getState();
      const delta = Math.min(500, now - last); last = now;
      if (document.hidden || !state.started || state.modal || !state.speed) { accumulator = 0; trafficAccumulator = 0; return; }
      trafficAccumulator += delta * state.speed;
      while (trafficAccumulator >= 100) { trafficEngine.step(useGame.getState().city, .1); trafficAccumulator -= 100; }
      accumulator += delta * state.speed;
      while (accumulator >= 1000) { state.tick(); accumulator -= 1000; }
    }, 100);
    let saving = false;
    const auto = window.setInterval(async () => {
      const state = useGame.getState();
      if (!state.started || !state.autosave || saving) return;
      saving = true;
      const id = state.city.id;
      try { await saveCity('autosave', state.city); if (useGame.getState().city.id === id) state.saved(); }
      catch { state.notify('Salvamento automático indisponível. Exporte sua cidade em JSON.', 'error'); }
      finally { saving = false; }
    }, 60_000);
    const keyboard = (e: KeyboardEvent) => {
      const state = useGame.getState();
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        if (e.shiftKey) state.setModal('saves'); else void quickSave();
        return;
      }
      if (e.code === 'Escape') { state.cancel(); return; }
      if ((e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) || state.modal || !state.started || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        if (e.target instanceof HTMLElement && e.target.closest('button, a[href]')) return;
        e.preventDefault(); state.togglePause();
      }
      if (e.code === 'KeyF') state.resetCamera();
      const bindings: Record<string, Tool> = { Digit1: 'road', Digit2: 'residential', Digit3: 'commercial', Digit4: 'industrial', Digit5: 'bulldoze', Digit6: 'mixed', KeyV: 'select' };
      if (bindings[e.code]) state.setTool(bindings[e.code]);
    };
    window.addEventListener('keydown', keyboard);
    return () => { clearInterval(timer); clearInterval(auto); window.removeEventListener('keydown', keyboard); };
  }, []);
  return null;
}

export default function App() {
  const started = useGame(s => s.started), notice = useGame(s => s.notice);
  const [smallWarning, setSmallWarning] = useState(true);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => useGame.setState({ notice: null }), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  return <div className="app-shell"><GameRuntime /><AudioRuntime /><div className={`world ${started ? 'playing' : 'intro'}`}><Scene /></div>{started ? <Hud /> : <Welcome />}<Dialogs />
    {notice && <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`toast ${notice.tone}`}>{notice.tone === 'error' ? <Info size={18} /> : <CheckCircle2 size={18} />}<span>{notice.text}</span><button aria-label="Fechar aviso" onClick={() => useGame.setState({ notice: null })}><X size={15} /></button></div>}
    {smallWarning && <div className="small-screen-notice"><Info size={17} /><span>Urbania foi criado para desktop. Use uma janela de pelo menos 1.024 px e um mouse para construir.</span><button aria-label="Fechar aviso de tela" onClick={() => setSmallWarning(false)}><X size={15} /></button></div>}
  </div>;
}
