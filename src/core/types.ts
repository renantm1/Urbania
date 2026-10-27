export type ZoneKind = 'residential' | 'commercial' | 'industrial' | 'mixed';
export type RoadKind = 'street' | 'avenue';
export type Tool = 'select' | 'road' | ZoneKind | 'bulldoze' | 'facility';
export type FacilityKind = 'power' | 'water' | 'waste' | 'school' | 'hospital' | 'police' | 'fire' | 'cityhall' | 'park' | 'bus';
export type PolicyKind = 'recycling' | 'cleanIndustry' | 'housing' | 'freeTransit';
export type Layer = 'none' | 'density' | 'value' | 'traffic' | 'pollution' | 'crime' | 'education' | 'health' | 'energy' | 'water';
export interface Facility extends Cell { kind: FacilityKind }
export interface BusLine { id: string; from: string; to: string }
export interface EventRecord { id: number; kind: 'investment' | 'flood' | 'housing' | 'energy' | 'recession'; choice?: number }
export interface Cell { x: number; z: number }
export interface Road extends Cell { kind: RoadKind }
export interface Building {
  variant: number;
  occupants: number;
  /** Mixed buildings keep residents and storefront workers separate. */
  workers?: number;
  age: number;
  level?: 1 | 2 | 3;
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
  version: 3;
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
  facilities: Record<string, Facility>;
  funding: Record<FacilityKind, number>;
  policies: Record<PolicyKind, boolean>;
  busLines: BusLine[];
  peakPopulation: number;
  milestoneScale: number;
  event: EventRecord | null;
  eventHistory: EventRecord[];
  modifiers: { investmentUntil: number; recessionUntil: number; floodUntil: number };
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
  costs: { roads: number; administration: number; sanitation: number; facilities: number; policies: number; transport: number };
  demand: Record<ZoneKind, number>;
  coverage: { energy: number; water: number; sewage: number; waste: number; education: number; health: number; safety: number; fire: number; parks: number; transit: number };
  utilities: Record<'energy' | 'water' | 'sewage' | 'waste', { capacity: number; demand: number }>;
  congestion: number;
  pollution: number;
  landValue: number;
  reachableJobs: number;
}
export interface BuildResult { city: City; error?: string; changed: number; cost: number }
export interface SaveSlot { slot: string; city: City; savedAt: string }
