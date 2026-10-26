import type { City } from '../types';
import { createCity, keyOf } from '../world';
import { buildFacility, buildRoad } from '../construction';

export function developedCity(utilities = true): City {
  let city = createCity('Cidade integrada', 19);
  city = buildRoad(city, { x: 8, z: 20 }, { x: 38, z: 20 }, 'street').city;
  for (const x of [15, 25]) city = buildRoad(city, { x, z: 8 }, { x, z: 36 }, 'street').city;
  const lots: City['lots'] = {};
  for (let x = 8; x <= 36; x++) {
    if ([15, 25].includes(x)) continue;
    lots[keyOf({ x, z: 19 })] = { x, z: 19, kind: x < 30 ? 'residential' : 'commercial', building: { variant: 0, level: 1, age: 90, occupants: x < 30 ? 6 : 0 } };
  }
  for (const x of [14, 24]) for (const z of [10, 11]) lots[keyOf({ x, z })] = { x, z, kind: 'industrial', building: { variant: 0, level: 1, age: 90, occupants: 0 } };
  city = { ...city, lots, peakPopulation: 5000, day: 89 };
  if (utilities) for (const [kind, x] of [['power', 8], ['water', 11], ['waste', 18]] as const) {
    const result = buildFacility(city, { x, z: 21 }, kind);
    if (result.error) throw new Error(result.error); city = result.city;
  }
  return city;
}

export function fullyServedCity() {
  let city = developedCity();
  for (const [kind, x, z] of [['school', 13, 16], ['hospital', 26, 22], ['police', 13, 23], ['park', 26, 16], ['fire', 26, 26], ['cityhall', 35, 21]] as const) {
    const result = buildFacility(city, { x, z }, kind);
    if (result.error) throw new Error(result.error); city = result.city;
  }
  return city;
}
