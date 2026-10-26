import { create } from 'zustand';
import type { Cell, City, RoadKind, Tool } from '../core/types';
import { createCity, brushCells } from '../core/world';
import { buildRoad, demolishCells, zoneCells } from '../core/construction';
import { simulateDay } from '../core/simulation';

export type Modal = 'budget' | 'statistics' | 'saves' | 'settings' | 'help' | 'new' | null;
interface GameState {
  city: City;
  started: boolean;
  tool: Tool;
  roadKind: RoadKind;
  brush: number;
  speed: 0 | 1 | 2 | 4;
  lastSpeed: 1 | 2 | 4;
  anchor: Cell | null;
  hover: Cell | null;
  selected: Cell | null;
  modal: Modal;
  notice: { text: string; tone: 'info' | 'error'; id: number } | null;
  shadows: boolean;
  showGrid: boolean;
  autosave: boolean;
  lastSaved: string | null;
  cameraReset: number;
  setTool: (tool: Tool) => void;
  setRoadKind: (roadKind: RoadKind) => void;
  setBrush: (brush: number) => void;
  setHover: (hover: Cell | null) => void;
  interact: (cell: Cell, dragging?: boolean) => void;
  cancel: () => void;
  setSpeed: (speed: 0 | 1 | 2 | 4) => void;
  togglePause: () => void;
  tick: () => void;
  newCity: (name: string) => void;
  restoreCity: (city: City) => void;
  setModal: (modal: Modal) => void;
  notify: (text: string, tone?: 'info' | 'error') => void;
  setTax: (tax: number) => void;
  setSetting: (key: 'shadows' | 'showGrid' | 'autosave', value: boolean) => void;
  saved: () => void;
  resetCamera: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  city: createCity(), started: false, tool: 'select', roadKind: 'street', brush: 1,
  speed: 1, lastSpeed: 1, anchor: null, hover: null, selected: null, modal: null,
  notice: null, shadows: true, showGrid: true, autosave: true, lastSaved: null, cameraReset: 0,
  setTool: tool => set({ tool, anchor: null, selected: null }),
  setRoadKind: roadKind => set({ roadKind, anchor: null }),
  setBrush: brush => set({ brush }),
  setHover: hover => set({ hover }),
  interact: (cell, dragging = false) => {
    const { tool, city, anchor, roadKind, brush, modal, started } = get();
    if (!started || modal) return;
    if (tool === 'select') { if (!dragging) set({ selected: cell }); return; }
    if (tool === 'road' && dragging) return;
    if (tool === 'road' && !anchor) { set({ anchor: cell }); return; }
    const result = tool === 'road' ? buildRoad(city, anchor!, cell, roadKind)
      : tool === 'bulldoze' ? demolishCells(city, brushCells(cell, brush))
      : zoneCells(city, brushCells(cell, brush), tool);
    if (result.error) { if (!dragging) get().notify(result.error, 'error'); return; }
    set({ city: result.city, anchor: tool === 'road' ? null : anchor });
  },
  cancel: () => { const state = get(); if (state.modal) set({ modal: null }); else if (state.anchor) set({ anchor: null }); else set({ tool: 'select', selected: null }); },
  setSpeed: speed => set(speed ? { speed, lastSpeed: speed } : { speed }),
  togglePause: () => set({ speed: get().speed ? 0 : get().lastSpeed }),
  tick: () => { if (get().started && get().speed && !get().modal) set({ city: simulateDay(get().city) }); },
  newCity: name => set({ city: createCity(name, Math.floor(Math.random() * 1e6)), started: true, tool: 'road', anchor: null, selected: null, hover: null, modal: null, speed: 1, lastSaved: null, cameraReset: get().cameraReset + 1 }),
  restoreCity: city => set({ city, started: true, tool: 'select', anchor: null, selected: null, hover: null, modal: null, speed: 0, lastSaved: null, cameraReset: get().cameraReset + 1 }),
  setModal: modal => set({ modal }),
  notify: (text, tone = 'info') => set({ notice: { text, tone, id: Date.now() } }),
  setTax: tax => set({ city: { ...get().city, taxRate: Math.round(Math.max(1, Math.min(20, tax))) } }),
  setSetting: (key, value) => set({ [key]: value }),
  saved: () => set({ lastSaved: new Date().toISOString() }),
  resetCamera: () => set({ cameraReset: get().cameraReset + 1 }),
}));
