'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CaseRecord, recordColor, type HypothesisLink, type MetricOption } from './data';

const R = 6;
const WORKFLOW_COLOR: Record<string, string> = {
  normal: '',
  pending_review: '#E0A458',
  flagged: '#E5484D',
  missing_data: '#8A93A5',
};

function metricHeight(r: CaseRecord, metric: MetricOption): number {
  if (metric === 'none') return 0;
  if (r.kind !== 'assessment' || r.instrument !== metric) return 0;
  const ratio = r.rawScore / r.maxScore;
  return ratio * 3 - 1.5; // -1.5 .. 1.5
}

function NodeGeometry({ kind }: { kind: CaseRecord['kind'] }) {
  switch (kind) {
    case 'assessment':
      return <sphereGeometry args={[0.45, 24, 24]} />;
    case 'life_event':
      return <boxGeometry args={[0.7, 0.7, 0.7]} />;
    case 'clinical_note':
      return <octahedronGeometry args={[0.55]} />;
    case 'review':
      return <tetrahedronGeometry args={[0.6]} />;
  }
}

function Node({
  record,
  position,
  selected,
  dim,
  reducedMotion,
  onSelect,
  onHover,
}: {
  record: CaseRecord;
  position: [number, number, number];
  selected: boolean;
  dim: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = recordColor(record);
  const workflow =
    record.workflow ?? (record.kind === 'assessment' && record.missingItems.length > 0 ? 'missing_data' : 'normal');
  const borderColor = WORKFLOW_COLOR[workflow];

  useFrame((state) => {
    if (!meshRef.current) return;
    let scale = selected ? 1.45 : hovered ? 1.18 : 1;
    if (selected && !reducedMotion) scale = 1.45 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
    meshRef.current.scale.setScalar(scale);
  });

  const showLabel = hovered || selected;

  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(record.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(record.id);
        }}
      >
        <NodeGeometry kind={record.kind} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.95 : hovered ? 0.55 : 0.28}
          transparent
          opacity={dim ? 0.12 : 1}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {borderColor && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.04, 8, 32]} />
          <meshBasicMaterial color={borderColor} transparent opacity={dim ? 0.2 : 0.9} />
        </mesh>
      )}

      {showLabel && !dim && (
        <Html center distanceFactor={12} position={[0, 0.9, 0]} pointerEvents="none">
          <div className="whitespace-nowrap rounded-md bg-[#0c1322]/90 px-2 py-1 text-[11px] text-white/90 ring-1 ring-white/10">
            {record.kind === 'assessment'
              ? `${record.instrument} · ${record.rawScore}/${record.maxScore}`
              : record.kind === 'life_event'
              ? `事件 · ${record.category}`
              : record.kind === 'clinical_note'
              ? `记录 · ${record.author}`
              : `复核 · ${record.reviewer}`}
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene({
  records,
  hypotheses,
  selectedId,
  onSelect,
  metric,
  visibleUntil,
  reducedMotion,
}: {
  records: CaseRecord[];
  hypotheses: HypothesisLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  metric: MetricOption;
  visibleUntil: number;
  reducedMotion: boolean;
}) {
  const sorted = useMemo(() => [...records].sort((a, b) => a.timestamp - b.timestamp), [records]);

  const positions = useMemo(() => {
    if (sorted.length === 0) return new Map<string, [number, number, number]>();
    const tMin = sorted[0].timestamp;
    const tMax = sorted[sorted.length - 1].timestamp;
    const span = tMax - tMin || 1;
    const map = new Map<string, [number, number, number]>();
    for (const r of sorted) {
      const f = (r.timestamp - tMin) / span;
      const a = f * Math.PI * 2 - Math.PI / 2;
      map.set(r.id, [Math.cos(a) * R, metricHeight(r, metric), Math.sin(a) * R]);
    }
    return map;
  }, [sorted, metric]);

  const timelinePts = useMemo(() => {
    const pts: [number, number, number][] = [];
    let prev: [number, number, number] | null = null;
    for (const r of sorted) {
      if (r.timestamp > visibleUntil) continue;
      const p = positions.get(r.id);
      if (!p) continue;
      if (prev) pts.push(prev, p);
      prev = p;
    }
    return pts;
  }, [sorted, positions, visibleUntil]);

  const hypoPts = useMemo(() => {
    const out: { points: [number, number, number][]; note: string }[] = [];
    for (const h of hypotheses) {
      const a = positions.get(h.from);
      const b = positions.get(h.to);
      if (a && b) out.push({ points: [a, b], note: h.note });
    }
    return out;
  }, [hypotheses, positions]);

  return (
    <>
      <color attach="background" args={['#070B14']} />
      <fog attach="fog" args={['#070B14', 14, 34]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 8, 6]} intensity={0.7} color="#7894FF" distance={40} />
      <pointLight position={[-6, -3, -5]} intensity={0.5} color="#B39AFF" distance={40} />

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.02, 8, 160]} />
        <meshBasicMaterial color="#2A3550" />
      </mesh>

      {timelinePts.length >= 2 && (
        <Line points={timelinePts} color="#3A4A6A" lineWidth={1} transparent opacity={0.4} />
      )}

      {hypoPts.map((h, i) => (
        <Line key={i} points={h.points} color="#B39AFF" lineWidth={1} dashed dashSize={0.3} gapSize={0.2} transparent opacity={0.7} />
      ))}

      {sorted.map((r) => {
        const p = positions.get(r.id);
        if (!p) return null;
        return (
          <Node
            key={r.id}
            record={r}
            position={p}
            selected={selectedId === r.id}
            dim={r.timestamp > visibleUntil}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
            onHover={() => {}}
          />
        );
      })}

      <OrbitControls enablePan={false} autoRotate={false} minDistance={8} maxDistance={26} target={[0, 0, 0]} />
    </>
  );
}

export default function StateSpace3D(props: {
  records: CaseRecord[];
  hypotheses: HypothesisLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  metric: MetricOption;
  visibleUntil: number;
}) {
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  return (
    <Canvas camera={{ position: [0, 7, 16], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <Scene {...props} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
