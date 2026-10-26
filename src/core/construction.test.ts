import { describe, expect, it } from 'vitest';
import { buildRoad, demolishCells, zoneCells } from './construction';
import { createCity, findRoadPath, keyOf, roadGraph, roadLine } from './world';
import { simulateDay } from './simulation';

describe('construção de vias e lotes', () => {
  it('cobra por extensão e conecta cruzamentos em um grafo navegável', () => {
    const initial = createCity();
    const eastWest = buildRoad(initial, { x: 10, z: 12 }, { x: 20, z: 12 }, 'street');
    expect(eastWest.changed).toBe(11);
    expect(eastWest.cost).toBe(13200);
    const crossing = buildRoad(eastWest.city, { x: 15, z: 8 }, { x: 15, z: 16 }, 'street');
    expect(crossing.changed).toBe(8);
    expect(roadGraph(crossing.city.roads).get('15,12')).toHaveLength(4);
    const path = findRoadPath(crossing.city.roads, { x: 10, z: 12 }, { x: 15, z: 16 });
    expect(path).toHaveLength(10);
    expect(path[0]).toEqual({ x: 10, z: 12 });
    expect(path.at(-1)).toEqual({ x: 15, z: 16 });
    expect(initial.roads).toEqual({});
    expect(initial.treasury).toBe(2_000_000);
  });

  it('alinha trechos ao eixo dominante, incluindo o ponto final', () => {
    expect(roadLine({ x: 5, z: 5 }, { x: 8, z: 6 })).toEqual([{ x: 5, z: 5 }, { x: 6, z: 5 }, { x: 7, z: 5 }, { x: 8, z: 5 }]);
    expect(roadLine({ x: 5, z: 5 }, { x: 4, z: 2 }).at(-1)).toEqual({ x: 5, z: 2 });
  });

  it('não constrói na água, fora do mapa ou sem dinheiro; a operação é atômica', () => {
    const city = createCity();
    for (const [a, b] of [[{ x: 38, z: 15 }, { x: 48, z: 15 }], [{ x: 0, z: 0 }, { x: -3, z: 0 }]]) {
      const result = buildRoad(city, a, b, 'street');
      expect(result.error).toBeTruthy(); expect(result.city).toBe(city);
    }
    const poor = { ...city, treasury: 100 };
    expect(buildRoad(poor, { x: 1, z: 1 }, { x: 2, z: 1 }, 'street').city).toBe(poor);
  });

  it('não cobra duas vezes por uma via existente e cobra a diferença na troca de tipo', () => {
    const city = buildRoad(createCity(), { x: 10, z: 10 }, { x: 12, z: 10 }, 'street').city;
    const same = buildRoad(city, { x: 10, z: 10 }, { x: 12, z: 10 }, 'street');
    expect(same.changed).toBe(0); expect(same.city.treasury).toBe(city.treasury);
    const upgrade = buildRoad(city, { x: 10, z: 10 }, { x: 12, z: 10 }, 'avenue');
    expect(upgrade.cost).toBe(3600);
    expect(Object.values(upgrade.city.roads).every(r => r.kind === 'avenue')).toBe(true);
  });

  it('pinta apenas lotes válidos, elimina duplicações e preserva as vias', () => {
    const city = buildRoad(createCity(), { x: 10, z: 10 }, { x: 12, z: 10 }, 'street').city;
    const result = zoneCells(city, [{ x: 10, z: 10 }, { x: 10, z: 11 }, { x: 10, z: 11 }, { x: -1, z: 11 }], 'residential');
    expect(result.changed).toBe(1); expect(result.cost).toBe(120);
    expect(Object.keys(result.city.lots)).toEqual(['10,11']);
    expect(result.city.roads['10,10']).toBeTruthy();
  });

  it('protege edifícios contra rezoneamento e construção por cima', () => {
    let city = buildRoad(createCity(), { x: 10, z: 10 }, { x: 12, z: 10 }, 'street').city;
    city = zoneCells(city, [{ x: 11, z: 11 }], 'residential').city;
    for (let i = 0; i < 3; i++) city = simulateDay(city);
    expect(city.lots['11,11'].building).toBeTruthy();
    expect(zoneCells(city, [{ x: 11, z: 11 }], 'industrial').city).toBe(city);
    expect(buildRoad(city, { x: 11, z: 11 }, { x: 12, z: 11 }, 'street').city).toBe(city);
  });

  it('demolir uma via interrompe a rota; não modifica objetos anteriores', () => {
    const city = buildRoad(createCity(), { x: 10, z: 10 }, { x: 15, z: 10 }, 'street').city;
    const result = demolishCells(city, [{ x: 12, z: 10 }]);
    expect(result.cost).toBe(180);
    expect(findRoadPath(result.city.roads, { x: 10, z: 10 }, { x: 15, z: 10 })).toEqual([]);
    expect(city.roads[keyOf({ x: 12, z: 10 })]).toBeTruthy();
  });

  it('demolição de terreno vazio não custa nada e limpar zona vazia é gratuito', () => {
    const city = zoneCells(createCity(), [{ x: 10, z: 10 }], 'residential').city;
    const result = demolishCells(city, [{ x: 10, z: 10 }, { x: 11, z: 10 }]);
    expect(result.changed).toBe(1); expect(result.cost).toBe(0); expect(result.city.lots).toEqual({});
    const inDebt = demolishCells({ ...city, treasury: -100 }, [{ x: 10, z: 10 }]);
    expect(inDebt.changed).toBe(1); expect(inDebt.city.treasury).toBe(-100);
  });
});
