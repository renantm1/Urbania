export type ZoneKind = 'residential' | 'commercial' | 'industrial';
export type RoadKind = 'street' | 'avenue';
export type Tool = 'select' | 'road' | ZoneKind | 'bulldoze';
export interface Cell { x: number; z: number }
export interface Road extends Cell { kind: RoadKind }
export interface Building {
  variant: number;
  occupants: number;
  age: number;
}
export interface Lot extends Cell { kind: ZoneKind; building?: Building }
export interface MonthRecord {
  month: number;
  income: number;
  expenses: number;
  population: number;
  balance: number;
}
export interface City {
  version: 1;
  id: string;
  name: string;
  seed: number;
  roads: Record<string, Road>;
  lots: Record<string, Lot>;
  treasury: number;
  day: number;
  taxRate: number;
  history: MonthRecord[];
  totalConstruction: number;
}
export interface Metrics {
  population: number;
  households: number;
  capacity: number;
  jobs: number;
  workers: number;
  employed: number;
  unemployment: number;
  satisfaction: number;
  buildings: number;
  roadLength: number;
  income: number;
  expenses: number;
  balance: number;
  taxes: { residential: number; commercial: number; industrial: number; grants: number };
  costs: { roads: number; administration: number; sanitation: number };
  demand: Record<ZoneKind, number>;
}
export interface BuildResult { city: City; error?: string; changed: number; cost: number }
export interface SaveSlot { slot: string; city: City; savedAt: string }
