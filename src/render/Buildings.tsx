import { useMemo } from 'react';
import { useGame } from '../state/store';
import { keyOf, toWorld } from '../core/world';
import { Instances, roofGeometry } from './Instances';
import type { Part } from './Instances';

export function Buildings() {
  const lots = useGame(s => s.city.lots);
  const roads = useGame(s => s.city.roads);
  // Occupancy and age change daily; architecture only changes when the built footprint changes.
  const signature = Object.values(lots).filter(lot => lot.building).map(lot => `${keyOf(lot)}:${lot.kind}:${lot.building!.variant}:${lot.building!.level ?? 1}`).join('|');
  const architecture = useMemo(() => {
    const boxes: Part[] = [], roofs: Part[] = [], windows: Part[] = [];
    for (const lot of Object.values(lots)) {
      if (!lot.building) continue;
      const variant = lot.building.variant;
      const level = lot.building.level ?? 1;
      const x = toWorld(lot.x), z = toWorld(lot.z);
      const angle = roads[keyOf({ x: lot.x, z: lot.z + 1 })] ? 0
        : roads[keyOf({ x: lot.x + 1, z: lot.z })] ? Math.PI / 2
        : roads[keyOf({ x: lot.x, z: lot.z - 1 })] ? Math.PI : -Math.PI / 2;
      const add = (dx: number, y: number, dz: number, sx: number, sy: number, sz: number, color: string) => (['#688c99', '#718e94', '#446c79', '#5f8691', '#536f78'].includes(color) ? windows : boxes).push({
        position: [x + dx * Math.cos(angle) + dz * Math.sin(angle), y + .18, z - dx * Math.sin(angle) + dz * Math.cos(angle)],
        scale: [sx, sy, sz], color, rotation: angle,
      });
      add(0, .04, 0, 7.8, .12, 7.8, lot.kind === 'industrial' ? '#b2b0a0' : '#79935b');
      add(0, .1, 3.5, 2, .12, 1, '#cfcdc0');
      if (level > 1 && lot.kind !== 'industrial') {
        const floors = level === 2 ? 3 : 7, height = floors * 2.8;
        add(0, height / 2, -.2, 6, height, 6, lot.kind === 'residential' ? '#d9d9cc' : '#b5c6ca');
        add(0, height + .2, -.2, 6.4, .4, 6.4, '#dedecd');
        add(1, height + .7, -.8, 1.6, .8, 1.6, '#7b8f8f');
        add(0, 1.2, 2.86, 1.2, 2.4, .14, '#536f78');
        for (let floor = 0; floor < floors; floor++) {
          for (const dx of [-2.1, -.7, .7, 2.1]) {
            add(dx, 1.6 + floor * 2.8, 2.86, .8, 1.4, .1, '#688c99');
            add(dx, 1.6 + floor * 2.8, -3.26, .8, 1.4, .1, '#688c99');
            add(-3.06, 1.6 + floor * 2.8, dx, .1, 1.4, .8, '#688c99');
            add(3.06, 1.6 + floor * 2.8, dx, .1, 1.4, .8, '#688c99');
          }
          add(0, 2.7 + floor * 2.8, 3, 6.5, .15, .65, '#e3ded1');
        }
        continue;
      }
      if (lot.kind === 'residential') {
        const height = variant > 5 ? 5.5 : 3.3;
        const wall = ['#e6dcc3', '#e4d7c5', '#c9d4cc', '#d9c2ae'][variant % 4];
        add(0, height / 2, -.4, 4.9, height, 4.8, wall);
        add(0, .25, -.4, 5.1, .4, 5, '#cac5b8');
        roofs.push({ position: [x - .4 * Math.sin(angle), height + .18, z - .4 * Math.cos(angle)], scale: [5.65, 1.8, 5.5], color: ['#8f5f4e', '#655b53', '#ac7958', '#536975'][variant % 4], rotation: angle });
        add(1.5, height + 1.1, -.5, .6, 1.8, .65, '#a18e7e');
        add(0, .95, 2.03, .85, 1.9, .1, '#5a665d');
        add(0, 2.1, 2.45, 1.6, .15, 1.05, '#f0e8d7');
        add(-.7, 1, 2.8, .12, 2, .12, '#dbd5bf');
        add(.7, 1, 2.8, .12, 2, .12, '#dbd5bf');
        for (let floor = 0; floor < (height > 4 ? 2 : 1); floor++) {
          for (const side of [-1, 1]) {
            add(side * 1.55, 1.65 + floor * 2.6, 2.03, 1.05, 1.2, .11, '#688c99');
            add(side * 1.55, 1.65 + floor * 2.6, 2.1, .06, 1.2, .04, '#eee5cd');
            add(side * 1.55, 1.65 + floor * 2.6, -2.83, 1.1, 1.15, .1, '#718e94');
            add(side * 2.48, 1.65 + floor * 2.6, -.4, .1, 1.15, 1.25, '#718e94');
          }
        }
        add(-3.25, .45, -.3, .4, .9, 5.6, '#4e7248');
        add(3.25, .45, -.3, .4, .9, 5.6, '#4e7248');
        add(2.2, .2, 3, 1.3, .2, 1.2, '#bcbba9');
      } else if (lot.kind === 'commercial') {
        const height = variant % 3 === 0 ? 6.8 : 4.2;
        add(0, height / 2, -.4, 6.4, height, 5.6, ['#d6cfba', '#e0d7c9', '#b4c2c0'][variant % 3]);
        add(0, height + .12, -.4, 6.8, .35, 6, '#e2dfcf');
        add(0, height + .55, -1, 1.5, .7, 1.4, '#8a9690');
        add(0, 1.5, 2.43, 5.8, 2.5, .12, '#446c79');
        for (const dx of [-2, 0, 2]) add(dx, 1.5, 2.52, .12, 2.5, .12, '#d1d2bf');
        add(0, 3.1, 2.8, 6.8, .25, 1.3, ['#588b7b', '#b2784f', '#607d9d'][variant % 3]);
        add(0, 3.6, 2.5, 3.8, .55, .14, '#e8dcb2');
        if (height > 5) for (const dx of [-2, -.7, .7, 2]) add(dx, 5.3, 2.43, .85, 1.5, .12, '#5f8691');
        add(-2.7, .45, 3.25, .6, .8, .6, '#7b9a61');
        add(2.7, .45, 3.25, .6, .8, .6, '#7b9a61');
      } else {
        const h = 4.2 + (level - 1) * 2;
        add(0, h / 2, -.4, 6.5, h, 5.4, ['#aeb9b9', '#b4afa0', '#bac1b0'][variant % 3]);
        roofs.push({ position: [x - .4 * Math.sin(angle), h + .15, z - .4 * Math.cos(angle)], scale: [6.8, 1, 5.8], color: '#607177', rotation: angle });
        add(.9, 1.4, 2.34, 3.1, 2.8, .15, '#68797c');
        for (let i = 0; i < 5; i++) add(.9, .5 + i * .45, 2.44, 3, .05, .04, '#a3b0b0');
        add(-2, 1, 2.34, .75, 2, .12, '#4d6971');
        add(-2.1, 4.8, -1.7, .7, 4.4, .75, '#aa9a89');
        add(-2.1, 7, -1.7, .85, .25, .9, '#767c74');
        for (const side of [-1, 1]) add(side * 3.3, 2.8, -.4, .15, 1, 3, '#536f78');
        add(2.5, .5, 3.1, 1.25, 1, 1, '#a99a76');
        add(-.7, .3, 3.1, 1, .6, 1, '#b8a788');
      }
    }
    return { boxes, roofs, windows };
    // Geometry deliberately excludes simulation-only occupancy and age updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, roads]);
  return <><Instances parts={architecture.boxes} /><Instances parts={architecture.roofs} geometry={roofGeometry} /><Instances parts={architecture.windows} glow lodDistance={220} /></>;
}
