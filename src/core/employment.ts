import type { City } from './types';
import { assessServices, componentOf } from './services';
import { hasHomes, workplaceCapacity } from './zoning';
import { hasRoadAccess, keyOf } from './world';

const cache = new WeakMap<City, { jobs: number; workers: number; employed: number; staffing: Map<string, number> }>();
/** Capacity and assigned workers must use the same road network and actual utility supply. */
export function employmentReport(city: City) {
  const previous = cache.get(city); if (previous) return previous;
  const services = assessServices(city), networks = new Map<number, { people: number; jobs: number }>();
  const workplaces: { key: string; network: number; capacity: number }[] = [];
  let population = 0, jobs = 0;
  for (const lot of Object.values(city.lots)) {
    if (!lot.building) continue;
    if (hasHomes(lot)) population += lot.building.occupants;
    if (!hasRoadAccess(lot, city.roads)) continue;
    const network = componentOf(lot, city)!;
    const row = networks.get(network) ?? { people: 0, jobs: 0 };
    if (hasHomes(lot)) row.people += lot.building.occupants;
    const s = services.lots.get(keyOf(lot))!, supply = Math.min(s.energy, s.water);
    const capacity = supply >= .55 ? Math.floor(workplaceCapacity(lot) * supply) : 0;
    row.jobs += capacity; jobs += capacity; networks.set(network, row);
    if (capacity) workplaces.push({ key: keyOf(lot), network, capacity });
  }
  const employedIn = (row: { people: number; jobs: number }) => Math.min(Math.floor(row.people * .55), row.jobs);
  const employed = [...networks.values()].reduce((sum, row) => sum + employedIn(row), 0);
  const remaining = new Map([...networks].map(([id, row]) => [id, employedIn(row)]));
  const staffing = new Map<string, number>();
  const ranked = workplaces.map(w => {
    const row = networks.get(w.network)!, exact = w.capacity * employedIn(row) / row.jobs;
    staffing.set(w.key, Math.floor(exact)); remaining.set(w.network, remaining.get(w.network)! - Math.floor(exact));
    return { ...w, fraction: exact - Math.floor(exact) };
  }).sort((a, b) => b.fraction - a.fraction || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const w of ranked) if (remaining.get(w.network)! > 0 && staffing.get(w.key)! < w.capacity) {
    staffing.set(w.key, staffing.get(w.key)! + 1); remaining.set(w.network, remaining.get(w.network)! - 1);
  }
  const result = { jobs, workers: Math.floor(population * .55), employed, staffing };
  cache.set(city, result); return result;
}
