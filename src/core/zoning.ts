import type { Lot, ZoneKind } from './types';

export const ZONES: Record<ZoneKind, { name: string; color: string }> = {
  residential: { name: 'Residencial', color: '#75b88a' },
  commercial: { name: 'Comercial', color: '#6da8cc' },
  industrial: { name: 'Industrial', color: '#dab465' },
  mixed: { name: 'Mista', color: '#b59bd1' },
};
const multiplier = (lot: Lot) => [1, 3, 6][(lot.building?.level ?? 1) - 1];
export const hasHomes = (lot: Lot) => lot.kind === 'residential' || lot.kind === 'mixed';
export const hasCommerce = (lot: Lot) => lot.kind === 'commercial' || lot.kind === 'mixed';
export const residentialCapacity = (lot: Lot) => !hasHomes(lot) ? 0 : (lot.kind === 'mixed' ? 8 : 6 + (lot.building?.variant ?? 0) % 3 * 2) * multiplier(lot);
export const workplaceCapacity = (lot: Lot) => (lot.kind === 'residential' ? 0 : lot.kind === 'mixed' ? 4 : lot.kind === 'commercial' ? 8 : 16) * multiplier(lot);
/** Primary occupancy: residents for homes/mixed, workers for businesses. */
export const capacityOf = (lot: Lot) => hasHomes(lot) ? residentialCapacity(lot) : workplaceCapacity(lot);
export const serviceUnits = (lot: Lot) => hasHomes(lot) ? Math.max(2, lot.building?.occupants ?? 0) + workplaceCapacity(lot) : workplaceCapacity(lot);
export const buildingHeight = (lot: Lot) => {
  const level = lot.building?.level ?? 1;
  if (lot.kind === 'mixed') return 3.2 + [2, 4, 8][level - 1] * 2.8 + .8;
  if (level > 1 && lot.kind !== 'industrial') return level === 2 ? 8.8 : 20.8;
  return lot.kind === 'industrial' ? 7.4 + (level - 1) * 2 : lot.kind === 'commercial' ? (lot.building!.variant % 3 === 0 ? 7.2 : 4.6) : (lot.building!.variant > 5 ? 7.3 : 5.1);
};
