import type { City, Metrics, Lot } from './types';
import { CELL_SIZE, hasRoadAccess, hash, keyOf } from './world';

export const DAYS_PER_MONTH = 30;
export const capacityOf = (lot: Lot) => lot.kind === 'residential' ? 6 + (lot.building?.variant ?? 0) % 3 * 2 : lot.kind === 'commercial' ? 8 : 16;
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export function getMetrics(city: City): Metrics {
  const lots = Object.values(city.lots);
  const buildings = lots.filter(lot => lot.building);
  const active = buildings.filter(lot => hasRoadAccess(lot, city.roads));
  const homes = buildings.filter(lot => lot.kind === 'residential');
  const population = homes.reduce((sum, lot) => sum + (lot.building?.occupants ?? 0), 0);
  const capacity = homes.reduce((sum, lot) => sum + capacityOf(lot), 0);
  const commerce = active.filter(lot => lot.kind === 'commercial').length;
  const industry = active.filter(lot => lot.kind === 'industrial').length;
  const jobs = commerce * 8 + industry * 16;
  const workers = Math.floor(population * .55);
  const employed = Math.min(jobs, workers);
  const unemployment = workers ? Math.round((workers - employed) / workers * 100) : 0;
  const pollution = Math.min(20, industry * 2);
  const access = buildings.length ? active.length / buildings.length : 1;
  const satisfaction = Math.round(clamp(81 - unemployment * .18 - Math.max(0, city.taxRate - 9) * 3 - pollution + (access - 1) * 40 - (city.treasury < 0 ? 18 : 0), 8, 98));
  const taxFactor = city.taxRate / 9;
  const occupancy = workers > 0 ? Math.min(1, workers / Math.max(1, jobs)) : .1;
  const taxes = {
    residential: Math.round(population * 48 * taxFactor),
    commercial: Math.round(commerce * 1100 * occupancy * taxFactor),
    industrial: Math.round(industry * 1700 * occupancy * taxFactor),
    grants: 12_000 + Math.min(8_000, population * 4),
  };
  const costs = {
    roads: Object.values(city.roads).reduce((sum, road) => sum + (road.kind === 'avenue' ? 35 : 18), 0),
    administration: 2800 + Math.round(population * 3),
    sanitation: buildings.length * 36 + population * 5,
  };
  const income = Object.values(taxes).reduce((a, b) => a + b, 0);
  const expenses = Object.values(costs).reduce((a, b) => a + b, 0);
  const vacant = capacity - population;
  const demand = {
    residential: Math.round(clamp(86 - vacant * .9 + Math.min(jobs - workers, 20) * 1.5 - Math.max(0, city.taxRate - 9) * 5 - Math.max(0, 55 - satisfaction))),
    commercial: Math.round(clamp(25 + population * .65 - commerce * 28 - industry * 3 - Math.max(0, city.taxRate - 10) * 3)),
    industrial: Math.round(clamp(30 + workers * 1.2 - jobs * .9 - Math.max(0, city.taxRate - 10) * 3)),
  };
  return { population, households: Math.ceil(population / 3), capacity, jobs, workers, employed, unemployment, satisfaction,
    buildings: buildings.length, roadLength: Object.keys(city.roads).length * CELL_SIZE,
    income, expenses, balance: income - expenses, taxes, costs, demand };
}

/** One fixed step = one in-game day. Rendering never drives the economic state. */
export function simulateDay(city: City): City {
  const day = city.day + 1;
  const metrics = getMetrics(city);
  const lots: City['lots'] = { ...city.lots };
  // A deterministic order prevents object enumeration and frame timing from changing outcomes.
  const candidates = Object.values(city.lots).sort((a, b) => hash(a.x, a.z, city.seed + Math.floor(day / 5)) - hash(b.x, b.z, city.seed + Math.floor(day / 5)));
  let newBuildings = 0;
  const growthLimit = 1 + Math.min(3, Math.floor(metrics.population / 150));
  for (const lot of candidates) {
    const key = keyOf(lot);
    const connected = hasRoadAccess(lot, city.roads);
    if (lot.building) {
      const building = { ...lot.building, age: lot.building.age + 1 };
      if (lot.kind === 'residential') {
        if (!connected || metrics.satisfaction < 35) building.occupants = Math.max(0, building.occupants - 1);
        else if (building.occupants < capacityOf(lot) && day % 2 === 0 && metrics.demand.residential > 10) building.occupants++;
      } else building.occupants = connected ? Math.min(capacityOf(lot), Math.round(metrics.workers / Math.max(1, metrics.jobs) * capacityOf(lot))) : 0;
      lots[key] = { ...lot, building };
    } else if (connected && day % 3 === 0 && metrics.demand[lot.kind] > 12 && newBuildings < growthLimit) {
      lots[key] = { ...lot, building: { variant: Math.floor(hash(lot.x, lot.z, city.seed) * 12), age: 0, occupants: lot.kind === 'residential' ? 2 : 0 } };
      newBuildings++;
    }
  }
  let next = { ...city, lots, day };
  if (day % DAYS_PER_MONTH === 0) {
    const month = getMetrics(next);
    next = { ...next, treasury: next.treasury + month.balance,
      history: [...city.history, { month: day / DAYS_PER_MONTH, income: month.income, expenses: month.expenses, population: month.population, balance: month.balance }].slice(-60) };
  }
  return next;
}
