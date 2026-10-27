import { describe, expect, it } from 'vitest';
import { developedCity } from './__tests__/fixtures';
import { addBusLine, buildFacility, buildRoad, demolishCells } from './construction';
import { TrafficEngine, VEHICLE_LIMIT, cachedPath, planTraffic } from './traffic';
import { getMetrics } from './simulation';
import { createCity, toWorld } from './world';

describe('rotas e agentes de trânsito', () => {
  it('cria viagens ligando moradias, empregos, indústria e serviços reais', () => {
    const city = developedCity(), plan = planTraffic(city);
    expect(plan.trips.length).toBeGreaterThan(5);
    expect(plan.trips.some(t => t.kind === 'car')).toBe(true);
    expect(plan.trips.some(t => t.kind === 'truck')).toBe(true);
    expect(plan.trips.some(t => t.kind === 'service')).toBe(true);
    expect(Object.values(plan.volumes).some(n => n > 0)).toBe(true);
    expect(plan.congestion).toBeGreaterThan(0);
  });
  it('cacheia A* por topologia e invalida rotas quando uma via desaparece', () => {
    const city = buildRoad(createCity(), { x: 10, z: 20 }, { x: 20, z: 20 }, 'street').city;
    const a = { x: 10, z: 20 }, b = { x: 20, z: 20 };
    expect(cachedPath(city, a, b)).toBe(cachedPath({ ...city, day: 100 }, a, b));
    const removed = demolishCells(city, [{ x: 15, z: 20 }]).city;
    expect(cachedPath(removed, a, b)).toEqual([]);
  });
  it('agentes se movem sobre vias, completam viagens e reutilizam um pool limitado', () => {
    const city = developedCity(), engine = new TrafficEngine(), original = [...engine.vehicles];
    for (let i = 0; i < 1600; i++) engine.step(city, .1);
    expect(engine.spawned).toBeGreaterThan(30); expect(engine.completed).toBeGreaterThan(0);
    expect(engine.activeCount).toBeLessThanOrEqual(VEHICLE_LIMIT);
    for (let i = 0; i < VEHICLE_LIMIT; i++) expect(engine.vehicles[i]).toBe(original[i]);
    for (const vehicle of engine.vehicles.filter(v => v.active)) {
      const road = vehicle.route[vehicle.index];
      expect(city.roads[`${road.x},${road.z}`]).toBeTruthy();
      expect(Math.hypot(vehicle.x - toWorld(road.x), vehicle.z - toWorld(road.z))).toBeLessThan(9);
    }
  });
  it('simulação de trânsito é determinística e cancela trajetos demolidos', () => {
    let city = developedCity(); const a = new TrafficEngine(), b = new TrafficEngine();
    for (let i = 0; i < 80; i++) { a.step(city, .1); b.step(city, .1); }
    expect(a.vehicles).toEqual(b.vehicles);
    city = demolishCells(city, Object.values(city.roads)).city; a.step(city, .1);
    expect(a.activeCount).toBe(0);
  });
  it('avenidas reduzem a pressão de tráfego com a mesma demanda', () => {
    const city = developedCity();
    const wide = { ...city, roads: Object.fromEntries(Object.entries(city.roads).map(([id, r]) => [id, { ...r, kind: 'avenue' as const }])) };
    expect(planTraffic(wide).congestion).toBeLessThan(planTraffic(city).congestion);
    expect(getMetrics(wide).satisfaction).toBeGreaterThanOrEqual(getMetrics(city).satisfaction);
  });
  it('linhas de ônibus exigem conexão, criam viagens e têm despesa e cobertura', () => {
    let city = developedCity();
    city = buildFacility(city, { x: 29, z: 21 }, 'bus').city;
    city = buildFacility(city, { x: 32, z: 21 }, 'bus').city;
    const line = addBusLine(city, '29,21', '32,21');
    expect(planTraffic(line).trips.some(t => t.kind === 'bus')).toBe(true);
    expect(getMetrics(line).coverage.transit).toBeGreaterThan(0);
    expect(getMetrics(line).costs.transport).toBe(950);
    expect(() => addBusLine(line, '32,21', '29,21')).toThrow();
    expect(() => addBusLine(city, '29,21', '29,21')).toThrow();
  });
  it('caminhões escolhem comércio na própria rede quando a primeira loja está isolada', () => {
    let city = buildRoad(createCity(), { x: 10, z: 20 }, { x: 20, z: 20 }, 'street').city;
    city = buildRoad(city, { x: 30, z: 20 }, { x: 32, z: 20 }, 'street').city;
    city = { ...city, lots: {
      '30,19': { x: 30, z: 19, kind: 'commercial', building: { variant: 0, occupants: 0, age: 20 } },
      '10,19': { x: 10, z: 19, kind: 'industrial', building: { variant: 0, occupants: 0, age: 20 } },
      '20,19': { x: 20, z: 19, kind: 'mixed', building: { variant: 0, occupants: 0, workers: 0, age: 20 } },
    } };
    const truck = planTraffic(city).trips.find(t => t.kind === 'truck');
    expect(truck?.path[0]).toEqual({ x: 10, z: 20 }); expect(truck?.path.at(-1)).toEqual({ x: 20, z: 20 });
  });
});
