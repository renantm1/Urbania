import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { trafficEngine, VEHICLE_LIMIT } from '../core/traffic';
import { useGame } from '../state/store';
import { boxGeometry } from './Instances';
import { neighbors, keyOf, toWorld } from '../core/world';

const dummy = new THREE.Object3D(), tint = new THREE.Color();
const carColors = ['#c5d3c7', '#a7bdc9', '#d5c6a8', '#b57765', '#617c91', '#d8d5c9'];
export function Traffic() {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const positions = useRef(Array.from({ length: VEHICLE_LIMIT }, () => ({ x: 0, z: 0, angle: 0, generation: -1 })));
  useFrame((_, dt) => {
    let body = 0, wheel = 0, light = 0;
    const paint = (batch: number, index: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, angle: number, color: string) => {
      const mesh = meshes.current[batch]; if (!mesh) return;
      dummy.position.set(x, y, z); dummy.rotation.set(0, angle, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index, tint.set(color));
    };
    for (let i = 0; i < trafficEngine.vehicles.length; i++) {
      const v = trafficEngine.vehicles[i]; if (!v.active) continue;
      const p = positions.current[i], alpha = useGame.getState().speed ? 1 - Math.exp(-18 * dt) : 1;
      if (p.generation !== v.generation) { p.x = v.x; p.z = v.z; p.angle = v.angle; p.generation = v.generation; }
      p.x += (v.x - p.x) * alpha; p.z += (v.z - p.z) * alpha;
      p.angle += Math.atan2(Math.sin(v.angle - p.angle), Math.cos(v.angle - p.angle)) * alpha;
      const length = v.kind === 'bus' ? 5.3 : v.kind === 'truck' ? 4.4 : 3;
      const width = v.kind === 'bus' || v.kind === 'truck' ? 1.75 : 1.35;
      const color = v.kind === 'bus' ? '#82bcb1' : v.kind === 'truck' ? '#c4b791' : v.kind === 'service' ? '#d5dacf' : carColors[i % carColors.length];
      const transform = (dx: number, dz: number): [number, number] => [p.x + dx * Math.cos(p.angle) + dz * Math.sin(p.angle), p.z - dx * Math.sin(p.angle) + dz * Math.cos(p.angle)];
      paint(0, body, p.x, .92, p.z, width, .8, length, p.angle, color);
      paint(1, body, p.x - .2 * Math.sin(p.angle), 1.62, p.z - .2 * Math.cos(p.angle), width * .86, v.kind === 'bus' ? 1.1 : .55, length * .6, p.angle, '#62818a');
      if (v.kind === 'service') { const [x, z] = transform(0, 0); paint(4, body, x, 2.05, z, .9, .18, .25, v.angle, '#bb7767'); }
      else paint(4, body, p.x, 1.98, p.z, .001, .001, .001, p.angle, color);
      for (const dx of [-width * .5, width * .5]) for (const dz of [-length * .3, length * .3]) {
        const [x, z] = transform(dx, dz); paint(2, wheel++, x, .57, z, .24, .45, .55, v.angle, '#364348');
      }
      for (const dx of [-width * .32, width * .32]) {
        const [x, z] = transform(dx, length * .51); paint(3, light++, x, .92, z, .28, .18, .12, v.angle, '#e9deb3');
      }
      body++;
    }
    meshes.current.forEach((mesh, index) => {
      if (!mesh) return; mesh.count = index === 2 ? wheel : index === 3 ? light : body;
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });
  return <>{[VEHICLE_LIMIT, VEHICLE_LIMIT, VEHICLE_LIMIT * 4, VEHICLE_LIMIT * 2, VEHICLE_LIMIT].map((count, i) => <instancedMesh key={i} ref={ref => { meshes.current[i] = ref; }} args={[boxGeometry, undefined, count]} frustumCulled={false} castShadow={i < 2} raycast={() => {}}><meshStandardMaterial roughness={.65} emissive={i >= 3 ? '#b0a478' : '#000000'} emissiveIntensity={i >= 3 ? .7 : 0} /></instancedMesh>)}</>;
}

export function Signals() {
  const roads = useGame(s => s.city.roads);
  const ref = useRef<THREE.InstancedMesh>(null);
  const junctions = useMemo(() => Object.values(roads).filter(r => neighbors(r).filter(n => roads[keyOf(n)]).length >= 3), [roads]);
  const phase = useRef(-1);
  useLayoutEffect(() => {
    if (!ref.current) return;
    junctions.forEach((r, i) => {
      for (let axis = 0; axis < 2; axis++) {
        dummy.position.set(toWorld(r.x) + (axis ? -3.2 : 3.2), 3.1, toWorld(r.z) + 3.2); dummy.rotation.set(0, 0, 0); dummy.scale.set(.45, .65, .45); dummy.updateMatrix();
        ref.current!.setMatrixAt(i * 2 + axis, dummy.matrix);
      }
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
    phase.current = -1;
  }, [junctions]);
  useFrame(() => {
    const nextPhase = Math.floor(trafficEngine.clock / 5) % 2;
    if (!ref.current || nextPhase === phase.current) return;
    junctions.forEach((_, i) => {
      for (let axis = 0; axis < 2; axis++) ref.current!.setColorAt(i * 2 + axis, tint.set(nextPhase === axis ? '#83b28b' : '#c77d67'));
    });
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    phase.current = nextPhase;
  });
  if (!junctions.length) return null;
  return <instancedMesh ref={ref} args={[boxGeometry, undefined, junctions.length * 2]} raycast={() => {}}><meshStandardMaterial emissive="#b1a585" emissiveIntensity={.35} /></instancedMesh>;
}
