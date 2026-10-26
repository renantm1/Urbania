import type { Cell, Road, RoadKind, City } from './types';

export const MAP_SIZE = 56;
export const CELL_SIZE = 8;
export const STARTING_FUNDS = 2_000_000;
export const ROAD_COST: Record<RoadKind, number> = { street: 1200, avenue: 2400 };
export const ZONE_COST = 120;
export const DEMOLITION_COST = 180;
export const keyOf = ({ x, z }: Cell) => `${x},${z}`;
export const toWorld = (n: number) => (n - (MAP_SIZE - 1) / 2) * CELL_SIZE;
export const toCell = (n: number) => Math.floor(n / CELL_SIZE + MAP_SIZE / 2);
export const inBounds = ({ x, z }: Cell) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < MAP_SIZE && z < MAP_SIZE;
export const riverCenter = (z: number) => 43 + Math.sin(z * 0.13) * 2.8 + Math.cos(z * 0.29) * 0.7;
export const riverWidth = (z: number) => 2.2 + 3.1 * Math.exp(-((z - 43) ** 2) / 48);
export const isWater = ({ x, z }: Cell) => Math.abs(x - riverCenter(z)) < riverWidth(z) + 0.5;
export const isBuildable = (cell: Cell) => inBounds(cell) && !isWater(cell);
export const neighbors = ({ x, z }: Cell): Cell[] => [{ x: x + 1, z }, { x: x - 1, z }, { x, z: z + 1 }, { x, z: z - 1 }];
export const hasRoadAccess = (cell: Cell, roads: Record<string, Road>) => neighbors(cell).some(n => !!roads[keyOf(n)]);
export const hash = (x: number, z: number, seed = 1) => {
  let n = Math.imul(x + 17, 374761393) + Math.imul(z + seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

// Roads snap to the dominant axis, so every segment has four-way navigable connections.
export function roadLine(start: Cell, end: Cell): Cell[] {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.z - start.z);
  const distance = horizontal ? end.x - start.x : end.z - start.z;
  return Array.from({ length: Math.min(Math.abs(distance), MAP_SIZE) + 1 }, (_, i) => ({
    x: start.x + (horizontal ? Math.sign(distance) * i : 0),
    z: start.z + (horizontal ? 0 : Math.sign(distance) * i),
  }));
}

export function brushCells(cell: Cell, size: number): Cell[] {
  const radius = Math.floor(size / 2);
  const cells: Cell[] = [];
  for (let x = cell.x - radius; x <= cell.x + radius; x++) {
    for (let z = cell.z - radius; z <= cell.z + radius; z++) cells.push({ x, z });
  }
  return cells;
}

export function createCity(name = 'Nova Aurora', seed = 42): City {
  return {
    version: 1, id: crypto.randomUUID(), name: name.trim().slice(0, 40) || 'Nova Aurora', seed,
    roads: {}, lots: {}, treasury: STARTING_FUNDS, day: 0, taxRate: 9, history: [], totalConstruction: 0,
  };
}

export function roadGraph(roads: City['roads']): Map<string, string[]> {
  return new Map(Object.values(roads).map(road => [keyOf(road), neighbors(road).map(keyOf).filter(key => !!roads[key])]));
}

// A* on the actual road cells; ready for the visual vehicle agents in Phase 2.
export function findRoadPath(roads: City['roads'], start: Cell, end: Cell): Cell[] {
  const startKey = keyOf(start), endKey = keyOf(end);
  if (!roads[startKey] || !roads[endKey]) return [];
  const open = new Set([startKey]);
  const cameFrom = new Map<string, string>();
  const score = new Map([[startKey, 0]]);
  const heuristic = (key: string) => Math.abs(roads[key].x - end.x) + Math.abs(roads[key].z - end.z);
  while (open.size) {
    let current = '';
    let lowest = Infinity;
    for (const key of open) {
      const value = (score.get(key) ?? Infinity) + heuristic(key);
      if (value < lowest) { lowest = value; current = key; }
    }
    if (current === endKey) {
      const path = [roads[current]];
      while (cameFrom.has(current)) { current = cameFrom.get(current)!; path.unshift(roads[current]); }
      return path.map(({ x, z }) => ({ x, z }));
    }
    open.delete(current);
    for (const next of neighbors(roads[current]).map(keyOf).filter(key => !!roads[key])) {
      const tentative = (score.get(current) ?? Infinity) + 1;
      if (tentative < (score.get(next) ?? Infinity)) {
        cameFrom.set(next, current); score.set(next, tentative); open.add(next);
      }
    }
  }
  return [];
}
