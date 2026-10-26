import { useMemo } from 'react';
import * as THREE from 'three';
import { useGame } from '../state/store';
import { FACILITIES } from '../core/services';
import { toWorld } from '../core/world';
import { Instances, crownGeometry, roofGeometry } from './Instances';
import type { Part } from './Instances';

const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 16);
export function Facilities() {
  const facilities = useGame(s => s.city.facilities);
  const parts = useMemo(() => {
    const boxes: Part[] = [], tanks: Part[] = [], trees: Part[] = [], roofs: Part[] = [], windows: Part[] = [];
    for (const f of Object.values(facilities)) {
      const x = toWorld(f.x) + 4, z = toWorld(f.z) + 4, color = FACILITIES[f.kind].color;
      const add = (dx: number, y: number, dz: number, sx: number, sy: number, sz: number, color: string, target = boxes) => target.push({ position: [x + dx, y + .2, z + dz], scale: [sx, sy, sz], color });
      add(0, 0, 0, 15.8, .2, 15.8, f.kind === 'park' ? '#759c63' : '#bfc3b5');
      add(0, .14, 6.6, 5, .12, 2.5, '#dcdac3');
      if (f.kind === 'park') {
        add(0, .2, 0, 2, .2, 15, '#d0c7a6'); add(0, .2, 0, 15, .2, 2, '#d0c7a6');
        add(0, .55, 0, 4, .8, 4, '#b1bbad', tanks); add(0, 1, 0, 3.2, .2, 3.2, '#80b3bd', tanks);
        for (const dx of [-5, 5]) for (const dz of [-4.5, 4.5]) { add(dx, 1.5, dz, .4, 3, .4, '#6f6950'); add(dx, 3.6, dz, 2.1, 2.5, 2.2, '#618a59', trees); }
        add(-4, .75, 1.8, 2.7, .25, .8, '#8e8060'); add(4, .75, -1.8, 2.7, .25, .8, '#8e8060');
      } else if (f.kind === 'power') {
        add(-3.8, 2.3, -1.5, 5, 4.6, 6, '#b1b8b1');
        for (const dx of [1, 5]) { add(dx, 1.6, -1, 2.2, 3.2, 4.5, '#6b8184'); for (const dz of [-2, 0, 2]) add(dx, 4, dz - 1, .6, 2.5, .6, '#a7b7aa', tanks); }
        add(0, 5.8, -5, 13, .3, .3, '#667a77'); add(-6.4, 3, -5, .3, 6, .3, '#667a77'); add(6.4, 3, -5, .3, 6, .3, '#667a77');
      } else if (f.kind === 'water') {
        add(-3.5, 2.2, -1.5, 6.5, 4.4, 7.5, color); add(-3.5, 4.5, -1.5, 7, .3, 8, '#dce3d7');
        for (const dz of [-3, 3]) { add(4, 1.7, dz, 5.2, 3.4, 5.2, '#aebfbe', tanks); add(4, 3.5, dz, 4.6, .2, 4.6, '#76a9b8', tanks); }
        add(-3.5, 2, 2.35, 4.5, 1.8, .1, '#6b929e', windows);
      } else if (f.kind === 'bus') {
        add(-4, 1.6, -2, 5, 3.2, 7, '#a2c1b5');
        add(2.8, 3.5, 1, 7, .35, 11, '#b5c7bf'); for (const dz of [-3, 4]) add(5.8, 1.7, dz, .15, 3.4, .15, '#778f84');
        for (const dz of [-3, 0, 3]) add(2, .18, dz, 4.5, .05, .15, '#e8dfb4');
        add(-4, 1.7, 1.6, 3.8, 2, .1, '#6b929e', windows); add(-5.8, 4.7, 5, .15, 5, .15, '#607c72'); add(-5.8, 7, 5, 1.7, 1.7, .25, '#a8cab8');
      } else {
        const h = f.kind === 'hospital' ? 8 : f.kind === 'cityhall' ? 7 : 5;
        add(0, h / 2, -1.3, 12, h, 9, color); add(0, h + .2, -1.3, 12.7, .4, 9.8, '#e1e2d1');
        if (f.kind === 'school') roofs.push({ position: [x, h + .3, z - 1.3], scale: [13, 2.2, 10], color: '#9c705b' });
        for (let level = 0; level < Math.floor(h / 2.5); level++) for (const dx of [-4.6, -2.3, 2.3, 4.6]) add(dx, 1.7 + level * 2.5, 3.25, 1.4, 1.5, .12, '#688b99', windows);
        add(0, 1.3, 3.3, 1.7, 2.6, .15, '#536e76', windows); add(0, 3.1, 4.5, 4.5, .3, 2.5, '#d9dbca');
        if (f.kind === 'hospital') { add(0, 6.2, 3.35, 2.6, .65, .2, '#ba776c'); add(0, 6.2, 3.4, .65, 2.6, .2, '#ba776c'); }
        if (f.kind === 'cityhall') { for (const dx of [-4.6, -2.3, 2.3, 4.6]) add(dx, 2.5, 4.8, .55, 5, .55, '#e2decb'); add(0, 9.5, -2, 2.5, 5, 2.5, '#b4baac'); }
        if (f.kind === 'fire') for (const dx of [-3.5, 3.5]) add(dx, 1.5, 3.4, 3, 3, .15, '#a1685e');
        if (f.kind === 'police') add(0, h + 1, -1, .15, 2, .15, '#687f84');
        if (f.kind === 'waste') for (const dx of [-4, 0, 4]) add(dx, .8, 5.5, 2.4, 1.6, 1.8, '#738c63');
      }
      // Municipal sign on every public facility; color is shared with its management card.
      add(-6.6, 1.2, 6, .15, 2.4, .15, '#60776d'); add(-6.6, 2.2, 6, 1.7, .8, .2, color);
    }
    return { boxes, tanks, trees, roofs, windows };
  }, [facilities]);
  return <><Instances parts={parts.boxes} /><Instances parts={parts.tanks} geometry={cylinder} /><Instances parts={parts.trees} geometry={crownGeometry} /><Instances parts={parts.roofs} geometry={roofGeometry} /><Instances parts={parts.windows} glow lodDistance={220} /></>;
}
