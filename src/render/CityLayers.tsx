import { useMemo } from 'react';
import * as THREE from 'three';
import { useGame } from '../state/store';
import { FACILITIES, facilityAt, layerValue } from '../core/services';
import { planTraffic } from '../core/traffic';
import { toWorld } from '../core/world';
import { Instances } from './Instances';
import type { Part } from './Instances';

export function CityLayers() {
  const city = useGame(s => s.city), layer = useGame(s => s.layer), selected = useGame(s => s.selected), hover = useGame(s => s.hover), tool = useGame(s => s.tool), kind = useGame(s => s.facilityKind);
  const parts = useMemo(() => {
    if (layer === 'none') return [];
    const result: Part[] = [], volumes = planTraffic(city).volumes;
    const color = (value: number) => new THREE.Color('#bb7765').lerp(new THREE.Color('#98c79b'), Math.max(0, Math.min(1, value))).getStyle();
    if (layer === 'traffic') {
      for (const [key, road] of Object.entries(city.roads)) result.push({ position: [toWorld(road.x), .4, toWorld(road.z)], scale: [7.7, .06, 7.7], color: color(1 - Math.min(1, (volumes[key] ?? 0) / (road.kind === 'avenue' ? 70 : 28))) });
    } else for (const lot of Object.values(city.lots)) {
      const value = layerValue(layer, lot, city, volumes);
      result.push({ position: [toWorld(lot.x), .45, toWorld(lot.z)], scale: [7.8, .09, 7.8], color: color(['pollution', 'crime'].includes(layer) ? 1 - value : value) });
    }
    return result;
  }, [city, layer]);
  const selectedFacility = selected ? facilityAt(city, selected)?.[1] : null;
  const f = tool === 'facility' && hover ? { ...hover, kind } : selectedFacility;
  return <><Instances parts={parts} opacity={.65} shadow={false} />{f && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[toWorld(f.x) + 4, .28, toWorld(f.z) + 4]} raycast={() => {}}><circleGeometry args={[FACILITIES[f.kind].radius * 8, 72]} /><meshBasicMaterial color={FACILITIES[f.kind].color} transparent opacity={.065} depthWrite={false} /></mesh>}</>;
}
