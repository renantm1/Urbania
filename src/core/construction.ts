import type { BuildResult, Cell, City, FacilityKind, RoadKind, ZoneKind } from './types';
import { DEMOLITION_COST, ROAD_COST, ZONE_COST, isBuildable, keyOf, roadLine } from './world';
import { FACILITIES, facilityAccess, facilityAt, facilityComponent, footprint, unlocked } from './services';

const failure = (city: City, error: string): BuildResult => ({ city, error, changed: 0, cost: 0 });

export function buildRoad(city: City, start: Cell, end: Cell, kind: RoadKind): BuildResult {
  const cells = roadLine(start, end);
  if (cells.some(cell => !isBuildable(cell))) return failure(city, 'A via precisa ficar em terra firme, dentro do território.');
  if (cells.some(cell => facilityAt(city, cell))) return failure(city, 'Há uma instalação pública no caminho.');
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
  const changes = unique.filter(cell => isBuildable(cell) && !city.roads[keyOf(cell)] && !facilityAt(city, cell) && !city.lots[keyOf(cell)]?.building && city.lots[keyOf(cell)]?.kind !== kind);
  if (!changes.length) return failure(city, 'Pinte um terreno livre. Edifícios existentes precisam ser demolidos para mudar de zona.');
  const cost = changes.length * ZONE_COST;
  if (cost > city.treasury) return failure(city, 'Caixa insuficiente para zonear esta área.');
  const lots = { ...city.lots };
  for (const cell of changes) lots[keyOf(cell)] = { ...cell, kind };
  return { city: { ...city, lots, treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

export function demolishCells(city: City, cells: Cell[]): BuildResult {
  const changes = [...new Map(cells.map(cell => [keyOf(cell), cell])).values()].filter(cell => city.roads[keyOf(cell)] || city.lots[keyOf(cell)] || facilityAt(city, cell));
  if (!changes.length) return failure(city, 'Selecione uma via, um edifício ou uma zona para remover.');
  const removedFacilities = new Set(changes.map(cell => facilityAt(city, cell)?.[0]).filter((key): key is string => !!key));
  const cost = removedFacilities.size * DEMOLITION_COST + changes.reduce((sum, cell) => sum + (city.roads[keyOf(cell)] || city.lots[keyOf(cell)]?.building ? DEMOLITION_COST : 0), 0);
  if (cost > 0 && cost > city.treasury) return failure(city, 'Caixa insuficiente para a demolição.');
  const roads = { ...city.roads }, lots = { ...city.lots };
  for (const cell of changes) { delete roads[keyOf(cell)]; delete lots[keyOf(cell)]; }
  const facilities = { ...city.facilities };
  for (const key of removedFacilities) delete facilities[key];
  return { city: { ...city, roads, lots, facilities, busLines: city.busLines.filter(line => facilities[line.from] && facilities[line.to]), treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

export function buildFacility(city: City, cell: Cell, kind: FacilityKind): BuildResult {
  const spec = FACILITIES[kind];
  if (!unlocked(city, spec.unlock)) return failure(city, `Disponível a partir de ${Math.round(spec.unlock * city.milestoneScale)} habitantes no marco de população.`);
  const cells = footprint(cell);
  if (cells.some(c => !isBuildable(c) || city.roads[keyOf(c)] || city.lots[keyOf(c)]?.building || facilityAt(city, c))) return failure(city, 'A instalação precisa de uma área livre de 2 × 2 lotes em terra firme.');
  const facility = { ...cell, kind };
  if (!facilityAccess(facility, city)) return failure(city, 'Instale o serviço ao lado de uma rua para conectá-lo à cidade.');
  if (city.treasury < spec.cost) return failure(city, 'Caixa insuficiente para esta instalação.');
  const lots = { ...city.lots }; for (const c of cells) delete lots[keyOf(c)];
  return { city: { ...city, lots, facilities: { ...city.facilities, [keyOf(cell)]: facility }, treasury: city.treasury - spec.cost, totalConstruction: city.totalConstruction + spec.cost }, cost: spec.cost, changed: 1 };
}

export function addBusLine(city: City, from: string, to: string): City {
  const a = city.facilities[from], b = city.facilities[to];
  if (!a || !b || a.kind !== 'bus' || b.kind !== 'bus' || from === to || !facilityAccess(a, city) || !facilityAccess(b, city) || facilityComponent(a, city) !== facilityComponent(b, city)) throw new Error('Escolha duas estações distintas conectadas pela mesma rede viária.');
  if (city.busLines.some(line => (line.from === from && line.to === to) || (line.from === to && line.to === from))) throw new Error('Estas estações já têm uma linha.');
  return { ...city, busLines: [...city.busLines, { id: `${from}:${to}`, from, to }] };
}
