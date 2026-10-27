import { describe, expect, it } from 'vitest';
import { buildFacility, buildRoad, demolishCells, previewConstruction, zoneCells } from './construction';
import { createCity, brushCells } from './world';

const options = { anchor: null, roadKind: 'street' as const, facilityKind: 'power' as const, brush: 3 };
describe('prévia e confirmação compartilham regras', () => {
  it('cobra apenas os lotes elegíveis quando o pincel passa por vias e zonas existentes', () => {
    const cell = { x: 10, z: 10 };
    const base = buildRoad(createCity(), { x: 9, z: 10 }, { x: 11, z: 10 }, 'street').city;
    const city = zoneCells(base, [{ x: 10, z: 11 }], 'mixed').city;
    const preview = previewConstruction(city, 'mixed', cell, options);
    const result = zoneCells(city, brushCells(cell, 3), 'mixed');
    expect(preview.error).toBeUndefined(); expect(preview.cost).toBe(600);
    expect(preview.cost).toBe(result.cost); expect(preview.changes).toHaveLength(result.changed);
  });
  it('sinaliza acesso ausente, marco bloqueado e obstáculos antes de construir instalações', () => {
    const city = createCity(), cell = { x: 10, z: 10 };
    for (const kind of ['power', 'school'] as const) {
      const preview = previewConstruction(city, 'facility', cell, { ...options, facilityKind: kind });
      expect(preview.error).toBe(buildFacility(city, cell, kind).error);
      expect(preview.error).toMatch(kind === 'power' ? /ao lado de uma rua/ : /habitantes/);
    }
    const blocked = buildRoad(city, cell, { x: 12, z: 10 }, 'street').city;
    expect(previewConstruction(blocked, 'facility', cell, options).error).toBe(buildFacility(blocked, cell, 'power').error);
  });
  it('confere a diferença de preço de vias e a demolição de uma instalação inteira', () => {
    const start = { x: 10, z: 10 }, end = { x: 14, z: 10 };
    const base = buildRoad(createCity(), start, end, 'street').city;
    const road = previewConstruction(base, 'road', end, { ...options, anchor: start, roadKind: 'avenue' });
    expect(road.cost).toBe(buildRoad(base, start, end, 'avenue').cost); expect(road.cost).toBe(6000);
    const city = buildFacility(base, { x: 10, z: 11 }, 'power').city;
    const cell = { x: 11, z: 12 }, demolition = previewConstruction(city, 'bulldoze', cell, options);
    expect(demolition.cost).toBe(180); expect(demolition.cost).toBe(demolishCells(city, brushCells(cell, 3)).cost);
    const poor = { ...city, treasury: 0 };
    expect(previewConstruction(poor, 'bulldoze', cell, options).error).toBe(demolishCells(poor, brushCells(cell, 3)).error);
  });
});
