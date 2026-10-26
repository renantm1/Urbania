import { bench, describe } from 'vitest';
import { buildFacility, buildRoad } from './construction';
import { createCity, hasRoadAccess, isBuildable, keyOf } from './world';
import { facilityAt } from './services';
import { getMetrics, simulateDay } from './simulation';
import { TrafficEngine } from './traffic';

let city = { ...createCity('Benchmark', 41), peakPopulation: 25000, treasury: 20_000_000 };
for (let z = 4; z <= 52; z += 4) city = buildRoad(city, { x: 4, z }, { x: 34, z }, 'avenue').city;
for (let x = 4; x <= 32; x += 4) city = buildRoad(city, { x, z: 4 }, { x, z: 52 }, 'avenue').city;
for (const [kind, x, z] of [['power', 5, 5], ['power', 9, 5], ['water', 13, 5], ['water', 17, 5], ['waste', 21, 5], ['waste', 25, 5], ['school', 5, 9], ['hospital', 9, 9], ['police', 13, 9], ['fire', 17, 9], ['park', 21, 9], ['cityhall', 25, 9]] as const) city = buildFacility(city, { x, z }, kind).city;
for (let x = 4; x <= 34; x++) for (let z = 4; z <= 52; z++) {
  const cell = { x, z }, key = keyOf(cell);
  if (!isBuildable(cell) || city.roads[key] || facilityAt(city, cell) || !hasRoadAccess(cell, city.roads)) continue;
  const kind = (x + z) % 5 === 0 ? 'industrial' : (x + z) % 3 === 0 ? 'commercial' : 'residential';
  city.lots[key] = { ...cell, kind, building: { variant: 0, level: 1, age: 50, occupants: kind === 'residential' ? 6 : 0 } };
}
let sample = 0;
const engine = new TrafficEngine();
for (let i = 0; i < 800; i++) engine.step(city, .1);

describe(`Cidade com ${Object.keys(city.lots).length} edifícios e ${Object.keys(city.roads).length} segmentos`, () => {
  bench('um dia completo de economia, serviços e evolução', () => { simulateDay(city); }, { time: 600, warmupTime: 200 });
  bench('recalcular indicadores e viagens em um novo estado', () => { getMetrics({ ...city, day: sample++ }); }, { time: 600, warmupTime: 200 });
  bench('passo de trânsito com pool limitado a 128 agentes', () => { engine.step(city, .1); }, { time: 600, warmupTime: 200 });
});
