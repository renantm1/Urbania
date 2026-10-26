import { describe, expect, it } from 'vitest';
import { developedCity, fullyServedCity } from './__tests__/fixtures';
import { EVENT_INFO, resolveEvent } from './events';
import { getMetrics, simulateDay } from './simulation';
import { validateCity } from './persistence';
import { createCity } from './world';

describe('políticas, eventos e compatibilidade', () => {
  it('reciclagem reduz consumo de coleta e indústria limpa reduz poluição', () => {
    const city = developedCity();
    const policy = { ...city, policies: { ...city.policies, recycling: true, cleanIndustry: true } };
    expect(getMetrics(policy).utilities.waste.demand).toBeLessThan(getMetrics(city).utilities.waste.demand);
    expect(getMetrics(policy).pollution).toBeLessThanOrEqual(getMetrics(city).pollution);
    expect(getMetrics(policy).costs.policies).toBeGreaterThan(0);
    expect(getMetrics(policy).taxes.industrial).toBeLessThan(getMetrics(city).taxes.industrial);
  });
  it('incentivo habitacional aumenta demanda e reduz receita de IPTU', () => {
    const city = developedCity(), incentivized = { ...city, policies: { ...city.policies, housing: true } };
    expect(getMetrics(incentivized).taxes.residential).toBeLessThan(getMetrics(city).taxes.residential);
    expect(getMetrics(incentivized).demand.residential).toBeGreaterThanOrEqual(getMetrics(city).demand.residential);
  });
  it('eventos aparecem em data determinística sem sobrescrever uma decisão pendente', () => {
    const city = { ...developedCity(), day: 119 };
    const a = simulateDay(city), b = simulateDay(city);
    expect(a.event).toEqual(b.event); expect(a.event?.id).toBe(120);
    let next = a; for (let i = 0; i < 120; i++) next = simulateDay(next);
    expect(next.event).toEqual(a.event);
  });
  it('decisões movimentam caixa, modificam a economia e ficam no histórico', () => {
    const city = { ...developedCity(), event: { id: 80, kind: 'investment' as const } };
    const incentive = resolveEvent(city, 0), grant = resolveEvent(city, 1);
    expect(incentive.treasury).toBe(city.treasury - 30000);
    expect(incentive.modifiers.investmentUntil).toBe(city.day + 90);
    expect(getMetrics(incentive).taxes.commercial).toBeGreaterThan(getMetrics(city).taxes.commercial);
    expect(grant.treasury).toBe(city.treasury + 60000);
    expect(grant.event).toBeNull(); expect(grant.eventHistory[0].choice).toBe(1);
    expect(() => resolveEvent(grant, 1)).toThrow();
    expect(() => resolveEvent({ ...city, treasury: 0 }, 0)).toThrow();
  });
  it('todas as escolhas de eventos produzem saves válidos e respostas verificáveis', () => {
    for (const kind of Object.keys(EVENT_INFO) as (keyof typeof EVENT_INFO)[]) for (let choice = 0; choice < 3; choice++) {
      const city = { ...fullyServedCity(), event: { id: 89, kind } };
      const decided = resolveEvent(city, choice);
      expect(validateCity(decided)).toEqual(decided);
      expect(decided.eventHistory.at(-1)?.choice).toBe(choice);
      expect(decided.treasury).toBe(city.treasury - EVENT_INFO[kind].options[choice].cost);
    }
  });
  it('modificadores expiram no prazo, sem retirar a decisão do histórico', () => {
    const city = resolveEvent({ ...developedCity(), event: { id: 80, kind: 'recession' } }, 2);
    const recovered = { ...city, day: city.modifiers.recessionUntil };
    expect(getMetrics(recovered).taxes.commercial).toBeGreaterThan(getMetrics(city).taxes.commercial);
    expect(recovered.eventHistory).toHaveLength(1);
  });
  it('migra saves da versão 1 preservando cidade, ruas, lotes, caixa e data', () => {
    const city = developedCity(false);
    const legacy = { version: 1, id: city.id, name: city.name, seed: city.seed, roads: city.roads, lots: Object.fromEntries(Object.entries(city.lots).map(([k, l]) => [k, { ...l, building: l.building ? { variant: l.building.variant, age: l.building.age, occupants: l.building.occupants } : undefined }])), treasury: city.treasury, day: city.day, taxRate: city.taxRate, history: city.history, totalConstruction: city.totalConstruction };
    const migrated = validateCity(legacy);
    expect(migrated.version).toBe(2); expect(migrated.name).toBe(city.name);
    expect(migrated.roads).toEqual(city.roads); expect(migrated.day).toBe(city.day); expect(migrated.treasury).toBe(city.treasury);
    expect(migrated.facilities).toEqual({}); expect(migrated.peakPopulation).toBe(getMetrics(city).population);
    expect(migrated.funding.power).toBe(100); expect(validateCity(migrated)).toEqual(migrated);
  });
  it('rejeita infraestrutura sobreposta, funding inválido, linha órfã e evento inválido', () => {
    const city = developedCity();
    for (const corrupted of [
      { ...city, funding: { ...city.funding, power: -1 } },
      { ...city, funding: {} },
      { ...city, policies: { ...city.policies, recycling: 'true' } },
      { ...city, policies: { ...city.policies, unknown: true } },
      { ...city, facilities: { ...city.facilities, '8,20': { x: 8, z: 20, kind: 'school' } } },
      { ...city, facilities: { ...city.facilities, '9,22': { x: 9, z: 22, kind: 'school' } } },
      { ...city, busLines: [{ id: 'a', from: '1,1', to: '2,2' }] },
      { ...city, event: { id: 1, kind: 'investment', choice: 50 } },
      { ...city, milestoneScale: 0 },
    ]) expect(() => validateCity(corrupted)).toThrow();
    expect(validateCity(createCity()).version).toBe(2);
  });
});
