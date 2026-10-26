import type { Cell, City } from './types';
import { findRoadPath, hash, keyOf, neighbors, toWorld } from './world';
import { assessServices, componentOf, facilityAccess, footprint } from './services';

export type VehicleKind = 'car' | 'truck' | 'service' | 'bus';
export interface Trip { path: Cell[]; kind: VehicleKind; weight: number }
export interface TrafficPlan { trips: Trip[]; volumes: Record<string, number>; congestion: number; disconnected: number }
const caches = new WeakMap<City['roads'], Map<string, Cell[]>>();
export function cachedPath(city: City, from: Cell, to: Cell) {
  let cache = caches.get(city.roads);
  if (!cache) { cache = new Map(); caches.set(city.roads, cache); }
  const key = `${keyOf(from)}>${keyOf(to)}`;
  const found = cache.get(key); if (found) return found;
  const path = findRoadPath(city.roads, from, to);
  if (cache.size >= 512) cache.delete(cache.keys().next().value!);
  cache.set(key, path); return path;
}
export const accessRoad = (cell: Cell, city: City) => neighbors(cell).find(n => city.roads[keyOf(n)]);
const planCache = new WeakMap<City, TrafficPlan>();
export function planTraffic(city: City): TrafficPlan {
  const previous = planCache.get(city); if (previous) return previous;
  const coverage = assessServices(city);
  const homes = Object.values(city.lots).filter(l => l.kind === 'residential' && (l.building?.occupants ?? 0) > 0);
  const jobs = Object.values(city.lots).filter(l => l.kind !== 'residential' && l.building && Math.min(coverage.lots.get(keyOf(l))!.energy, coverage.lots.get(keyOf(l))!.water) >= .55);
  const facilities = Object.values(city.facilities).filter(f => facilityAccess(f, city) && city.funding[f.kind] > 0);
  const trips: Trip[] = [], volumes: Record<string, number> = {};
  let disconnected = 0;
  const add = (from: Cell | undefined, to: Cell | undefined, kind: VehicleKind, weight: number) => {
    if (!from || !to) return false;
    if (keyOf(from) === keyOf(to)) return true;
    const path = cachedPath(city, from, to);
    if (path.length < 2) return false;
    trips.push({ path, kind, weight });
    for (const cell of path) volumes[keyOf(cell)] = (volumes[keyOf(cell)] ?? 0) + weight;
    return true;
  };
  for (const home of homes.slice(0, 96)) {
    const from = accessRoad(home, city);
    const reachable = jobs.filter(job => componentOf(job, city) === componentOf(home, city));
    // Try a deterministic destination, then other employers in case of a disconnected graph.
    const offset = Math.floor(hash(home.x, home.z, city.seed) * reachable.length);
    let served = false;
    for (let i = 0; i < Math.min(reachable.length, 24); i++) {
      const job = reachable[(offset + i) % reachable.length];
      const transit = coverage.lots.get(keyOf(home))?.transit ?? 0;
      if (add(from, accessRoad(job, city), 'car', Math.max(1, home.building!.occupants * .55 * (1 - transit * .35) * Math.max(1, homes.length / 96)))) { served = true; break; }
    }
    if (!served && jobs.length) disconnected++;
  }
  for (const industry of jobs.filter(l => l.kind === 'industrial').slice(0, 16)) {
    const shop = jobs.find(l => l.kind === 'commercial' && l !== industry);
    if (shop) add(accessRoad(industry, city), accessRoad(shop, city), 'truck', 4);
  }
  for (const f of facilities.slice(0, 16)) {
    const road = footprint(f).map(c => accessRoad(c, city)).find(Boolean);
    const home = homes[Math.floor(hash(f.x, f.z, 19) * homes.length)];
    if (home && f.kind !== 'park' && f.kind !== 'bus') add(road, accessRoad(home, city), 'service', 1);
  }
  for (const line of city.busLines) {
    const a = city.facilities[line.from], b = city.facilities[line.to];
    if (a && b && city.funding.bus > 0) {
      const ar = footprint(a).map(c => accessRoad(c, city)).find(Boolean), br = footprint(b).map(c => accessRoad(c, city)).find(Boolean);
      add(ar, br, 'bus', 2); add(br, ar, 'bus', 2);
    }
  }
  const ratios = Object.entries(volumes).map(([key, count]) => Math.min(1, count / (city.roads[key]?.kind === 'avenue' ? 70 : 28)));
  const congestion = ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100) : 0;
  const result = { trips, volumes, congestion, disconnected };
  planCache.set(city, result); return result;
}

export interface Vehicle {
  active: boolean; kind: VehicleKind; route: Cell[]; index: number; progress: number;
  x: number; z: number; previousX: number; previousZ: number; angle: number;
  generation: number;
}
export const VEHICLE_LIMIT = 128;
/** Fixed-step representative agents. Objects are reused; no per-citizen render objects. */
export class TrafficEngine {
  vehicles: Vehicle[] = Array.from({ length: VEHICLE_LIMIT }, () => ({ active: false, kind: 'car', route: [], index: 0, progress: 0, x: 0, z: 0, previousX: 0, previousZ: 0, angle: 0, generation: 0 }));
  clock = 0; completed = 0; spawned = 0;
  private id = ''; private roads: City['roads'] | null = null; private spawnClock = 0; private serial = 0;
  reset(city: City) {
    this.id = city.id; this.roads = city.roads; this.clock = 0; this.completed = 0; this.spawned = 0; this.spawnClock = 0;
    for (const v of this.vehicles) v.active = false;
  }
  step(city: City, dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > .5) throw new Error('Traffic step must be a fixed bounded interval.');
    if (this.id !== city.id) this.reset(city);
    if (this.roads !== city.roads) {
      this.roads = city.roads;
      for (const v of this.vehicles) if (v.active && v.route.some(c => !city.roads[keyOf(c)])) v.active = false;
    }
    const plan = planTraffic(city);
    this.clock += dt; this.spawnClock += dt;
    const target = Math.min(VEHICLE_LIMIT, Math.max(0, plan.trips.length * 2));
    if (this.spawnClock >= .65) {
      this.spawnClock = 0;
      const active = this.vehicles.filter(v => v.active).length;
      const v = this.vehicles.find(v => !v.active);
      if (v && active < target && plan.trips.length) {
        const trip = plan.trips[this.spawned % plan.trips.length];
        v.active = true; v.kind = trip.kind; v.route = this.spawned % 2 && trip.kind === 'car' ? [...trip.path].reverse() : trip.path;
        v.index = 0; v.progress = 0; v.x = v.previousX = toWorld(v.route[0].x); v.z = v.previousZ = toWorld(v.route[0].z); this.spawned++; v.generation = ++this.serial;
      }
    }
    for (const v of this.vehicles) {
      if (!v.active) continue;
      v.previousX = v.x; v.previousZ = v.z;
      const a = v.route[v.index], b = v.route[v.index + 1];
      if (!a || !b) { v.active = false; this.completed++; continue; }
      const junction = neighbors(b).filter(c => city.roads[keyOf(c)]).length >= 3;
      const vertical = a.z !== b.z;
      const red = junction && (Math.floor(this.clock / 5) % 2 === 0) !== vertical && v.progress > .55;
      const blocked = this.vehicles.some(other => other !== v && other.active && other.route[other.index + 1] && keyOf(other.route[other.index]) === keyOf(a) && keyOf(other.route[other.index + 1]) === keyOf(b) && other.progress > v.progress && other.progress - v.progress < .38);
      const load = (plan.volumes[keyOf(a)] ?? 0) / (city.roads[keyOf(a)]?.kind === 'avenue' ? 70 : 28);
      if (!red && !blocked) v.progress += dt * (v.kind === 'truck' ? .48 : v.kind === 'bus' ? .55 : .75) / (1 + load * .65);
      if (v.progress >= 1) { v.progress -= 1; v.index++; if (v.index >= v.route.length - 1) { v.active = false; this.completed++; continue; } }
      const from = v.route[v.index], to = v.route[v.index + 1];
      const dx = to.x - from.x, dz = to.z - from.z;
      const previous = v.index ? v.route[v.index - 1] : from;
      // Blend the lane offset at a turn, keeping the agent within the road junction.
      const blend = Math.min(1, v.progress * 4);
      const oldDx = from.x - previous.x, oldDz = from.z - previous.z;
      const laneX = (-oldDz * (1 - blend) - dz * blend) * .85;
      const laneZ = (oldDx * (1 - blend) + dx * blend) * .85;
      v.x = toWorld(from.x + dx * v.progress) + laneX;
      v.z = toWorld(from.z + dz * v.progress) + laneZ;
      v.angle = Math.atan2(dx, dz);
    }
  }
  get activeCount() { return this.vehicles.reduce((n, v) => n + Number(v.active), 0); }
}
export const trafficEngine = new TrafficEngine();
