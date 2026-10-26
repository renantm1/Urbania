import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteSave, listSaves, loadCity, saveCity, validateCity } from './persistence';
import { createCity } from './world';
import { buildRoad, zoneCells } from './construction';

beforeEach(async () => { for (const entry of await listSaves()) await deleteSave(entry.slot); });

describe('salvamentos versionados', () => {
  it('salva e recupera o mundo inteiro sem compartilhar referências', async () => {
    let city = buildRoad(createCity('Aurora'), { x: 10, z: 10 }, { x: 20, z: 10 }, 'street').city;
    city = zoneCells(city, [{ x: 12, z: 11 }], 'residential').city;
    await saveCity('slot-1', city);
    expect(await loadCity('slot-1')).toEqual(city);
    expect(await loadCity('slot-1')).not.toBe(city);
    expect((await listSaves())[0].savedAt).toBeTruthy();
  });

  it('mantém slots independentes e permite substituir e excluir', async () => {
    await saveCity('slot-1', createCity('Primeira'));
    await saveCity('slot-2', createCity('Segunda'));
    await saveCity('slot-1', createCity('Terceira'));
    expect((await loadCity('slot-1')).name).toBe('Terceira');
    expect((await loadCity('slot-2')).name).toBe('Segunda');
    await deleteSave('slot-1');
    expect(await listSaves()).toHaveLength(1);
    await expect(loadCity('slot-1')).rejects.toThrow();
  });

  it('rejeita versão desconhecida, economia inválida, coordenadas e ocupação incorretas', () => {
    const city = createCity();
    for (const invalid of [null, [], { ...city, version: 99 }, { ...city, treasury: Infinity }, { ...city, taxRate: 100 }, { ...city, day: -1 }, { ...city, name: '<'.repeat(100) },
      { ...city, roads: { '1,1': { x: 2, z: 1, kind: 'street' } } },
      { ...city, roads: { '1,1': { x: -1, z: 1, kind: 'street' } } },
      { ...city, lots: { '1,1': { x: 1, z: 1, kind: 'residential', building: { variant: 1, age: 0, occupants: 999 } } } },
      { ...city, history: [{ month: 1, income: 10, expenses: 5, balance: 10, population: 0 }] }]) expect(() => validateCity(invalid)).toThrow();
  });

  it('rejeita sobreposição de via e lote e construções na água', () => {
    const city = buildRoad(createCity(), { x: 10, z: 10 }, { x: 10, z: 10 }, 'street').city;
    expect(() => validateCity({ ...city, lots: { '10,10': { x: 10, z: 10, kind: 'residential' } } })).toThrow();
    expect(() => validateCity({ ...city, roads: { '44,10': { x: 44, z: 10, kind: 'street' } } })).toThrow();
  });
});
