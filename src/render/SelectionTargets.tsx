import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../state/store';
import { toWorld } from '../core/world';
import { boxGeometry } from './Instances';

const object = new THREE.Object3D();
/** Selection uses the visible building volume, not its projection onto the ground. */
export function SelectionTargets() {
  const lots = useGame(s => s.city.lots), facilities = useGame(s => s.city.facilities);
  const enabled = useGame(s => s.tool === 'select' && s.started && !s.modal);
  const ref = useRef<THREE.InstancedMesh>(null);
  const targets = useMemo(() => [
    ...Object.values(lots).filter(l => l.building).map(l => {
      const level = l.building!.level ?? 1;
      const height = level > 1 && l.kind !== 'industrial' ? (level === 2 ? 8.8 : 20) : l.kind === 'industrial' ? 5.4 + (level - 1) * 2 : l.kind === 'commercial' ? (l.building!.variant % 3 === 0 ? 7.2 : 4.6) : (l.building!.variant > 5 ? 7.3 : 5.1);
      return { cell: { x: l.x, z: l.z }, x: toWorld(l.x), z: toWorld(l.z), width: 6.7, height };
    }),
    ...Object.values(facilities).map(f => ({ cell: { x: f.x, z: f.z }, x: toWorld(f.x) + 4, z: toWorld(f.z) + 4, width: 15.7, height: f.kind === 'cityhall' ? 12 : f.kind === 'hospital' ? 8.5 : 7 })),
  ], [lots, facilities]);
  const capacity = 2 ** Math.ceil(Math.log2(Math.max(1, targets.length)));
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.count = targets.length;
    targets.forEach((t, i) => { object.position.set(t.x, t.height / 2 + .2, t.z); object.scale.set(t.width, t.height, t.width); object.updateMatrix(); ref.current!.setMatrixAt(i, object.matrix); });
    ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere();
  }, [targets, capacity, enabled]);
  if (!enabled || !targets.length) return null;
  return <instancedMesh ref={ref} args={[boxGeometry, undefined, capacity]} onPointerDown={e => {
    if (e.button !== 0 || e.instanceId === undefined) return;
    const target = targets[e.instanceId]; if (!target) return;
    e.stopPropagation(); useGame.getState().interact(target.cell);
  }}><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></instancedMesh>;
}
