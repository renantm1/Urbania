import type { Cell, City, Facility, FacilityKind, Layer, Lot, PolicyKind } from './types';
import { hasRoadAccess, keyOf, neighbors } from './world';

export const FACILITIES: Record<FacilityKind, { name: string; cost: number; upkeep: number; capacity: number; radius: number; unlock: number; color: string }> = {
  power: { name: 'Subestação elétrica', cost: 38_000, upkeep: 800, capacity: 1800, radius: 56, unlock: 0, color: '#d6b966' },
  water: { name: 'Tratamento de água e esgoto', cost: 42_000, upkeep: 950, capacity: 1800, radius: 56, unlock: 0, color: '#7cb9c8' },
  waste: { name: 'Central de coleta', cost: 26_000, upkeep: 650, capacity: 1800, radius: 24, unlock: 0, color: '#9cac7c' },
  school: { name: 'Escola municipal', cost: 48_000, upkeep: 900, capacity: 800, radius: 14, unlock: 500, color: '#cdbb88' },
  hospital: { name: 'Hospital', cost: 95_000, upkeep: 1800, capacity: 2500, radius: 18, unlock: 2500, color: '#d7e1df' },
  police: { name: 'Delegacia', cost: 36_000, upkeep: 800, capacity: 1600, radius: 15, unlock: 100, color: '#7e9eb3' },
  fire: { name: 'Corpo de bombeiros', cost: 36_000, upkeep: 800, capacity: 1600, radius: 15, unlock: 100, color: '#bd806b' },
  cityhall: { name: 'Prefeitura', cost: 75_000, upkeep: 1000, capacity: 5000, radius: 56, unlock: 100, color: '#d7cfb4' },
  park: { name: 'Parque de bairro', cost: 8_000, upkeep: 150, capacity: 2000, radius: 9, unlock: 0, color: '#86b48a' },
  bus: { name: 'Estação de ônibus', cost: 22_000, upkeep: 450, capacity: 1600, radius: 12, unlock: 5000, color: '#84ada5' },
};
export const POLICY_INFO: Record<PolicyKind, { name: string; description: string; upkeep: number }> = {
  recycling: { name: 'Coleta seletiva', description: 'Reduz em 30% a demanda por coleta e reduz poluição. Custo mensal por habitante.', upkeep: 3 },
  cleanIndustry: { name: 'Indústria limpa', description: 'Reduz em 45% a poluição industrial; reduz em 10% a receita industrial.', upkeep: 2 },
  housing: { name: 'Incentivo à moradia', description: 'Eleva a demanda residencial e reduz em 15% o IPTU.', upkeep: 4 },
  freeTransit: { name: 'Tarifa zero', description: 'Aumenta o alcance do transporte em 25%; a prefeitura paga a operação integral.', upkeep: 2 },
};
export const MILESTONES = [
  { population: 100, name: 'Vila', reward: 'Delegacia, bombeiros e prefeitura' },
  { population: 500, name: 'Bairro', reward: 'Escola municipal' },
  { population: 1000, name: 'Distrito', reward: 'Indústria de nível 2' },
  { population: 2500, name: 'Cidade', reward: 'Hospital' },
  { population: 5000, name: 'Centro regional', reward: 'Estações e linhas de ônibus' },
  { population: 10000, name: 'Metrópole', reward: 'Edifícios de nível 3' },
  { population: 25000, name: 'Capital regional', reward: 'Capacidade metropolitana de serviços (+50%)' },
];
export const defaultFunding = (): City['funding'] => ({ power: 100, water: 100, waste: 100, school: 100, hospital: 100, police: 100, fire: 100, cityhall: 100, park: 100, bus: 100 });
export const defaultPolicies = (): City['policies'] => ({ recycling: false, cleanIndustry: false, housing: false, freeTransit: false });
export const unlocked = (city: City, population: number) => city.peakPopulation >= Math.round(population * city.milestoneScale);
export const footprint = (cell: Cell): Cell[] => [{ ...cell }, { x: cell.x + 1, z: cell.z }, { x: cell.x, z: cell.z + 1 }, { x: cell.x + 1, z: cell.z + 1 }];
export const facilityAt = (city: City, cell: Cell) => Object.entries(city.facilities).find(([, f]) => footprint(f).some(c => keyOf(c) === keyOf(cell)));
export const facilityAccess = (f: Facility, city: City) => footprint(f).some(c => hasRoadAccess(c, city.roads));

const componentCache = new WeakMap<City['roads'], Map<string, number>>();
export function roadComponents(roads: City['roads']): Map<string, number> {
  const cached = componentCache.get(roads);
  if (cached) return cached;
  const result = new Map<string, number>();
  let component = 0;
  for (const start of Object.keys(roads)) {
    if (result.has(start)) continue;
    const queue = [start]; result.set(start, component);
    for (let i = 0; i < queue.length; i++) for (const n of neighbors(roads[queue[i]])) {
      const key = keyOf(n);
      if (roads[key] && !result.has(key)) { result.set(key, component); queue.push(key); }
    }
    component++;
  }
  componentCache.set(roads, result); return result;
}
export function componentOf(cell: Cell, city: City) {
  const components = roadComponents(city.roads);
  const road = neighbors(cell).find(n => city.roads[keyOf(n)]);
  return road ? components.get(keyOf(road)) : undefined;
}
export function facilityComponent(f: Facility, city: City) {
  for (const cell of footprint(f)) { const id = componentOf(cell, city); if (id !== undefined) return id; }
  return undefined;
}

export interface LotServices { energy: number; water: number; sewage: number; waste: number; education: number; health: number; safety: number; fire: number; parks: number; transit: number; pollution: number; value: number }
export interface ServiceReport { lots: Map<string, LotServices>; coverage: Omit<LotServices, 'pollution' | 'value'>; utilities: Record<'energy' | 'water' | 'sewage' | 'waste', { capacity: number; demand: number }>; pollution: number; value: number }

const serviceCache = new WeakMap<City, ServiceReport>();
export function assessServices(city: City): ServiceReport {
  const cached = serviceCache.get(city); if (cached) return cached;
  const buildings = Object.values(city.lots).filter(l => l.building);
  const units = (l: Lot) => l.kind === 'residential' ? Math.max(2, l.building?.occupants ?? 0) : l.kind === 'industrial' ? 16 * [1, 3, 6][(l.building?.level ?? 1) - 1] : 8 * [1, 3, 6][(l.building?.level ?? 1) - 1];
  const demand = buildings.reduce((sum, l) => sum + units(l), 0);
  // Explicit temporary regional contracts let the first 120 service units establish a town.
  const bootstrap = 120;
  const active = Object.values(city.facilities).filter(f => facilityAccess(f, city) && city.funding[f.kind] > 0);
  const capacity = (kind: FacilityKind) => (active.filter(f => f.kind === kind).length * FACILITIES[kind].capacity * (unlocked(city, 25000) ? 1.5 : 1) + bootstrap) * city.funding[kind] / 100;
  const utilities = {
    energy: { capacity: capacity('power'), demand: Math.ceil(demand * (city.modifiers.floodUntil > city.day ? 1.2 : 1)) },
    water: { capacity: capacity('water'), demand },
    sewage: { capacity: capacity('water'), demand },
    waste: { capacity: capacity('waste'), demand: Math.ceil(demand * (city.policies.recycling ? .7 : 1)) },
  };
  const facilityComponentIds = new Map(active.map(f => [f, facilityComponent(f, city)]));
  const consumers = new Map(active.map(f => [f, Math.max(1, buildings.filter(l => componentOf(l, city) === facilityComponentIds.get(f) && Math.hypot(l.x - f.x, l.z - f.z) <= FACILITIES[f.kind].radius).reduce((sum, l) => sum + units(l), 0))]));
  const lots = new Map<string, LotServices>();
  const industrial = buildings.filter(l => l.kind === 'industrial');
  for (const lot of Object.values(city.lots)) {
    const component = componentOf(lot, city);
    const nearby = (kind: FacilityKind) => active.filter(f => f.kind === kind && facilityComponentIds.get(f) === component && component !== undefined && Math.hypot(lot.x - f.x, lot.z - f.z) <= FACILITIES[kind].radius * Math.sqrt(city.funding[kind] / 100));
    const local = (kind: FacilityKind) => Math.min(1, nearby(kind).reduce((sum, facility) => sum + FACILITIES[kind].capacity * city.funding[kind] / 100 / consumers.get(facility)!, 0));
    const utility = (key: keyof typeof utilities, kind: FacilityKind) => component === undefined ? 0 : Math.min(1, (bootstrap * city.funding[kind] / 100 + nearby(kind).length * FACILITIES[kind].capacity * city.funding[kind] / 100 * (unlocked(city, 25000) ? 1.5 : 1)) / Math.max(1, utilities[key].demand));
    const pollution = Math.min(100, industrial.reduce((sum, f) => sum + Math.max(0, 1 - Math.hypot(lot.x - f.x, lot.z - f.z) / 9) * 25 * (city.policies.cleanIndustry ? .55 : 1), 0) + (1 - utility('waste', 'waste')) * 35);
    const transit = city.busLines.some(line => city.facilities[line.from] && city.facilities[line.to] && facilityComponent(city.facilities[line.from], city) === facilityComponent(city.facilities[line.to], city) && nearby('bus').some(f => keyOf(f) === line.from || keyOf(f) === line.to)) ? Math.min(1, local('bus') * (city.policies.freeTransit ? 1.25 : 1)) : 0;
    const education = Math.max(component === undefined ? 0 : .2, local('school'));
    const health = Math.max(component === undefined ? 0 : .25, local('hospital'));
    const safety = Math.max(component === undefined ? 0 : .2, local('police'));
    const parks = local('park');
    lots.set(keyOf(lot), { energy: utility('energy', 'power'), water: utility('water', 'water'), sewage: utility('sewage', 'water'), waste: utility('waste', 'waste'), education, health, safety, fire: Math.max(.15, local('fire')), parks, transit, pollution,
      value: Math.max(0, Math.min(100, 30 + education * 15 + health * 15 + safety * 10 + parks * 20 + transit * 10 - pollution * .4)) });
  }
  const average = (key: keyof LotServices) => buildings.length ? buildings.reduce((sum, l) => sum + lots.get(keyOf(l))![key] * units(l), 0) / Math.max(1, demand) : (['energy', 'water', 'sewage', 'waste'].includes(key) ? 1 : 0);
  const coverage = { energy: average('energy'), water: average('water'), sewage: average('sewage'), waste: average('waste'), education: average('education'), health: average('health'), safety: average('safety'), fire: average('fire'), parks: average('parks'), transit: average('transit') };
  const result = { lots, coverage, utilities, pollution: average('pollution'), value: average('value') };
  serviceCache.set(city, result); return result;
}

export const layerValue = (layer: Layer, lot: Lot, city: City, traffic: Record<string, number> = {}) => {
  const s = assessServices(city).lots.get(keyOf(lot));
  if (!s) return 0;
  switch (layer) {
    case 'density': return Math.min(1, (lot.building?.occupants ?? 0) / 32);
    case 'value': return s.value / 100;
    case 'traffic': return Math.min(1, neighbors(lot).reduce((sum, n) => sum + (traffic[keyOf(n)] ?? 0), 0) / 40);
    case 'pollution': return s.pollution / 100;
    case 'crime': return 1 - s.safety;
    case 'education': return s.education;
    case 'health': return s.health;
    case 'energy': return s.energy;
    case 'water': return s.water;
    default: return 0;
  }
};
