import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../state/store';
import { planTraffic, trafficEngine } from '../core/traffic';
import { toWorld } from '../core/world';
import { boxGeometry, crownGeometry } from './Instances';

const object = new THREE.Object3D(), color = new THREE.Color();
const shirts = ['#a9bcb0', '#ba8f76', '#7696ab', '#d3c7a8'];
/** A bounded visual sample of real home-to-work paths, without per-citizen simulation. */
export function Pedestrians() {
  const city = useGame(s => s.city);
  const trips = useMemo(() => planTraffic(city).trips.filter(t => t.kind === 'car').slice(0, 24), [city]);
  const bodies = useRef<THREE.InstancedMesh>(null), heads = useRef<THREE.InstancedMesh>(null), legs = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    trips.forEach((trip, i) => {
      const phase = (trafficEngine.clock * .16 + i * 1.3) % (trip.path.length - 1), index = Math.floor(phase), t = phase - index;
      const a = trip.path[index], b = trip.path[index + 1], dx = b.x - a.x, dz = b.z - a.z, angle = Math.atan2(dx, dz);
      const x = toWorld(a.x + dx * t) - dz * 3.35, z = toWorld(a.z + dz * t) + dx * 3.35;
      const paint = (mesh: THREE.InstancedMesh | null, id: number, px: number, y: number, pz: number, sx: number, sy: number, sz: number, shade: string) => {
        if (!mesh) return; object.position.set(px, y, pz); object.rotation.set(0, angle, 0); object.scale.set(sx, sy, sz); object.updateMatrix(); mesh.setMatrixAt(id, object.matrix); mesh.setColorAt(id, color.set(shade));
      };
      paint(bodies.current, i, x, 1.15, z, .5, .7, .32, shirts[i % shirts.length]);
      paint(heads.current, i, x, 1.7, z, .22, .25, .22, ['#cfac8e', '#997b64', '#b89072'][i % 3]);
      for (const side of [-1, 1]) {
        const step = Math.sin(trafficEngine.clock * 5 + i) * .14 * side;
        paint(legs.current, i * 2 + (side === 1 ? 1 : 0), x + Math.cos(angle) * side * .13 + Math.sin(angle) * step, .58, z - Math.sin(angle) * side * .13 + Math.cos(angle) * step, .16, .55, .18, '#4b5a5d');
      }
    });
    for (const mesh of [bodies.current, heads.current, legs.current]) if (mesh) {
      mesh.count = mesh === legs.current ? trips.length * 2 : trips.length; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });
  return <><instancedMesh ref={bodies} args={[boxGeometry, undefined, 24]} frustumCulled={false} castShadow raycast={() => {}}><meshStandardMaterial roughness={1} /></instancedMesh><instancedMesh ref={heads} args={[crownGeometry, undefined, 24]} frustumCulled={false} raycast={() => {}}><meshStandardMaterial roughness={1} /></instancedMesh><instancedMesh ref={legs} args={[boxGeometry, undefined, 48]} frustumCulled={false} castShadow raycast={() => {}}><meshStandardMaterial roughness={1} /></instancedMesh></>;
}
