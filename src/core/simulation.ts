import type { City, Metrics, Lot } from './types';
import { CELL_SIZE, hasRoadAccess, hash, keyOf, riverCenter, riverWidth } from './world';
import { assessServices, componentOf, facilityAccess, FACILITIES, unlocked, POLICY_INFO } from './services';
import { planTraffic } from './traffic';
import { nextEvent } from './events';

export const DAYS_PER_MONTH = 30;
export const capacityOf = (lot: Lot) => (lot.kind === 'residential' ? 6 + (lot.building?.variant ?? 0) % 3 * 2 : lot.kind === 'commercial' ? 8 : 16) * ([1, 3, 6][(lot.building?.level ?? 1) - 1]);
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const metricsCache = new WeakMap<City, Metrics>();

export function getMetrics(city: City): Metrics {
  const cached = metricsCache.get(city); if (cached) return cached;
  const buildings = Object.values(city.lots).filter(lot => lot.building);
  const active = buildings.filter(lot => hasRoadAccess(lot, city.roads));
  const homes = buildings.filter(lot => lot.kind === 'residential');
  const services = assessServices(city), traffic = planTraffic(city);
  const population = homes.reduce((sum, lot) => sum + lot.building!.occupants, 0);
  const capacity = homes.reduce((sum, lot) => sum + capacityOf(lot), 0);
  const commerce = active.filter(lot => lot.kind === 'commercial');
  const industry = active.filter(lot => lot.kind === 'industrial');
  const jobCapacity = (lot: Lot) => {
    const s = services.lots.get(keyOf(lot))!;
    const supply = Math.min(s.energy, s.water);
    return supply >= .55 ? Math.floor(capacityOf(lot) * supply) : 0;
  };
  const jobs = [...commerce, ...industry].reduce((sum, lot) => sum + jobCapacity(lot), 0);
  const workers = Math.floor(population * .55);
  const byNetwork = new Map<number, { people: number; jobs: number }>();
  for (const lot of active) {
    const id = componentOf(lot, city)!;
    const entry = byNetwork.get(id) ?? { people: 0, jobs: 0 };
    if (lot.kind === 'residential') entry.people += lot.building!.occupants * .55;
    else entry.jobs += jobCapacity(lot);
    byNetwork.set(id, entry);
  }
  const employed = Math.min(workers, Math.floor([...byNetwork.values()].reduce((sum, row) => sum + Math.min(row.people, row.jobs), 0)));
  const unemployment = workers ? Math.round((workers - employed) / workers * 100) : 0;
  const coverage = services.coverage;
  const infrastructure = Math.min(coverage.energy, coverage.water, coverage.sewage, coverage.waste);
  const governance = Math.min(1, Object.values(city.facilities).filter(f => f.kind === 'cityhall' && facilityAccess(f, city)).length * 5000 * city.funding.cityhall / 100 / Math.max(1, population));
  const satisfaction = Math.round(clamp(72 + governance * 3 - unemployment * .16 - Math.max(0, city.taxRate - 9) * 3 - services.pollution * .18 - (1 - infrastructure) * 30 - traffic.congestion * .12 + coverage.health * 8 + coverage.education * 7 + coverage.safety * 5 + coverage.parks * 8 + coverage.transit * 5 - (city.treasury < 0 ? 18 : 0), 8, 98));
  const taxFactor = city.taxRate / 9;
  const occupancy = workers > 0 ? Math.min(1, employed / Math.max(1, jobs)) : .1;
  const productivity = (.65 + coverage.health * .15 + coverage.education * .2 + coverage.fire * .05) * (1 - traffic.congestion * .004);
  const stimulus = (city.modifiers.investmentUntil > city.day ? 1.25 : 1) * (city.modifiers.recessionUntil > city.day ? .8 : 1);
  const taxes = {
    residential: Math.round(population * 48 * taxFactor * (city.policies.housing ? .85 : 1)),
    commercial: Math.round(commerce.reduce((sum, l) => sum + capacityOf(l) / 8 * 1100, 0) * occupancy * taxFactor * productivity * stimulus),
    industrial: Math.round(industry.reduce((sum, l) => sum + capacityOf(l) / 16 * 1700, 0) * occupancy * taxFactor * productivity * stimulus * (city.policies.cleanIndustry ? .9 : 1)),
    grants: 12_000 + Math.min(8_000, population * 4),
  };
  const costs = {
    roads: Object.values(city.roads).reduce((sum, road) => sum + (road.kind === 'avenue' ? 35 : 18), 0),
    administration: Math.round((2800 + population * 3) * (1 - governance * .12)),
    sanitation: buildings.length * 36 + population * 5 + Math.round((city.funding.power + city.funding.water + city.funding.waste) * 2),
    facilities: Object.values(city.facilities).reduce((sum, f) => sum + Math.round(FACILITIES[f.kind].upkeep * city.funding[f.kind] / 100), 0),
    policies: (Object.keys(POLICY_INFO) as (keyof typeof city.policies)[]).reduce((sum, key) => sum + (city.policies[key] ? POLICY_INFO[key].upkeep * population : 0), 0),
    transport: Math.round(city.busLines.length * (city.policies.freeTransit ? 1500 : 950) * city.funding.bus / 100),
  };
  const income = Object.values(taxes).reduce((a, b) => a + b, 0);
  const expenses = Object.values(costs).reduce((a, b) => a + b, 0);
  const vacant = active.filter(l => l.kind === 'residential').reduce((sum, l) => sum + capacityOf(l) - l.building!.occupants, 0);
  const demand = {
    residential: Math.round(clamp(86 - vacant * .9 + Math.min(jobs - workers, 20) * 1.5 - Math.max(0, city.taxRate - 9) * 5 - Math.max(0, 55 - satisfaction) + (city.policies.housing ? 20 : 0))),
    commercial: Math.round(clamp(25 + population * .65 - commerce.reduce((s, l) => s + capacityOf(l) / 8, 0) * 28 - industry.length * 3 - Math.max(0, city.taxRate - 10) * 3 + (stimulus > 1 ? 25 : 0))),
    industrial: Math.round(clamp(30 + workers * 1.2 - jobs * .9 - Math.max(0, city.taxRate - 10) * 3 + (stimulus > 1 ? 25 : 0))),
  };
  const result: Metrics = { population, households: Math.ceil(population / 3), capacity, jobs, workers, employed, unemployment, satisfaction,
    buildings: buildings.length, roadLength: Object.keys(city.roads).length * CELL_SIZE, income, expenses, balance: income - expenses, taxes, costs, demand,
    coverage, utilities: services.utilities, congestion: traffic.congestion, pollution: Math.round(services.pollution), landValue: Math.round(services.value), reachableJobs: employed };
  metricsCache.set(city, result); return result;
}

/** One fixed step = one in-game day. Rendering never drives the economic state. */
export function simulateDay(city: City): City {
  const day = city.day + 1, metrics = getMetrics(city), services = assessServices(city);
  const lots: City['lots'] = { ...city.lots };
  const candidates = Object.values(city.lots).sort((a, b) => hash(a.x, a.z, city.seed + Math.floor(day / 5)) - hash(b.x, b.z, city.seed + Math.floor(day / 5)));
  let newBuildings = 0;
  const growthLimit = 1 + Math.min(3, Math.floor(metrics.population / 150));
  for (const lot of candidates) {
    const key = keyOf(lot), connected = hasRoadAccess(lot, city.roads), s = services.lots.get(key)!;
    const supplied = s.energy >= .55 && s.water >= .55;
    if (lot.building) {
      const building = { ...lot.building, age: lot.building.age + 1, level: lot.building.level ?? 1 };
      const flooded = city.modifiers.floodUntil > day && Math.abs(lot.x - riverCenter(lot.z)) < riverWidth(lot.z) + 2.5;
      if (lot.kind === 'residential') {
        if (!connected || !supplied || flooded || metrics.satisfaction < 35) building.occupants = Math.max(0, building.occupants - (flooded ? 2 : 1));
        else if (building.occupants < capacityOf(lot) && day % 2 === 0 && metrics.satisfaction >= 50 && (metrics.jobs >= metrics.workers * .7 || metrics.population < 80)) building.occupants++;
      } else building.occupants = connected && supplied ? Math.min(capacityOf(lot), Math.round(metrics.employed / Math.max(1, metrics.jobs) * capacityOf(lot))) : 0;
      const upgradeThreshold = building.level === 1 ? (lot.kind === 'industrial' ? 1000 : 500) : 10000;
      if (building.level < 3 && building.age >= 60 && day % 30 === 0 && unlocked(city, upgradeThreshold) && s.energy > .85 && s.water > .85 && s.education > .55 && s.health > .55 && s.safety > .4 && s.value >= 65 && metrics.satisfaction >= 65) building.level = (building.level + 1) as 2 | 3;
      lots[key] = { ...lot, building };
    } else if (connected && supplied && day % 3 === 0 && metrics.demand[lot.kind] > 12 && newBuildings < growthLimit) {
      lots[key] = { ...lot, building: { variant: Math.floor(hash(lot.x, lot.z, city.seed) * 12), age: 0, occupants: lot.kind === 'residential' ? 2 : 0, level: 1 } }; newBuildings++;
    }
  }
  let next: City = { ...city, lots, day };
  const peakPopulation = Math.max(city.peakPopulation, getMetrics(next).population);
  if (peakPopulation !== city.peakPopulation) next = { ...next, peakPopulation };
  if (day % DAYS_PER_MONTH === 0) {
    const month = getMetrics(next);
    next = { ...next, treasury: next.treasury + month.balance, history: [...city.history, { month: day / DAYS_PER_MONTH, income: month.income, expenses: month.expenses, population: month.population, balance: month.balance }].slice(-60) };
  }
  if (!city.event && day % 120 === 0) next = { ...next, event: nextEvent(next) };
  return next;
}
