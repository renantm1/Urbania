import type { BuildResult, Cell, City, RoadKind, ZoneKind } from './types';
import { DEMOLITION_COST, ROAD_COST, ZONE_COST, isBuildable, keyOf, roadLine } from './world';

const failure = (city: City, error: string): BuildResult => ({ city, error, changed: 0, cost: 0 });

export function buildRoad(city: City, start: Cell, end: Cell, kind: RoadKind): BuildResult {
  const cells = roadLine(start, end);
  if (cells.some(cell => !isBuildable(cell))) return failure(city, 'A via precisa ficar em terra firme, dentro do território.');
  if (cells.some(cell => city.lots[keyOf(cell)]?.building)) return failure(city, 'Há uma construção no caminho. Demolir o edifício libera o terreno.');
  const changes = cells.filter(cell => city.roads[keyOf(cell)]?.kind !== kind);
  const cost = changes.reduce((sum, cell) => sum + (city.roads[keyOf(cell)] ? Math.abs(ROAD_COST[kind] - ROAD_COST[city.roads[keyOf(cell)].kind]) : ROAD_COST[kind]), 0);
  if (cost > city.treasury) return failure(city, 'Caixa insuficiente para construir esta via.');
  if (!changes.length) return failure(city, 'Este trecho de via já existe.');
  const roads = { ...city.roads }, lots = { ...city.lots };
  for (const cell of changes) { roads[keyOf(cell)] = { ...cell, kind }; delete lots[keyOf(cell)]; }
  return { city: { ...city, roads, lots, treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

export function zoneCells(city: City, cells: Cell[], kind: ZoneKind): BuildResult {
  const unique = [...new Map(cells.map(cell => [keyOf(cell), cell])).values()];
  const changes = unique.filter(cell => isBuildable(cell) && !city.roads[keyOf(cell)] && !city.lots[keyOf(cell)]?.building && city.lots[keyOf(cell)]?.kind !== kind);
  if (!changes.length) return failure(city, 'Pinte um terreno livre. Edifícios existentes precisam ser demolidos para mudar de zona.');
  const cost = changes.length * ZONE_COST;
  if (cost > city.treasury) return failure(city, 'Caixa insuficiente para zonear esta área.');
  const lots = { ...city.lots };
  for (const cell of changes) lots[keyOf(cell)] = { ...cell, kind };
  return { city: { ...city, lots, treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

export function demolishCells(city: City, cells: Cell[]): BuildResult {
  const changes = [...new Map(cells.map(cell => [keyOf(cell), cell])).values()].filter(cell => city.roads[keyOf(cell)] || city.lots[keyOf(cell)]);
  if (!changes.length) return failure(city, 'Selecione uma via, um edifício ou uma zona para remover.');
  const cost = changes.reduce((sum, cell) => sum + (city.roads[keyOf(cell)] || city.lots[keyOf(cell)]?.building ? DEMOLITION_COST : 0), 0);
  if (cost > 0 && cost > city.treasury) return failure(city, 'Caixa insuficiente para a demolição.');
  const roads = { ...city.roads }, lots = { ...city.lots };
  for (const cell of changes) { delete roads[keyOf(cell)]; delete lots[keyOf(cell)]; }
  return { city: { ...city, roads, lots, treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}
