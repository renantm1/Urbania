import type { BuildResult, Cell, City, FacilityKind, RoadKind, Tool, ZoneKind } from './types';
import { DEMOLITION_COST, ROAD_COST, ZONE_COST, brushCells, isBuildable, keyOf, roadLine } from './world';
import { FACILITIES, facilityAccess, facilityAt, facilityComponent, footprint, unlocked } from './services';

const failure = (city: City, error: string): BuildResult => ({ city, error, changed: 0, cost: 0 });
export interface ConstructionPlan { cells: Cell[]; changes: Cell[]; cost: number; error?: string }

function planRoad(city: City, start: Cell, end: Cell, kind: RoadKind): ConstructionPlan {
  const cells = roadLine(start, end);
  const changes = cells.filter(cell => city.roads[keyOf(cell)]?.kind !== kind);
  const cost = changes.reduce((sum, cell) => sum + (city.roads[keyOf(cell)] ? Math.abs(ROAD_COST[kind] - ROAD_COST[city.roads[keyOf(cell)].kind]) : ROAD_COST[kind]), 0);
  const error = cells.some(cell => !isBuildable(cell)) ? 'A via precisa ficar em terra firme, dentro do território.'
    : cells.some(cell => facilityAt(city, cell)) ? 'Há uma instalação pública no caminho.'
    : cells.some(cell => city.lots[keyOf(cell)]?.building) ? 'Há uma construção no caminho. Demolir o edifício libera o terreno.'
    : !changes.length ? 'Este trecho de via já existe.' : cost > city.treasury ? 'Caixa insuficiente para construir esta via.' : undefined;
  return { cells, changes, cost, error };
}

export function buildRoad(city: City, start: Cell, end: Cell, kind: RoadKind): BuildResult {
  const { changes, cost, error } = planRoad(city, start, end, kind);
  if (error) return failure(city, error);
  const roads = { ...city.roads }, lots = { ...city.lots };
  for (const cell of changes) { roads[keyOf(cell)] = { ...cell, kind }; delete lots[keyOf(cell)]; }
  return { city: { ...city, roads, lots, treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

function planZones(city: City, cells: Cell[], kind: ZoneKind): ConstructionPlan {
  const unique = [...new Map(cells.map(cell => [keyOf(cell), cell])).values()];
  const changes = unique.filter(cell => isBuildable(cell) && !city.roads[keyOf(cell)] && !facilityAt(city, cell) && !city.lots[keyOf(cell)]?.building && city.lots[keyOf(cell)]?.kind !== kind);
  const cost = changes.length * ZONE_COST;
  const error = !changes.length ? 'Pinte um terreno livre. Edifícios existentes precisam ser demolidos para mudar de zona.' : cost > city.treasury ? 'Caixa insuficiente para zonear esta área.' : undefined;
  return { cells: unique, changes, cost, error };
}

export function zoneCells(city: City, cells: Cell[], kind: ZoneKind): BuildResult {
  const { changes, cost, error } = planZones(city, cells, kind);
  if (error) return failure(city, error);
  const lots = { ...city.lots };
  for (const cell of changes) lots[keyOf(cell)] = { ...cell, kind };
  return { city: { ...city, lots, treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

function planDemolition(city: City, cells: Cell[]): ConstructionPlan {
  const changes = [...new Map(cells.map(cell => [keyOf(cell), cell])).values()].filter(cell => city.roads[keyOf(cell)] || city.lots[keyOf(cell)] || facilityAt(city, cell));
  const removedFacilities = new Set(changes.map(cell => facilityAt(city, cell)?.[0]).filter((key): key is string => !!key));
  const cost = removedFacilities.size * DEMOLITION_COST + changes.reduce((sum, cell) => sum + (city.roads[keyOf(cell)] || city.lots[keyOf(cell)]?.building ? DEMOLITION_COST : 0), 0);
  const error = !changes.length ? 'Selecione uma via, um edifício ou uma zona para remover.' : cost > 0 && cost > city.treasury ? 'Caixa insuficiente para a demolição.' : undefined;
  return { cells, changes, cost, error };
}

export function demolishCells(city: City, cells: Cell[]): BuildResult {
  const { changes, cost, error } = planDemolition(city, cells);
  if (error) return failure(city, error);
  const removedFacilities = new Set(changes.map(cell => facilityAt(city, cell)?.[0]).filter((key): key is string => !!key));
  const roads = { ...city.roads }, lots = { ...city.lots };
  for (const cell of changes) { delete roads[keyOf(cell)]; delete lots[keyOf(cell)]; }
  const facilities = { ...city.facilities };
  for (const key of removedFacilities) delete facilities[key];
  return { city: { ...city, roads, lots, facilities, busLines: city.busLines.filter(line => facilities[line.from] && facilities[line.to]), treasury: city.treasury - cost, totalConstruction: city.totalConstruction + cost }, changed: changes.length, cost };
}

function planFacility(city: City, cell: Cell, kind: FacilityKind): ConstructionPlan {
  const spec = FACILITIES[kind];
  const cells = footprint(cell);
  const facility = { ...cell, kind };
  const error = !unlocked(city, spec.unlock) ? `Disponível a partir de ${Math.round(spec.unlock * city.milestoneScale)} habitantes no marco de população.`
    : cells.some(c => !isBuildable(c) || city.roads[keyOf(c)] || city.lots[keyOf(c)]?.building || facilityAt(city, c)) ? 'A instalação precisa de uma área livre de 2 × 2 lotes em terra firme.'
    : !facilityAccess(facility, city) ? 'Instale o serviço ao lado de uma rua para conectá-lo à cidade.'
    : city.treasury < spec.cost ? 'Caixa insuficiente para esta instalação.' : undefined;
  return { cells, changes: cells, cost: spec.cost, error };
}

export function buildFacility(city: City, cell: Cell, kind: FacilityKind): BuildResult {
  const spec = FACILITIES[kind], { cells, error } = planFacility(city, cell, kind);
  if (error) return failure(city, error);
  const facility = { ...cell, kind };
  const lots = { ...city.lots }; for (const c of cells) delete lots[keyOf(c)];
  return { city: { ...city, lots, facilities: { ...city.facilities, [keyOf(cell)]: facility }, treasury: city.treasury - spec.cost, totalConstruction: city.totalConstruction + spec.cost }, cost: spec.cost, changed: 1 };
}

/** The renderer, price label and committing action use the same construction rules. */
export function previewConstruction(city: City, tool: Tool, cell: Cell, options: { anchor: Cell | null; roadKind: RoadKind; facilityKind: FacilityKind; brush: number }): ConstructionPlan {
  if (tool === 'select') return { cells: [], changes: [], cost: 0 };
  if (tool === 'road') return planRoad(city, options.anchor ?? cell, cell, options.roadKind);
  if (tool === 'facility') return planFacility(city, cell, options.facilityKind);
  const cells = brushCells(cell, options.brush);
  return tool === 'bulldoze' ? planDemolition(city, cells) : planZones(city, cells, tool);
}

export function addBusLine(city: City, from: string, to: string): City {
  const a = city.facilities[from], b = city.facilities[to];
  if (!a || !b || a.kind !== 'bus' || b.kind !== 'bus' || from === to || !facilityAccess(a, city) || !facilityAccess(b, city) || facilityComponent(a, city) !== facilityComponent(b, city)) throw new Error('Escolha duas estações distintas conectadas pela mesma rede viária.');
  if (city.busLines.some(line => (line.from === from && line.to === to) || (line.from === to && line.to === from))) throw new Error('Estas estações já têm uma linha.');
  return { ...city, busLines: [...city.busLines, { id: `${from}:${to}`, from, to }] };
}
