import { openDB } from 'idb';
import type { City, SaveSlot } from './types';
import { inBounds, isWater, keyOf } from './world';
import { defaultFunding, defaultPolicies, FACILITIES, footprint } from './services';
import { EVENT_INFO } from './events';

const db = () => openDB('urbania', 1, { upgrade(database) { database.createObjectStore('cities', { keyPath: 'slot' }); } });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number => finite(value, min, max) && Number.isInteger(value);

export function validateCity(input: unknown): City {
  const invalid = () => { throw new Error('Arquivo de cidade inválido ou de versão incompatível.'); };
  if (!record(input)) return invalid();
  const c = input;
  if (![1, 2, 3].includes(c.version as number) || typeof c.id !== 'string' || c.id.length > 100 || !c.id.length || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 40 || !integer(c.seed, 0, 1e9) || !integer(c.day, 0, 1e8) || !finite(c.treasury, -1e12, 1e12) || !finite(c.totalConstruction, 0, 1e12) || !integer(c.taxRate, 1, 20) || !record(c.roads) || !record(c.lots) || !Array.isArray(c.history) || c.history.length > 60) return invalid();
  if (Object.keys(c.roads).length > 3136 || Object.keys(c.lots).length > 3136) return invalid();
  for (const [key, value] of Object.entries(c.roads)) {
    if (!record(value) || !integer(value.x, 0, 55) || !integer(value.z, 0, 55) || !['street', 'avenue'].includes(value.kind as string)) return invalid();
    const cell = { x: value.x, z: value.z };
    if (key !== keyOf(cell) || !inBounds(cell) || isWater(cell)) return invalid();
  }
  for (const [key, value] of Object.entries(c.lots)) {
    if (!record(value) || !integer(value.x, 0, 55) || !integer(value.z, 0, 55) || !(c.version === 3 ? ['residential', 'commercial', 'industrial', 'mixed'] : ['residential', 'commercial', 'industrial']).includes(value.kind as string)) return invalid();
    const cell = { x: value.x, z: value.z };
    if (key !== keyOf(cell) || isWater(cell) || c.roads[key]) return invalid();
    if (value.building !== undefined) {
      if (!record(value.building) || !integer(value.building.variant, 0, 11) || !integer(value.building.level ?? 1, 1, c.version === 1 ? 1 : 3) || !integer(value.building.occupants, 0, (value.kind === 'residential' ? 6 + value.building.variant % 3 * 2 : value.kind === 'mixed' ? 8 : value.kind === 'commercial' ? 8 : 16) * [1, 3, 6][Number(value.building.level ?? 1) - 1]) || !integer(value.building.age, 0, 1e8)) return invalid();
      if (value.building.workers !== undefined && (value.kind !== 'mixed' || !integer(value.building.workers, 0, 4 * [1, 3, 6][Number(value.building.level ?? 1) - 1]))) return invalid();
    }
  }
  for (const row of c.history) {
    if (!record(row) || !integer(row.month, 1, 1e8) || !integer(row.population, 0, 1e7) || !finite(row.income, 0, 1e12) || !finite(row.expenses, 0, 1e12) || !finite(row.balance, -1e12, 1e12) || row.balance !== row.income - row.expenses) return invalid();
  }
  let data = JSON.parse(JSON.stringify(c)) as City;
  if (c.version === 1) {
    const population = Object.values(data.lots).reduce((sum, l) => sum + (l.kind === 'residential' ? l.building?.occupants ?? 0 : 0), 0);
    data = { ...data, version: 3, facilities: {}, funding: defaultFunding(), policies: defaultPolicies(), busLines: [], peakPopulation: population, milestoneScale: .1, event: null, eventHistory: [], modifiers: { investmentUntil: 0, recessionUntil: 0, floodUntil: 0 } };
  }
  data.version = 3;
  if (!record(data.facilities) || Object.keys(data.facilities).length > 784 || !record(data.funding) || !record(data.policies) || !integer(data.peakPopulation, 0, 1e7) || !finite(data.milestoneScale, .05, 2) || !Array.isArray(data.busLines) || data.busLines.length > 100 || !Array.isArray(data.eventHistory) || data.eventHistory.length > 20 || !record(data.modifiers)) return invalid();
  if (Object.keys(data.funding).length !== Object.keys(FACILITIES).length || Object.keys(data.policies).length !== Object.keys(defaultPolicies()).length) return invalid();
  const occupied = new Set<string>();
  for (const [key, f] of Object.entries(data.facilities)) {
    if (!record(f) || !integer(f.x, 0, 54) || !integer(f.z, 0, 54) || typeof f.kind !== 'string' || !Object.hasOwn(FACILITIES, f.kind) || key !== keyOf(f)) return invalid();
    for (const cell of footprint(f)) {
      const id = keyOf(cell);
      if (isWater(cell) || data.roads[id] || data.lots[id] || occupied.has(id)) return invalid();
      occupied.add(id);
    }
  }
  for (const kind of Object.keys(FACILITIES)) if (!integer(data.funding[kind as keyof typeof data.funding], 0, 150)) return invalid();
  for (const policy of Object.keys(defaultPolicies())) if (typeof data.policies[policy as keyof typeof data.policies] !== 'boolean') return invalid();
  const lineIds = new Set<string>(), pairs = new Set<string>();
  for (const line of data.busLines) {
    if (!record(line) || typeof line.id !== 'string' || line.id.length > 120 || typeof line.from !== 'string' || typeof line.to !== 'string' || line.from === line.to || data.facilities[line.from]?.kind !== 'bus' || data.facilities[line.to]?.kind !== 'bus' || lineIds.has(line.id)) return invalid();
    const pair = [line.from, line.to].sort().join('|'); if (pairs.has(pair)) return invalid();
    pairs.add(pair); lineIds.add(line.id);
  }
  for (const until of ['investmentUntil', 'recessionUntil', 'floodUntil'] as const) if (!integer(data.modifiers[until], 0, 1e8)) return invalid();
  const validEvent = (e: unknown, resolved: boolean) => record(e) && integer(e.id, 0, data.day) && typeof e.kind === 'string' && Object.hasOwn(EVENT_INFO, e.kind) && (resolved ? integer(e.choice, 0, 2) : e.choice === undefined);
  if (data.event !== null && !validEvent(data.event, false)) return invalid();
  if (!data.eventHistory.every(e => validEvent(e, true))) return invalid();
  return data;
}

export async function saveCity(slot: string, city: City): Promise<SaveSlot> {
  const entry = { slot, city: validateCity(city), savedAt: new Date().toISOString() };
  const database = await db();
  try { await database.put('cities', entry); return entry; } finally { database.close(); }
}
export async function listSaves(): Promise<SaveSlot[]> {
  const database = await db();
  try { return (await database.getAll('cities')).map(e => ({ ...e, city: validateCity(e.city) })).sort((a, b) => b.savedAt.localeCompare(a.savedAt)); } finally { database.close(); }
}
export async function loadCity(slot: string): Promise<City> {
  const database = await db();
  try {
    const entry = await database.get('cities', slot);
    if (!entry) throw new Error('Nenhum salvamento encontrado neste espaço.');
    return validateCity(entry.city);
  } finally { database.close(); }
}
export async function deleteSave(slot: string) {
  const database = await db();
  try { await database.delete('cities', slot); } finally { database.close(); }
}
export function exportCity(city: City) {
  const blob = new Blob([JSON.stringify(validateCity(city), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `urbania-${city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importCity(file: File): Promise<City> {
  if (file.size > 5_000_000) throw new Error('O arquivo deve ter até 5 MB.');
  try { return validateCity(JSON.parse(await file.text())); }
  catch { throw new Error('Não foi possível importar. Escolha um save JSON válido do Urbania (versões 1, 2 ou 3).'); }
}
