import { describe, expect, it } from 'vitest';
import { buildRoad, demolishCells, zoneCells } from './construction';
import { capacityOf, getMetrics, simulateDay } from './simulation';
import { createCity, hasRoadAccess } from './world';
import { validateCity } from './persistence';

function starter() {
  let city = buildRoad(createCity('Cidade de teste', 42), { x: 10, z: 15 }, { x: 30, z: 15 }, 'street').city;
  city = zoneCells(city, Array.from({ length: 14 }, (_, i) => ({ x: 10 + i, z: 14 })), 'residential').city;
  city = zoneCells(city, Array.from({ length: 6 }, (_, i) => ({ x: 10 + i, z: 16 })), 'commercial').city;
  return zoneCells(city, Array.from({ length: 4 }, (_, i) => ({ x: 24 + i, z: 16 })), 'industrial').city;
}

describe('simulação urbana e economia', () => {
  it('não cria moradores ou edifícios sem acesso viário', () => {
    let city = zoneCells(createCity(), [{ x: 10, z: 10 }], 'residential').city;
    for (let i = 0; i < 60; i++) city = simulateDay(city);
    expect(getMetrics(city).population).toBe(0);
    expect(city.lots['10,10'].building).toBeUndefined();
  });

  it('constrói automaticamente, recebe moradores e cria empregos conforme a demanda', () => {
    let city = starter();
    for (let i = 0; i < 120; i++) city = simulateDay(city);
    const metrics = getMetrics(city);
    expect(metrics.population).toBeGreaterThan(10);
    expect(metrics.jobs).toBeGreaterThan(0);
    expect(metrics.buildings).toBeGreaterThan(3);
    for (const lot of Object.values(city.lots)) {
      if (lot.building) { expect(hasRoadAccess(lot, city.roads)).toBe(true); expect(lot.building.occupants).toBeLessThanOrEqual(capacityOf(lot)); }
    }
  });

  it('contabiliza receitas e despesas exatamente uma vez a cada 30 dias', () => {
    let city = createCity();
    const initial = city.treasury;
    for (let i = 0; i < 29; i++) city = simulateDay(city);
    expect(city.treasury).toBe(initial); expect(city.history).toHaveLength(0);
    city = simulateDay(city);
    const m = getMetrics(city);
    expect(city.history).toHaveLength(1);
    expect(city.treasury).toBe(initial + m.income - m.expenses);
    expect(city.history[0].balance).toBe(m.balance);
    expect(simulateDay(city).treasury).toBe(city.treasury);
  });

  it('impostos maiores aumentam receita potencial e reduzem satisfação e demanda', () => {
    let city = starter();
    for (let i = 0; i < 80; i++) city = simulateDay(city);
    const normal = getMetrics(city), high = getMetrics({ ...city, taxRate: 18 });
    expect(high.taxes.residential).toBeGreaterThan(normal.taxes.residential);
    expect(high.satisfaction).toBeLessThan(normal.satisfaction);
    expect(high.demand.residential).toBeLessThan(normal.demand.residential);
  });

  it('perder acesso viário faz moradores saírem e interrompe novos desenvolvimentos', () => {
    let city = starter();
    for (let i = 0; i < 90; i++) city = simulateDay(city);
    const before = getMetrics(city).population;
    city = demolishCells(city, Object.values(city.roads)).city;
    for (let i = 0; i < 20; i++) city = simulateDay(city);
    expect(getMetrics(city).population).toBe(0); expect(before).toBeGreaterThan(0);
    expect(getMetrics(city).jobs).toBe(0);
  });

  it('é determinística e não altera o estado anterior', () => {
    const initial = starter(), snapshot = JSON.stringify(initial);
    let a = initial, b = structuredClone(initial);
    for (let i = 0; i < 100; i++) { a = simulateDay(a); b = simulateDay(b); }
    expect(a).toEqual(b); expect(JSON.stringify(initial)).toBe(snapshot);
  });

  it('sustenta 900 dias de jogo com estado válido, histórico e caixa reconciliado', () => {
    let city = starter();
    const initial = city.treasury;
    for (let i = 0; i < 900; i++) city = simulateDay(city);
    expect(city.history).toHaveLength(30);
    expect(city.treasury).toBe(initial + city.history.reduce((sum, row) => sum + row.balance, 0));
    expect(city.treasury).toBeGreaterThan(0);
    expect(getMetrics(city).population).toBeGreaterThan(20);
    expect(validateCity(city)).toEqual(city);
    expect(Number.isFinite(getMetrics(city).satisfaction)).toBe(true);
  });
});
