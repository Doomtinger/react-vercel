'use client';

/**
 * 情绪图形渲染器（SVG 矢量 · 参数驱动 · 图层化）
 *
 * - 所有图形均由 ShapeParams 决定，不使用任何随机数；
 * - 复合情绪融合：主情绪作为主体几何，次要情绪作为包裹流体（底层）或附属图层（顶层）；
 *   次要情绪含冲突拉扯时，其尖角特征保留；
 * - 柔和模式：抹除全部尖角、关闭全部抖动；
 * - 动画通过 requestAnimationFrame 直接修改 SVG 属性，避免每帧 React 重渲染；
 * - 单轮动画周期 3~6s（呼吸 5s / 波纹 3~6s / 云雾为连续缓慢下沉流）。
 */

import { useEffect, useMemo, useRef } from 'react';
import {
  CALM_ACCENT,
  EXCITED_ACCENT,
  INTENSITY_RULES,
  safeCategoryRule,
  type EmotionCategory,
  type IntensityLevel,
  type ShapeForm,
  type ShapeParams,
} from './mapping';

const HALF = 260; // viewBox 半径
const RIBBON_W = [7, 9, 12]; // 反刍带状线宽（Ⅰ/Ⅱ/Ⅲ），线条宽度随强度变大
const BLUR_STD = [12, 16, 20]; // 云雾模糊度随强度增大
const CLOUD_BIAS = [10, 30, 50]; // 云雾重心下坠偏移随强度增大
const BLOCK_BREATH = [0.015, 0.008, 0.004]; // 团块呼吸幅度随强度趋近静止

type Role = 'primary' | 'back' | 'front';

interface LayerSpec {
  cat: EmotionCategory;
  form: ShapeForm;
  color: string;
  accentColor?: string; // 冲突拉扯主层的躁动红
  scale: number;
  layerOpacity: number;
  role: Role;
}

interface Props {
  params: ShapeParams;
  softMode?: boolean;
}

function levelIdx(intensity: IntensityLevel): number {
  return intensity === 'heavy' ? 2 : intensity === 'medium' ? 1 : 0;
}

/** 当前渲染器支持的形态 */
const RENDERABLE_FORMS: ShapeForm[] = ['cloud', 'spiral', 'conflict-spiral', 'solid-block', 'ripple', 'ascending'];
/** 历史记录中的已废弃形态 → 最接近的现行形态（v1.0/v1.1 尖角螺旋 ≈ 冲突拉扯） */
const LEGACY_FORM_ALIAS: Record<string, ShapeForm> = {
  'spiked-spiral': 'conflict-spiral',
};

/** 历史记录兼容：判断形态是否可被当前渲染器绘制（不可绘时保留参数、降级提示，不崩溃） */
export function isFormRenderable(form: string): boolean {
  const f = LEGACY_FORM_ALIAS[form] ?? (form as ShapeForm);
  return RENDERABLE_FORMS.includes(f);
}

/** 复合情绪图层编排：云雾/波纹包裹在底层，团块内核/交织螺旋在顶层 */
function buildLayers(params: ShapeParams): LayerSpec[] {
  const primaryForm = LEGACY_FORM_ALIAS[params.form] ?? params.form;
  const isConflict = primaryForm === 'conflict-spiral';
  const primary: LayerSpec = {
    cat: params.primary,
    form: primaryForm,
    color: params.colors[0],
    accentColor: isConflict ? params.colors[1] : undefined,
    scale: 1,
    layerOpacity: 1,
    role: 'primary',
  };

  const back: LayerSpec[] = [];
  const front: LayerSpec[] = [];
  const compoundColors = params.colors.slice(params.compoundColorStart);

  params.compound.forEach((cat, i) => {
    const rule = safeCategoryRule(cat);
    if (!rule) return; // 历史记录携带的已废弃类别：跳过图层，不崩溃、不重绘
    const form = LEGACY_FORM_ALIAS[rule.form] ?? rule.form;
    if (form === 'cloud' || form === 'ripple' || form === 'ascending') {
      // 包裹流体/弥散光点：放大铺在外围底层
      back.push({ cat: cat as EmotionCategory, form, color: compoundColors[i], scale: 1.18, layerOpacity: 0.45, role: 'back' });
    } else if (form === 'solid-block') {
      // 固化内核：缩小压在中心顶层
      front.push({ cat: cat as EmotionCategory, form, color: compoundColors[i], scale: 0.5, layerOpacity: 0.85, role: 'front' });
    } else {
      // 螺旋/交织螺旋次要情绪：缩小交织在主体之上（尖角特征保留）
      front.push({ cat: cat as EmotionCategory, form, color: compoundColors[i], scale: 0.78, layerOpacity: 0.6, role: 'front' });
    }
  });

  return [...back, primary, ...front];
}

/**
 * 生成螺旋路径；spikeCount > 0 时叠加细碎软尖角脉冲（柔和短突起，禁止锋利长刺）；
 * wobbleAmp > 0 时叠加确定性噪声，让线条不完美、更像思绪。
 */
function spiralPath(
  rings: number,
  maxR: number,
  spikeCount: number,
  wobbleAmp: number,
  seed: number
): string {
  const total = rings * Math.PI * 2;
  const pts = 640;
  const r0 = 16;
  const spacing = spikeCount > 0 ? total / spikeCount : 0;
  const w = spacing * 0.32;
  const spikeH = 6.5;
  const p1 = ((seed % 613) / 613) * Math.PI * 2;
  const p2 = ((seed % 317) / 317) * Math.PI * 2;
  let d = '';
  for (let i = 0; i <= pts; i++) {
    const th = (i / pts) * total;
    let r = r0 + (maxR - r0) * (th / total);
    if (wobbleAmp > 0) {
      r += wobbleAmp * Math.sin(5 * th + p1) + wobbleAmp * 0.6 * Math.sin(9 * th - p2);
    }
    if (spikeCount > 0) {
      const k = th / spacing;
      const nearest = Math.round(k);
      if (nearest >= 1) {
        const dist = Math.abs(k - nearest) * spacing;
        r += spikeH * Math.max(0, 1 - dist / w);
      }
    }
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d;
}

interface CloudBlob {
  rx: number;
  ry: number;
  x: number;
  speed: number;
  op: number;
  debris: boolean;
}

/** 云雾面片：Ⅰ 轻薄松散多空隙 → Ⅲ 致密厚重沉底 + 细碎飘散碎片 */
function buildCloudBlobs(intensity: IntensityLevel, seed: number): CloudBlob[] {
  const li = levelIdx(intensity);
  const s = (seed % 97) / 97;
  const mainCount = [5, 6, 7][li];
  const rxBase = [62, 88, 108];
  const rxVar = [28, 30, 38];
  const opBase = [0.3, 0.44, 0.56];
  const specs: CloudBlob[] = [];
  for (let i = 0; i < mainCount; i++) {
    const f = ((i * 37 + Math.floor(s * 30)) % 10) / 10;
    const rx = rxBase[li] + f * rxVar[li];
    specs.push({
      rx,
      ry: rx * (0.52 + ((i * 3) % 3) * 0.07),
      x: -150 + ((i * 61) % 300) + (f - 0.5) * 24,
      speed: 0.8 + f * 0.45,
      op: opBase[li] + ((i * 5) % 3) * 0.05,
      debris: false,
    });
  }
  // Ⅲ 重度：局部细碎飘散的碎片
  if (li === 2) {
    for (let i = 0; i < 3; i++) {
      specs.push({
        rx: 16 + i * 6,
        ry: 12 + i * 4,
        x: -120 + i * 110,
        speed: 1.6,
        op: 0.4,
        debris: true,
      });
    }
  }
  return specs;
}

/** 固化团块：闭合圆润形体，轮廓带确定性微起伏（二十面体变形的矢量近似） */
function buildBlockPath(seed: number, intensity: IntensityLevel): string {
  const base = intensity === 'heavy' ? 94 : intensity === 'medium' ? 102 : 110;
  const amp = 0.055;
  const p1 = ((seed % 419) / 419) * Math.PI * 2;
  const p2 = ((seed % 257) / 257) * Math.PI * 2;
  const K = 72;
  let d = '';
  for (let i = 0; i <= K; i++) {
    const th = (i / K) * Math.PI * 2;
    const r = base * (1 + amp * Math.sin(3 * th + p1) + amp * 0.6 * Math.sin(5 * th - p2));
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d + ' Z';
}

/** 单个形态图层：自带几何与动画，主层 / 包裹层 / 附属层复用同一实现 */
function EmotionFormLayer({
  spec,
  params,
  softMode,
  uid,
}: {
  spec: LayerSpec;
  params: ShapeParams;
  softMode: boolean;
  uid: string;
}) {
  const groupRef = useRef<SVGGElement | null>(null);
  const nodeRefs = useRef<(SVGElement | null)[]>([]);

  const level = INTENSITY_RULES[params.intensity];
  const li = levelIdx(params.intensity);
  // 柔和模式：抹除全部尖角、关闭全部抖动
  const spikeCount = spec.form === 'conflict-spiral' && !softMode ? params.spikeCount : 0;
  const jitterAmp = spec.form === 'conflict-spiral' && !softMode ? level.jitterAmp : 0;
  const rotSpeed = softMode ? level.rotationSpeed * 0.5 : level.rotationSpeed;

  const spiralD = useMemo(() => {
    if (spec.form !== 'spiral' && spec.form !== 'conflict-spiral') return '';
    return spiralPath(params.rings, 198, spikeCount, 3, params.seed);
  }, [spec.form, params.rings, spikeCount, params.seed]);

  const echoD = useMemo(() => {
    if (spec.form !== 'conflict-spiral') return '';
    return spiralPath(params.rings, 186, spikeCount, 2.4, params.seed + 13);
  }, [spec.form, params.rings, spikeCount, params.seed]);

  const blobs = useMemo(
    () => (spec.form === 'cloud' ? buildCloudBlobs(params.intensity, params.seed) : []),
    [spec.form, params.intensity, params.seed]
  );

  const blockD = useMemo(
    () => (spec.form === 'solid-block' ? buildBlockPath(params.seed, params.intensity) : ''),
    [spec.form, params.seed, params.intensity]
  );

  const rippleCount = spec.form === 'ripple' ? 5 + Math.round(params.rings / 2) : 0;
  const ripplePeriod = 6 / params.flowSpeed; // 单轮 3~6s
  const cloudCycle = 16 / params.flowSpeed; // 连续缓慢下沉流
  const ascendingCount = spec.form === 'ascending' ? 10 + params.rings : 0;
  const ascendingPeriod = 6 / params.flowSpeed; // 单轮上升周期 3~6s

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const phase0 = ((params.seed % 360) / 360) * Math.PI * 2;
    const seedFrac = (params.seed % 997) / 997;
    const bias = CLOUD_BIAS[li];

    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const g = groupRef.current;

      if (spec.form === 'spiral' || spec.form === 'conflict-spiral') {
        if (g) {
          // 呼吸周期 5s；收缩 + 缓慢自转
          const breathe = 1 - level.contraction * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 5));
          const dir = spec.form === 'conflict-spiral' ? 1 : -1;
          const jx = jitterAmp * Math.sin(t * 24 + phase0);
          const jy = jitterAmp * Math.cos(t * 19 + phase0 * 1.3);
          const rot = dir * rotSpeed * t;
          g.setAttribute(
            'transform',
            `translate(${jx.toFixed(2)} ${jy.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${breathe.toFixed(4)})`
          );
        }
      } else if (spec.form === 'cloud') {
        const nodes = nodeRefs.current;
        nodes.forEach((el, ni) => {
          if (!(el instanceof SVGEllipseElement)) return;
          const b = blobs[ni % blobs.length];
          const prog = ((t * b.speed) / cloudCycle + b.speed * 0.17 + ni * 0.11) % 1;
          const y = bias - 310 + prog * 580;
          const x = b.x + 24 * Math.sin(t * 0.1 + ni * 1.7 + phase0);
          el.setAttribute('cy', y.toFixed(1));
          el.setAttribute('cx', x.toFixed(1));
        });
      } else if (spec.form === 'solid-block') {
        if (g) {
          // 仅极微弱呼吸式缩放，强度越高越趋近静止
          const amp = BLOCK_BREATH[li];
          const s = 1 + amp * (0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 6));
          g.setAttribute('transform', `scale(${s.toFixed(4)})`);
        }
      } else if (spec.form === 'ripple') {
        const nodes = nodeRefs.current;
        nodes.forEach((el, ni) => {
          if (!(el instanceof SVGCircleElement)) return;
          const p = ((t / ripplePeriod) + ni / rippleCount + seedFrac * 0.5) % 1;
          const r = 22 + p * 205;
          const op = Math.pow(1 - p, 1.4) * (level.strokeOpacity + 0.1);
          el.setAttribute('r', r.toFixed(1));
          el.setAttribute('opacity', op.toFixed(3));
        });
      } else if (spec.form === 'ascending') {
        // 兴奋激昂：光点自下而上缓缓漂浮，中途淡入淡出，轻微横向摇摆
        const nodes = nodeRefs.current;
        nodes.forEach((el, ni) => {
          if (!(el instanceof SVGCircleElement)) return;
          const p = ((t / ascendingPeriod) + ni / ascendingCount + seedFrac * 0.4) % 1;
          const y = 210 - p * 420;
          const xBase = ((ni * 53) % 180) - 90;
          const x = xBase + 18 * Math.sin(t * 0.5 + ni * 1.3 + phase0);
          el.setAttribute('cy', y.toFixed(1));
          el.setAttribute('cx', x.toFixed(1));
          el.setAttribute('opacity', (Math.sin(p * Math.PI) * 0.9).toFixed(3));
        });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, params, blobs, softMode, ripplePeriod, rippleCount, cloudCycle, ascendingPeriod, ascendingCount, li, level]);

  const setNodeRef = (ni: number) => (el: SVGElement | null) => {
    nodeRefs.current[ni] = el;
  };

  // 历史记录兼容：已退役形态（v1.0/v1.1 的 burst 等）不再绘制几何，仅保留参数
  const renderable = RENDERABLE_FORMS.includes(LEGACY_FORM_ALIAS[spec.form] ?? spec.form);
  if (!renderable) return null;

  const isCalm = spec.form === 'ripple';
  const isConflictPrimary = spec.form === 'conflict-spiral' && spec.role === 'primary';

  return (
    <g transform={`scale(${spec.scale})`} opacity={spec.layerOpacity}>
      <g ref={groupRef}>
        {/* 云雾形态：柔和无棱角流体面片，边缘消融 */}
        {spec.form === 'cloud' &&
          blobs.map((b, bi) => (
            <ellipse
              key={bi}
              ref={setNodeRef(bi)}
              cx={b.x}
              cy={0}
              rx={b.rx}
              ry={b.ry}
              fill={spec.color}
              opacity={b.op}
              filter={`url(#${uid}blur)`}
            />
          ))}

        {/* 内收螺旋形态：带状柔滑曲线 */}
        {spec.form === 'spiral' &&
          [0, 1].map((si) => (
            <path
              key={si}
              d={spiralD}
              fill="none"
              stroke={spec.color}
              strokeWidth={si === 0 ? RIBBON_W[li] : RIBBON_W[li] * 0.55}
              strokeLinecap="round"
              opacity={si === 0 ? 1 : 0.6}
              transform={si === 0 ? undefined : 'rotate(180) scale(0.86)'}
            />
          ))}

        {/* 冲突拉扯形态：悲伤主带（带细碎软尖角）+ 躁动次带交织 */}
        {spec.form === 'conflict-spiral' && (
          <>
            <path
              d={spiralD}
              fill="none"
              stroke={spec.color}
              strokeWidth={RIBBON_W[li] * 0.9}
              strokeLinecap="round"
            />
            {isConflictPrimary && spec.accentColor && (
              <path
                d={echoD}
                fill="none"
                stroke={spec.accentColor}
                strokeWidth={RIBBON_W[li] * 0.5}
                strokeLinecap="round"
                opacity={0.85}
                transform="rotate(55) scale(0.94)"
              />
            )}
          </>
        )}

        {/* 固化团块形态：闭合紧实形体 + 哑光明暗 */}
        {spec.form === 'solid-block' && (
          <>
            <path d={blockD} fill={spec.color} />
            <ellipse cx={0} cy={22} rx={62} ry={42} fill="#000" opacity={0.1 + li * 0.05} />
            {li === 0 && <ellipse cx={-24} cy={-30} rx={40} ry={26} fill="#fff" opacity={0.1} />}
          </>
        )}

        {/* 舒展波纹形态（兜底态） */}
        {spec.form === 'ripple' &&
          Array.from({ length: rippleCount }).map((_, ci) => (
            <circle
              key={ci}
              ref={setNodeRef(ci)}
              cx={0}
              cy={0}
              r={22}
              fill="none"
              stroke={isCalm && ci % 2 === 1 ? CALM_ACCENT : spec.color}
              strokeWidth={2 + li * 0.5}
            />
          ))}

        {/* 上升光尘形态（兴奋激昂扩展态） */}
        {spec.form === 'ascending' &&
          Array.from({ length: ascendingCount }).map((_, ai) => (
            <circle
              key={ai}
              ref={setNodeRef(ai)}
              cx={0}
              cy={0}
              r={3 + (ai % 3) * 1.5 + li * 0.8}
              fill={ai % 2 === 1 ? EXCITED_ACCENT : spec.color}
            />
          ))}
      </g>
    </g>
  );
}

export default function EmotionCanvas({ params, softMode = false }: Props) {
  const layers = useMemo(() => buildLayers(params), [params]);
  const uid = `ef${params.seed % 100000}`;

  return (
    <svg viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} className="w-full h-full block">
      <defs>
        {/* 统一低饱和中性底色，仅中心留极微弱主色晕染，不抢图形 */}
        <radialGradient id={`${uid}bg`} cx="50%" cy="44%" r="72%">
          <stop offset="0%" stopColor={params.colors[0]} stopOpacity="0.07" />
          <stop offset="55%" stopColor={params.colors[0]} stopOpacity="0.03" />
          <stop offset="100%" stopColor="#181922" stopOpacity="0" />
        </radialGradient>
        {params.form === 'cloud' && (
          <filter id={`${uid}blur`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={BLUR_STD[levelIdx(params.intensity)]} />
          </filter>
        )}
      </defs>

      <rect x={-HALF} y={-HALF} width={HALF * 2} height={HALF * 2} fill={`url(#${uid}bg)`} />

      {layers.map((spec, i) => (
        <EmotionFormLayer
          key={`${spec.cat}-${spec.role}-${i}`}
          spec={spec}
          params={params}
          softMode={softMode}
          uid={`${uid}l${i}`}
        />
      ))}
    </svg>
  );
}
