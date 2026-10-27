import { describe, expect, it } from 'vitest';
import type { City, Lot } from './types';
import { buildRoad, demolishCells, zoneCells } from './construction';
import { createCity } from './world';
import { getMetrics, simulateDay } from './simulation';
import { assessServices, layerValue } from './services';
import { planTraffic } from './traffic';
import { validateCity } from './persistence';
import { residentialCapacity, workplaceCapacity } from './zoning';
import { fullyServedCity } from './__tests__/fixtures';

const shopHome = (x: number, occupants = 8): Lot => ({ x, z: 19, kind: 'mixed', building: { variant: 0, occupants, workers: 3, age: 90, level: 1 } });
function neighborhood(): City {
  const city = buildRoad(createCity(), { x: 10, z: 20 }, { x: 20, z: 20 }, 'street').city;
  return { ...city, lots: { '10,19': shopHome(10), '20,19': shopHome(20) } };
}

describe('zoneamento misto integrado', () => {
  it('cresce conforme as duas demandas e oferece moradia e comércio sem duplicar população', () => {
    let city = buildRoad(createCity(), { x: 10, z: 20 }, { x: 20, z: 20 }, 'street').city;
    city = zoneCells(city, [{ x: 10, z: 19 }], 'mixed').city;
    expect(getMetrics(city).demand.mixed).toBe(Math.min(getMetrics(city).demand.residential, getMetrics(city).demand.commercial));
    for (let i = 0; i < 24; i++) city = simulateDay(city);
    const lot = city.lots['10,19'];
    expect(lot.building).toBeDefined();
    expect(getMetrics(city).population).toBe(lot.building!.occupants);
    expect(getMetrics(city).population).toBeGreaterThan(2);
    expect(getMetrics(city).capacity).toBe(8); expect(getMetrics(city).jobs).toBe(4);
    expect(lot.building!.workers).toBeGreaterThan(0);
    expect(getMetrics(city).taxes.residential).toBeGreaterThan(0);
    expect(getMetrics(city).taxes.commercial).toBeGreaterThan(0);
    expect(getMetrics(city).taxes.industrial).toBe(0);
    expect(validateCity(city)).toEqual(city);
  });

  it('exige demanda comercial e acesso à via para desenvolver o lote', () => {
    const base = neighborhood();
    const city = { ...base, day: 2, lots: { '10,19': shopHome(10), '20,19': { x: 20, z: 19, kind: 'mixed' as const }, '10,10': { x: 10, z: 10, kind: 'mixed' as const }, '11,19': { x: 11, z: 19, kind: 'commercial' as const, building: { variant: 0, age: 20, occupants: 0, level: 3 as const } } } };
    expect(getMetrics(city).demand.mixed).toBe(0);
    const next = simulateDay(city);
    expect(next.lots['20,19'].building).toBeUndefined(); expect(next.lots['10,10'].building).toBeUndefined();
  });

  it('conta consumo residencial e comercial; falta de rede remove moradores e paralisa lojas', () => {
    const city = neighborhood();
    expect(assessServices(city).utilities.energy.demand).toBe(24);
    const next = simulateDay({ ...city, funding: { ...city.funding, power: 0 } });
    expect(next.lots['10,19'].building!.occupants).toBe(7);
    expect(next.lots['10,19'].building!.workers).toBe(0); expect(getMetrics(next).jobs).toBe(0);
  });

  it('empregos de um bairro isolado não atendem moradores do outro', () => {
    const base = neighborhood();
    const city = { ...base, lots: { '10,19': shopHome(10), '20,19': shopHome(20, 0) } };
    expect(getMetrics(city).employed).toBe(4);
    const disconnected = demolishCells(city, [{ x: 15, z: 20 }]).city;
    expect(getMetrics(disconnected).employed).toBe(4); // Four workers can work in their own storefront.
    const noLocalShop = { ...disconnected, lots: { ...disconnected.lots, '10,19': { ...disconnected.lots['10,19'], kind: 'residential' as const } } };
    expect(getMetrics(noLocalShop).jobs).toBe(4); expect(getMetrics(noLocalShop).employed).toBe(0);
  });

  it('cria viagens reais para os usos mistos e remove trajetos após demolição', () => {
    const base = neighborhood();
    const city = { ...base, lots: { '10,19': shopHome(10), '20,19': { x: 20, z: 19, kind: 'commercial' as const, building: { variant: 0, age: 10, occupants: 4 } } } };
    // Search deterministic seeds because the representative destination is sampled.
    const moving = Array.from({ length: 12 }, (_, seed) => ({ ...city, seed })).find(c => planTraffic(c).trips.some(t => t.kind === 'car'))!;
    expect(moving).toBeDefined(); expect(planTraffic(moving).trips.some(t => t.path.length === 11)).toBe(true);
    expect(planTraffic(demolishCells(moving, [{ x: 15, z: 20 }]).city).trips).toHaveLength(0);
  });

  it('evolui os dois usos com serviços; o mapa de densidade mede apenas moradores', () => {
    const base = fullyServedCity();
    const city = { ...base, lots: { ...base.lots, '23,19': shopHome(23) } };
    const next = simulateDay(city), lot = next.lots['23,19'];
    expect(lot.building!.level).toBe(2);
    expect(residentialCapacity(lot)).toBe(24); expect(workplaceCapacity(lot)).toBe(12);
    expect(layerValue('density', lot, next)).toBe(lot.building!.occupants / 32);
    const commerce = { ...lot, kind: 'commercial' as const };
    expect(layerValue('density', commerce, next)).toBe(0);
    expect(validateCity(next)).toEqual(next);
  });

  it('mantém o save 2 intacto ao migrar e rejeita ocupações incompatíveis no save 3', () => {
    const base = createCity('Clássica');
    const v2 = { ...base, version: 2 };
    const migrated = validateCity(v2);
    expect(migrated).toEqual({ ...v2, version: 3 }); expect(v2.version).toBe(2);
    const city = neighborhood(); expect(validateCity(city)).toEqual(city);
    for (const bad of [
      { ...city, version: 2 },
      { ...city, lots: { '10,19': { ...shopHome(10), building: { ...shopHome(10).building, workers: 5 } } } },
      { ...city, lots: { '10,19': { ...shopHome(10), building: { ...shopHome(10).building, occupants: 9 } } } },
      { ...city, lots: { '10,19': { ...shopHome(10), kind: 'residential' } } },
    ]) expect(() => validateCity(bad)).toThrow();
  });
  it('não atribui funcionários fictícios a lojas isoladas e reconcilia as vagas preenchidas', () => {
    let city = neighborhood();
    city = { ...city, lots: { ...city.lots, '11,19': shopHome(11, 0), '12,19': shopHome(12, 0) } };
    const expected = getMetrics(city).employed, next = simulateDay(city);
    expect(Object.values(next.lots).reduce((sum, lot) => sum + (lot.building?.workers ?? 0), 0)).toBe(expected);
    const limited = { ...city, funding: { ...city.funding, power: 20 } }, limitedNext = simulateDay(limited);
    expect(getMetrics(limited).jobs).toBe(8);
    expect(Object.values(limitedNext.lots).every(lot => (lot.building?.workers ?? 0) <= 2)).toBe(true);
    const isolated = demolishCells({ ...city, lots: { ...city.lots, '20,19': shopHome(20, 0) } }, [{ x: 15, z: 20 }]).city;
    expect(simulateDay(isolated).lots['20,19'].building!.workers).toBe(0);
  });
});
