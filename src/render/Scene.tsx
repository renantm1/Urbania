import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Grid, Line, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useGame } from '../state/store';
import { CELL_SIZE, MAP_SIZE, ROAD_COST, ZONE_COST, brushCells, hash, inBounds, isBuildable, isWater, keyOf, riverCenter, riverWidth, roadLine, toCell, toWorld } from '../core/world';
import { Instances, coneGeometry, crownGeometry } from './Instances';
import type { Part } from './Instances';
import { Buildings } from './Buildings';

export const ZONE_COLORS = { residential: '#75b88a', commercial: '#6da8cc', industrial: '#dab465' };

function CameraRig() {
  const ref = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const keys = useRef(new Set<string>());
  const reset = useGame(s => s.cameraReset);
  const motion = useRef(new THREE.Vector3());
  const forward = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    camera.position.set(190, 240, 285);
    ref.current?.target.set(-26, 0, -6);
    ref.current?.update();
  }, [camera, reset]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (!(e.target instanceof HTMLElement) || (!e.target.closest('input, textarea, select, [contenteditable]') && !useGame.getState().modal)) keys.current.add(e.code); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);
  useFrame((_, dt) => {
    const controls = ref.current;
    if (!controls) return;
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    side.crossVectors(forward, camera.up).normalize();
    const desired = new THREE.Vector3();
    const active = useGame.getState().started && !useGame.getState().modal;
    if (active) {
      if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) desired.add(forward);
      if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) desired.sub(forward);
      if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) desired.add(side);
      if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) desired.sub(side);
    }
    desired.normalize().multiplyScalar(Math.max(35, camera.position.distanceTo(controls.target) * .42));
    motion.current.lerp(desired, 1 - Math.exp(-8 * dt));
    const move = motion.current.clone().multiplyScalar(Math.min(dt, .05));
    controls.target.add(move); camera.position.add(move);
    const x = THREE.MathUtils.clamp(controls.target.x, -240, 240);
    const z = THREE.MathUtils.clamp(controls.target.z, -240, 240);
    camera.position.x += x - controls.target.x; camera.position.z += z - controls.target.z;
    controls.target.set(x, 0, z);
    camera.position.y = Math.max(8, camera.position.y);
  });
  return <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={.08} minDistance={18} maxDistance={680}
    minPolarAngle={.16} maxPolarAngle={Math.PI / 2.35} zoomSpeed={.75} rotateSpeed={.5} panSpeed={.7}
    mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }} />;
}

function Landscape() {
  const roads = useGame(s => s.city.roads), lots = useGame(s => s.city.lots);
  const occupiedFootprint = Object.keys(lots).join('|');
  const { terrain, water, bank } = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(1100, 1100, 200, 200);
    terrain.rotateX(-Math.PI / 2);
    const pos = terrain.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const cx = x / CELL_SIZE + (MAP_SIZE - 1) / 2, cz = z / CELL_SIZE + (MAP_SIZE - 1) / 2;
      const distance = Math.abs(cx - riverCenter(cz)) - riverWidth(cz);
      let y = -.12 + Math.sin(x * .018) * Math.sin(z * .023) * .1;
      if (distance < .9) y = THREE.MathUtils.lerp(-2.6, y, THREE.MathUtils.smoothstep(distance, -.5, .9));
      const edge = Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - 225);
      y += Math.min(60, edge * .15) * (.4 + .6 * Math.sin(x * .008 + 1) ** 2);
      pos.setY(i, y);
      const c = new THREE.Color(distance < 1 ? '#a8ad7d' : '#819765');
      c.multiplyScalar(.94 + hash(Math.floor(x / 12), Math.floor(z / 12), 3) * .12);
      colors.push(c.r, c.g, c.b);
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    const ribbon = (extra: number, height: number) => {
      const verts: number[] = [], indices: number[] = [];
      for (let i = 0; i <= 180; i++) {
        const z = -35 + i * .7;
        for (const sign of [-1, 1]) verts.push(toWorld(riverCenter(z) + sign * (riverWidth(z) + extra)), height, toWorld(z));
        if (i < 180) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      return geometry;
    };
    return { terrain, water: ribbon(.18, -.12), bank: ribbon(.5, -.24) };
  }, []);
  const treeParts = useMemo(() => {
    const trunks: Part[] = [], crowns: Part[] = [], pines: Part[] = [], rocks: Part[] = [];
    for (let i = 0; i < 900; i++) {
      const x = hash(i, 19, 88) * 72 - 8, z = hash(i, 40, 14) * 72 - 8;
      const cell = { x: Math.round(x), z: Math.round(z) };
      if (isWater({ x, z }) || Math.abs(x - riverCenter(z)) < riverWidth(z) + 1 || roads[keyOf(cell)] || lots[keyOf(cell)]) continue;
      if (x > 12 && x < 38 && z > 10 && z < 44 && hash(i, 5) > .12) continue;
      const wx = toWorld(x), wz = toWorld(z), size = 2 + hash(i, 61) * 2.5;
      const edge = Math.max(0, Math.max(Math.abs(wx), Math.abs(wz)) - 225);
      const y = Math.min(60, edge * .15) * (.4 + .6 * Math.sin(wx * .008 + 1) ** 2);
      trunks.push({ position: [wx, y + size * .65, wz], scale: [.4, size * 1.3, .4], color: '#746b4d' });
      if (i % 3 === 0) {
        for (let j = 0; j < 2; j++) pines.push({ position: [wx, y + size * (1.2 + j * .45), wz], scale: [size * (.7 - j * .17), size * 1.4, size * (.7 - j * .17)], color: j ? '#557d59' : '#486e50' });
      } else crowns.push({ position: [wx, y + size * 1.35, wz], scale: [size * .8, size, size * .85], color: ['#608752', '#74955d', '#527952', '#8b9e65'][i % 4] });
      if (i % 13 === 0) rocks.push({ position: [wx + 4, y + .55, wz + 2], scale: [1.4, .8, 1.1], color: '#a0a18d', rotation: i });
    }
    return { trunks, crowns, pines, rocks };
  }, [roads, occupiedFootprint]);
  return <>
    <mesh geometry={terrain} receiveShadow raycast={() => {}}><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <mesh geometry={bank} raycast={() => {}}><meshStandardMaterial color="#b6b38c" roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={water} raycast={() => {}}><meshStandardMaterial color="#699fa3" roughness={.26} metalness={.18} side={THREE.DoubleSide} /></mesh>
    <Instances parts={treeParts.trunks} /><Instances parts={treeParts.crowns} geometry={crownGeometry} /><Instances parts={treeParts.pines} geometry={coneGeometry} /><Instances parts={treeParts.rocks} geometry={crownGeometry} />
  </>;
}

function Roads() {
  const roads = useGame(s => s.city.roads);
  const parts = useMemo(() => {
    const parts: Part[] = [];
    const add = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string) => parts.push({ position: [x, y, z], scale: [sx, sy, sz], color });
    for (const road of Object.values(roads)) {
      const x = toWorld(road.x), z = toWorld(road.z);
      const h = !!roads[keyOf({ x: road.x - 1, z: road.z })] || !!roads[keyOf({ x: road.x + 1, z: road.z })];
      const v = !!roads[keyOf({ x: road.x, z: road.z - 1 })] || !!roads[keyOf({ x: road.x, z: road.z + 1 })];
      const width = road.kind === 'avenue' ? 6.4 : 5.2;
      add(x, .08, z, 8, .2, 8, '#b8b9a9');
      if (h || !v) add(x, .2, z, 8, .12, width, '#596267');
      if (v) add(x, .21, z, width, .12, 8, '#596267');
      if (!(h && v)) {
        for (const d of [-2.5, 2.5]) {
          if (v) add(x, .29, z + d, .12, .02, 2.4, '#d3cfad');
          else add(x + d, .29, z, 2.4, .02, .12, '#d3cfad');
        }
        if (road.kind === 'avenue') for (const offset of [-1.65, 1.65]) {
          if (v) add(x + offset, .29, z, .08, .02, 2.6, '#bfc7c5');
          else add(x, .29, z + offset, 2.6, .02, .08, '#bfc7c5');
        }
      } else {
        for (const d of [-1.4, -.7, 0, .7, 1.4]) {
          add(x + d, .29, z + 3.1, .35, .02, .8, '#d8d9cc');
          add(x + 3.1, .29, z + d, .8, .02, .35, '#d8d9cc');
        }
      }
      if ((road.x + road.z) % 5 === 0) {
        add(x + 3.55, 2.9, z + 3.55, .12, 5.6, .12, '#53615e');
        add(x + 3.2, 5.65, z + 3.55, .8, .16, .35, '#e1dcc2');
      }
    }
    return parts;
  }, [roads]);
  return <Instances parts={parts} />;
}

function Lots() {
  const lots = useGame(s => s.city.lots);
  const tool = useGame(s => s.tool);
  const parts = useMemo(() => Object.values(lots).filter(lot => !lot.building || tool !== 'select').map(lot => ({
    position: [toWorld(lot.x), .25, toWorld(lot.z)] as [number, number, number], scale: [7.5, .08, 7.5] as [number, number, number], color: ZONE_COLORS[lot.kind],
  })), [lots, tool]);
  return <Instances parts={parts} opacity={.48} shadow={false} />;
}

function BuildSurface() {
  const tool = useGame(s => s.tool), anchor = useGame(s => s.anchor), hover = useGame(s => s.hover), brush = useGame(s => s.brush), selected = useGame(s => s.selected);
  const city = useGame(s => s.city), roadKind = useGame(s => s.roadKind), started = useGame(s => s.started), modal = useGame(s => s.modal);
  const painting = useRef(false);
  const lastPaint = useRef('');
  useEffect(() => {
    const release = () => { painting.current = false; lastPaint.current = ''; };
    window.addEventListener('pointerup', release); window.addEventListener('blur', release);
    return () => { window.removeEventListener('pointerup', release); window.removeEventListener('blur', release); };
  }, []);
  const cellOf = (e: ThreeEvent<PointerEvent>) => ({ x: toCell(e.point.x), z: toCell(e.point.z) });
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!started || modal) return;
    const cell = cellOf(e);
    useGame.getState().setHover(inBounds(cell) ? cell : null);
    if (painting.current && e.buttons === 1 && tool !== 'road' && tool !== 'select' && lastPaint.current !== keyOf(cell)) {
      useGame.getState().interact(cell, true); lastPaint.current = keyOf(cell);
    }
  };
  const preview = useMemo(() => {
    if (!hover || !started || modal || tool === 'select') return { parts: [], valid: true };
    const cells = tool === 'road' ? (anchor ? roadLine(anchor, hover) : [hover]) : brushCells(hover, brush);
    const cost = tool === 'road' ? cells.filter(cell => city.roads[keyOf(cell)]?.kind !== roadKind).length * ROAD_COST[roadKind] : cells.length * ZONE_COST;
    const valid = tool === 'bulldoze' || (cost <= city.treasury && cells.every(cell => isBuildable(cell) && (tool === 'road' ? !city.lots[keyOf(cell)]?.building : !city.roads[keyOf(cell)] && !city.lots[keyOf(cell)]?.building)));
    const color = !valid || tool === 'bulldoze' ? '#e9957d' : tool === 'road' ? '#cee8d1' : ZONE_COLORS[tool];
    return { parts: cells.filter(inBounds).map(cell => ({ position: [toWorld(cell.x), .5, toWorld(cell.z)] as [number, number, number], scale: [7.7, .15, 7.7] as [number, number, number], color })), valid };
  }, [hover, started, modal, tool, brush, anchor, city, roadKind]);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .35, 0]}
      onPointerMove={onMove} onPointerLeave={() => useGame.getState().setHover(null)}
      onPointerDown={e => {
        if (e.button !== 0 || !started || modal) return;
        e.stopPropagation(); const cell = cellOf(e);
        if (!inBounds(cell)) return;
        painting.current = true; lastPaint.current = keyOf(cell); useGame.getState().interact(cell);
      }}>
      <planeGeometry args={[MAP_SIZE * CELL_SIZE, MAP_SIZE * CELL_SIZE]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <Instances parts={preview.parts} opacity={.55} shadow={false} />
    {anchor && <mesh position={[toWorld(anchor.x), .7, toWorld(anchor.z)]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><ringGeometry args={[1.4, 1.8, 24]} /><meshBasicMaterial color="#fff5d1" /></mesh>}
    {selected && <Line points={[[toWorld(selected.x) - 4, .55, toWorld(selected.z) - 4], [toWorld(selected.x) + 4, .55, toWorld(selected.z) - 4], [toWorld(selected.x) + 4, .55, toWorld(selected.z) + 4], [toWorld(selected.x) - 4, .55, toWorld(selected.z) + 4], [toWorld(selected.x) - 4, .55, toWorld(selected.z) - 4]]} color="#f7eac1" lineWidth={2} raycast={() => {}} />}
  </>;
}

function World() {
  const showGrid = useGame(s => s.showGrid), tool = useGame(s => s.tool), shadows = useGame(s => s.shadows);
  return <>
    <color attach="background" args={['#b7c8c8']} /><fog attach="fog" args={['#b7c8c8', 550, 1300]} />
    <ambientLight intensity={1.15} color="#e0ebee" />
    <hemisphereLight args={['#d9ecf6', '#898561', 1.2]} />
    <directionalLight position={[-180, 280, 100]} intensity={2.5} color="#fff1d3" castShadow={shadows}
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-280} shadow-camera-right={280} shadow-camera-top={280} shadow-camera-bottom={-280} shadow-camera-far={800} shadow-bias={-.0004} shadow-normalBias={.06} />
    <Landscape /><Roads /><Lots /><Buildings />
    {showGrid && tool !== 'select' && <Grid position={[0, .23, 0]} args={[448, 448]} cellSize={8} sectionSize={40} cellThickness={.45} sectionThickness={.65} cellColor="#496b55" sectionColor="#597762" fadeDistance={650} fadeStrength={1.5} raycast={() => {}} />}
    <Line points={[[-224, .2, -224], [224, .2, -224], [224, .2, 224], [-224, .2, 224], [-224, .2, -224]]} color="#d3dbba" transparent opacity={.4} dashed dashSize={4} gapSize={4} lineWidth={1} raycast={() => {}} />
    <BuildSurface /><CameraRig />
  </>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Falha ao iniciar o mundo 3D', error, info); }
  render() {
    if (this.state.failed) return <div className="webgl-error"><h2>O mundo 3D não pôde ser iniciado.</h2><p>Ative a aceleração de hardware do navegador e recarregue. Urbania precisa de WebGL 2.</p><button onClick={() => location.reload()}>Tentar novamente</button></div>;
    return this.props.children;
  }
}

export function Scene() {
  const shadows = useGame(s => s.shadows);
  const [ready, setReady] = useState(false);
  return <SceneBoundary>
    {!ready && <div className="world-loading">Preparando seu território<span /></div>}
    <Canvas shadows={shadows ? 'soft' : false} dpr={[1, 1.7]} gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [190, 240, 285], fov: 42, near: 1, far: 1600 }} onCreated={() => setReady(true)}
      fallback={<div className="webgl-error">Seu navegador precisa oferecer WebGL 2 para jogar Urbania.</div>}
      onContextMenu={e => e.preventDefault()}>
      <Suspense fallback={null}><World /></Suspense>
    </Canvas>
  </SceneBoundary>;
}
