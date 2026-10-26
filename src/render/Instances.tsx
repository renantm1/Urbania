import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface Part {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: number;
}

const dummy = new THREE.Object3D();
const color = new THREE.Color();
export const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
export const coneGeometry = new THREE.ConeGeometry(1, 1, 8);
export const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
const roofVertices = [
  -.5,0,-.5, .5,0,-.5, .5,1,0, -.5,1,0,
  -.5,0,.5, .5,0,.5,
];
export const roofGeometry = new THREE.BufferGeometry();
roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3));
roofGeometry.setIndex([0,2,1, 0,3,2, 3,5,2, 3,4,5, 0,4,3, 1,2,5, 0,1,5, 0,5,4]);
roofGeometry.computeVertexNormals();

export function Instances({ parts, geometry = boxGeometry, opacity = 1, shadow = true, glow = false, lodDistance }: { parts: Part[]; geometry?: THREE.BufferGeometry; opacity?: number; shadow?: boolean; glow?: boolean; lodDistance?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const capacity = 2 ** Math.ceil(Math.log2(Math.max(1, parts.length)));
  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (mesh) mesh.visible = !lodDistance || !mesh.boundingSphere || camera.position.distanceTo(mesh.boundingSphere.center) - mesh.boundingSphere.radius < lodDistance;
  });
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.count = parts.length;
    parts.forEach((part, i) => {
      dummy.position.set(...part.position);
      dummy.scale.set(...part.scale);
      dummy.rotation.set(0, part.rotation ?? 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(part.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [parts, capacity]);
  if (!parts.length) return null;
  return <instancedMesh ref={ref} args={[geometry, undefined, capacity]} castShadow={shadow} receiveShadow raycast={() => {}}>
    <meshStandardMaterial roughness={.86} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} emissive={glow ? '#d9b15e' : '#000000'} emissiveIntensity={glow ? .45 : 0} />
  </instancedMesh>;
}
