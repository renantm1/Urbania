import { create } from 'zustand';
import type { Cell, City, FacilityKind, Layer, PolicyKind, RoadKind, Tool } from '../core/types';
import { createCity, brushCells } from '../core/world';
import { addBusLine, buildFacility, buildRoad, demolishCells, zoneCells } from '../core/construction';
import { simulateDay } from '../core/simulation';
import { resolveEvent } from '../core/events';
import { trafficEngine } from '../core/traffic';
import { readPreferences, writePreferences } from './preferences';
import type { Preferences } from './preferences';
import { MILESTONES, unlocked } from '../core/services';

export type Modal = 'budget' | 'statistics' | 'saves' | 'settings' | 'help' | 'new' | 'management' | null;
export type ManagementTab = 'services' | 'infrastructure' | 'transport' | 'policies' | 'layers' | 'progression' | 'events';
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
  facilityKind: FacilityKind;
  layer: Layer;
  managementTab: ManagementTab;
  dayNight: boolean;
  audio: boolean;
  performanceMode: boolean;
  showPerformance: boolean;
  showGuide: boolean;
  frameStats: { fps: number; calls: number; triangles: number; vehicles: number };
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
  setSetting: (key: keyof Preferences, value: boolean) => void;
  saved: () => void;
  resetCamera: () => void;
  openManagement: (tab: ManagementTab) => void;
  selectFacility: (kind: FacilityKind) => void;
  setLayer: (layer: Layer) => void;
  setFunding: (kind: FacilityKind, value: number) => void;
  setPolicy: (kind: PolicyKind, value: boolean) => void;
  setMilestoneScale: (scale: number) => void;
  createBusLine: (from: string, to: string) => void;
  removeBusLine: (id: string) => void;
  decideEvent: (choice: number) => void;
}

export const useGame = create<GameState>((set, get) => ({
  city: createCity(), started: false, tool: 'select', roadKind: 'street', brush: 1,
  speed: 1, lastSpeed: 1, anchor: null, hover: null, selected: null, modal: null,
  notice: null, ...readPreferences(), lastSaved: null, cameraReset: 0,
  facilityKind: 'power', layer: 'none', managementTab: 'services', frameStats: { fps: 0, calls: 0, triangles: 0, vehicles: 0 },
  setTool: tool => set({ tool, anchor: null, selected: null }),
  setRoadKind: roadKind => set({ roadKind, anchor: null }),
  setBrush: brush => set({ brush }),
  setHover: hover => set({ hover }),
  interact: (cell, dragging = false) => {
    const { tool, city, anchor, roadKind, brush, modal, started } = get();
    if (!started || modal) return;
    if (tool === 'select') { if (!dragging) set({ selected: cell }); return; }
    if ((tool === 'road' || tool === 'facility') && dragging) return;
    if (tool === 'road' && !anchor) { set({ anchor: cell }); return; }
    const result = tool === 'road' ? buildRoad(city, anchor!, cell, roadKind)
      : tool === 'facility' ? buildFacility(city, cell, get().facilityKind)
      : tool === 'bulldoze' ? demolishCells(city, brushCells(cell, brush))
      : zoneCells(city, brushCells(cell, brush), tool);
    if (result.error) { if (!dragging) get().notify(result.error, 'error'); return; }
    set({ city: result.city, anchor: tool === 'road' ? null : anchor });
  },
  cancel: () => { const state = get(); if (state.modal) set({ modal: null }); else if (state.anchor) set({ anchor: null }); else set({ tool: 'select', selected: null }); },
  setSpeed: speed => set(speed ? { speed, lastSpeed: speed } : { speed }),
  togglePause: () => set({ speed: get().speed ? 0 : get().lastSpeed }),
  tick: () => {
    if (!get().started || !get().speed || get().modal) return;
    const previous = get().city, city = simulateDay(previous);
    set({ city, ...(!previous.event && city.event ? { modal: 'management' as const, managementTab: 'events' as const } : {}) });
    const milestone = MILESTONES.filter(m => !unlocked(previous, m.population) && unlocked(city, m.population)).at(-1);
    if (milestone) get().notify(`Marco alcançado: ${milestone.name}. ${milestone.reward}.`);
  },
  newCity: name => { const city = createCity(name, Math.floor(Math.random() * 1e6)); trafficEngine.reset(city); set({ city, started: true, tool: 'road', anchor: null, selected: null, hover: null, modal: null, speed: 1, lastSaved: null, layer: 'none', cameraReset: get().cameraReset + 1 }); },
  restoreCity: city => { trafficEngine.reset(city); set({ city, started: true, tool: 'select', anchor: null, selected: null, hover: null, modal: null, speed: 0, lastSaved: null, layer: 'none', cameraReset: get().cameraReset + 1 }); },
  setModal: modal => set({ modal }),
  notify: (text, tone = 'info') => set({ notice: { text, tone, id: Date.now() } }),
  setTax: tax => set({ city: { ...get().city, taxRate: Math.round(Math.max(1, Math.min(20, tax))) } }),
  setSetting: (key, value) => {
    set({ [key]: value });
    if (!writePreferences(get())) get().notify('Preferência aplicada nesta sessão. O navegador não permitiu guardá-la para a próxima visita.', 'error');
  },
  saved: () => set({ lastSaved: new Date().toISOString() }),
  resetCamera: () => set({ cameraReset: get().cameraReset + 1 }),
  openManagement: managementTab => set({ modal: 'management', managementTab }),
  selectFacility: facilityKind => set({ facilityKind, tool: 'facility', selected: null, anchor: null, modal: null }),
  setLayer: layer => set({ layer }),
  setFunding: (kind, value) => set({ city: { ...get().city, funding: { ...get().city.funding, [kind]: Math.round(Math.max(0, Math.min(150, value))) } } }),
  setPolicy: (kind, value) => set({ city: { ...get().city, policies: { ...get().city.policies, [kind]: value } } }),
  setMilestoneScale: scale => set({ city: { ...get().city, milestoneScale: Math.max(.05, Math.min(2, scale)) } }),
  createBusLine: (from, to) => { try { set({ city: addBusLine(get().city, from, to) }); get().notify('Linha criada. Ônibus começam a circular com o tempo em movimento.'); } catch (e) { get().notify((e as Error).message, 'error'); } },
  removeBusLine: id => set({ city: { ...get().city, busLines: get().city.busLines.filter(line => line.id !== id) } }),
  decideEvent: choice => { try { set({ city: resolveEvent(get().city, choice) }); get().notify('Decisão aplicada ao orçamento e à simulação.'); } catch (e) { get().notify((e as Error).message, 'error'); } },
}));
