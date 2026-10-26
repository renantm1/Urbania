import { openDB } from 'idb';
import type { City, SaveSlot } from './types';
import { inBounds, isWater, keyOf } from './world';

const db = () => openDB('urbania', 1, { upgrade(database) { database.createObjectStore('cities', { keyPath: 'slot' }); } });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number => finite(value, min, max) && Number.isInteger(value);

export function validateCity(input: unknown): City {
  const invalid = () => { throw new Error('Arquivo de cidade inválido ou de versão incompatível.'); };
  if (!record(input)) return invalid();
  const c = input;
  if (c.version !== 1 || typeof c.id !== 'string' || c.id.length > 100 || !c.id.length || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 40 || !integer(c.seed, 0, 1e9) || !integer(c.day, 0, 1e8) || !finite(c.treasury, -1e12, 1e12) || !finite(c.totalConstruction, 0, 1e12) || !integer(c.taxRate, 1, 20) || !record(c.roads) || !record(c.lots) || !Array.isArray(c.history) || c.history.length > 60) return invalid();
  if (Object.keys(c.roads).length > 3136 || Object.keys(c.lots).length > 3136) return invalid();
  for (const [key, value] of Object.entries(c.roads)) {
    if (!record(value) || !integer(value.x, 0, 55) || !integer(value.z, 0, 55) || !['street', 'avenue'].includes(value.kind as string)) return invalid();
    const cell = { x: value.x, z: value.z };
    if (key !== keyOf(cell) || !inBounds(cell) || isWater(cell)) return invalid();
  }
  for (const [key, value] of Object.entries(c.lots)) {
    if (!record(value) || !integer(value.x, 0, 55) || !integer(value.z, 0, 55) || !['residential', 'commercial', 'industrial'].includes(value.kind as string)) return invalid();
    const cell = { x: value.x, z: value.z };
    if (key !== keyOf(cell) || isWater(cell) || c.roads[key]) return invalid();
    if (value.building !== undefined) {
      if (!record(value.building) || !integer(value.building.variant, 0, 11) || !integer(value.building.occupants, 0, value.kind === 'residential' ? 6 + value.building.variant % 3 * 2 : value.kind === 'commercial' ? 8 : 16) || !integer(value.building.age, 0, 1e8)) return invalid();
    }
  }
  for (const row of c.history) {
    if (!record(row) || !integer(row.month, 1, 1e8) || !integer(row.population, 0, 1e7) || !finite(row.income, 0, 1e12) || !finite(row.expenses, 0, 1e12) || !finite(row.balance, -1e12, 1e12) || row.balance !== row.income - row.expenses) return invalid();
  }
  // Return plain JSON only; no prototypes or unexpected executable content is accepted.
  return JSON.parse(JSON.stringify(c)) as City;
}

export async function saveCity(slot: string, city: City): Promise<SaveSlot> {
  const entry = { slot, city: validateCity(city), savedAt: new Date().toISOString() };
  const database = await db();
  try { await database.put('cities', entry); return entry; } finally { database.close(); }
}
export async function listSaves(): Promise<SaveSlot[]> {
  const database = await db();
  try { return (await database.getAll('cities')).sort((a, b) => b.savedAt.localeCompare(a.savedAt)); } finally { database.close(); }
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
  catch { throw new Error('Não foi possível importar. Escolha um save JSON válido do Urbania (versão 1).'); }
}
