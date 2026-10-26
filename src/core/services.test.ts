import { describe, expect, it } from 'vitest';
import { developedCity, fullyServedCity } from './__tests__/fixtures';
import { addBusLine, buildFacility, buildRoad, demolishCells, zoneCells } from './construction';
import { assessServices, facilityAt, layerValue } from './services';
import { capacityOf, getMetrics, simulateDay } from './simulation';
import { createCity } from './world';

describe('serviços, infraestrutura e evolução', () => {
  it('instalação ocupa 2 × 2 lotes, cobra a obra e protege sua área', () => {
    const initial = developedCity(false);
    const result = buildFacility(initial, { x: 8, z: 21 }, 'power');
    expect(result.error).toBeUndefined(); expect(result.cost).toBe(38000);
    expect(result.city.treasury).toBe(initial.treasury - 38000);
    expect(facilityAt(result.city, { x: 9, z: 22 })?.[1].kind).toBe('power');
    expect(zoneCells(result.city, [{ x: 9, z: 22 }], 'residential').changed).toBe(0);
    expect(buildRoad(result.city, { x: 9, z: 22 }, { x: 10, z: 22 }, 'street').changed).toBe(0);
    expect(buildFacility(result.city, { x: 9, z: 22 }, 'water').error).toBeTruthy();
  });
  it('não constrói serviço sem rua, dinheiro, marco, espaço ou terra firme', () => {
    const city = developedCity(false);
    for (const cell of [{ x: 2, z: 2 }, { x: 43, z: 20 }, { x: 55, z: 20 }, { x: 14, z: 20 }]) expect(buildFacility(city, cell, 'power').changed).toBe(0);
    expect(buildFacility({ ...city, treasury: 100 }, { x: 8, z: 21 }, 'power').error).toBeTruthy();
    expect(buildFacility({ ...city, peakPopulation: 0 }, { x: 8, z: 21 }, 'school').error).toBeTruthy();
  });
  it('capacidade e financiamento mudam o atendimento, as despesas e o crescimento', () => {
    const poor = developedCity(false), supplied = developedCity(true);
    expect(getMetrics(poor).coverage.energy).toBeLessThan(1);
    expect(getMetrics(supplied).coverage.energy).toBe(1);
    const cut = { ...supplied, funding: { ...supplied.funding, power: 0 } };
    expect(getMetrics(cut).coverage.energy).toBe(0);
    expect(getMetrics(cut).expenses).toBeLessThan(getMetrics(supplied).expenses);
    expect(getMetrics(simulateDay(cut)).population).toBeLessThan(getMetrics(cut).population);
  });
  it('instalação em rede isolada não supre outro bairro', () => {
    let city = developedCity(false);
    city = buildRoad(city, { x: 1, z: 3 }, { x: 5, z: 3 }, 'street').city;
    city = buildFacility(city, { x: 2, z: 4 }, 'power').city;
    expect(assessServices(city).lots.get('23,19')!.energy).toBeLessThan(1);
    city = buildRoad(city, { x: 5, z: 3 }, { x: 15, z: 3 }, 'street').city;
    city = buildRoad(city, { x: 15, z: 3 }, { x: 15, z: 8 }, 'street').city;
    expect(assessServices(city).lots.get('23,19')!.energy).toBe(1);
  });
  it('serviços valorizam lotes e permitem evolução visual e aumento de capacidade', () => {
    const city = fullyServedCity(), missing = developedCity();
    expect(layerValue('value', city.lots['23,19'], city)).toBeGreaterThan(layerValue('value', missing.lots['23,19'], missing));
    expect(assessServices(city).lots.get('23,19')!.health).toBe(1);
    const next = simulateDay(city);
    expect(next.lots['23,19'].building!.level).toBe(2);
    expect(capacityOf(next.lots['23,19'])).toBe(18);
    expect(missing.lots['23,19'].building!.level).toBe(1);
  });
  it('prefeitura reduz administração e bombeiros têm efeito na produtividade', () => {
    const city = fullyServedCity(), basic = developedCity();
    expect(getMetrics(city).costs.administration).toBeLessThan(getMetrics(basic).costs.administration);
    expect(getMetrics(city).coverage.fire).toBeGreaterThan(getMetrics(basic).coverage.fire);
    expect(getMetrics(city).taxes.commercial).toBeGreaterThan(getMetrics(basic).taxes.commercial);
  });
  it('moradores ocupam vagas de um prédio que evoluiu mesmo sem demanda por novos lotes', () => {
    const city = simulateDay(fullyServedCity());
    expect(getMetrics(city).demand.residential).toBe(0);
    const next = simulateDay(simulateDay(city));
    expect(getMetrics(next).population).toBeGreaterThan(getMetrics(city).population);
  });
  it('com tempo e cobertura suficientes, a evolução continua até o nível 3', () => {
    let city = { ...fullyServedCity(), day: 59 };
    for (let i = 0; i < 36; i++) city = simulateDay(city);
    expect(city.day).toBe(95);
    expect(city.lots['23,19'].building!.level).toBe(3);
  });
  it('empregos em ruas desconectadas não empregam moradores do outro bairro', () => {
    let city = buildRoad(createCity(), { x: 10, z: 20 }, { x: 12, z: 20 }, 'street').city;
    city = buildRoad(city, { x: 20, z: 20 }, { x: 22, z: 20 }, 'street').city;
    city = { ...city, lots: { '11,19': { x: 11, z: 19, kind: 'residential', building: { variant: 2, occupants: 10, age: 10 } }, '21,19': { x: 21, z: 19, kind: 'commercial', building: { variant: 0, occupants: 0, age: 10 } } } };
    expect(getMetrics(city).jobs).toBe(8); expect(getMetrics(city).employed).toBe(0);
    city = buildRoad(city, { x: 12, z: 20 }, { x: 20, z: 20 }, 'street').city;
    expect(getMetrics(city).employed).toBe(5);
  });
  it('demolir qualquer célula remove toda a instalação e suas linhas', () => {
    let city = developedCity();
    city = buildFacility(city, { x: 29, z: 21 }, 'bus').city;
    city = buildFacility(city, { x: 32, z: 21 }, 'bus').city;
    city = addBusLine(city, '29,21', '32,21');
    expect(city.busLines).toHaveLength(1);
    const removed = demolishCells(city, [{ x: 30, z: 22 }, { x: 29, z: 21 }]);
    expect(removed.cost).toBe(180); expect(removed.city.busLines).toHaveLength(0);
    expect(facilityAt(removed.city, { x: 29, z: 21 })).toBeUndefined();
  });
});
