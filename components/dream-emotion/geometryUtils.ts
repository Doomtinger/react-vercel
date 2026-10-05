import * as THREE from 'three';

/**
 * 几何体拼装工具：把多个零件合并进同一个 BufferGeometry，颜色写进顶点色。
 * 这样一棵树 / 一朵花只占一次 draw call。
 */

export interface GeoData {
  positions: number[];
  colors: number[];
  indices: number[];
}

/** 追加一块参数化曲面：fn(t, u) -> 局部坐标，t∈[0,1] 沿生长方向，u∈[-1,1] 横向 */
export function pushGrid(
  data: GeoData,
  fn: (t: number, u: number) => [number, number, number],
  nt: number,
  nu: number,
  colorFn: (t: number, u: number) => THREE.Color
): void {
  const base = data.positions.length / 3;

  for (let i = 0; i <= nt; i++) {
    const t = i / nt;
    for (let j = 0; j <= nu; j++) {
      const u = (j / nu) * 2 - 1;
      const [x, y, z] = fn(t, u);
      data.positions.push(x, y, z);
      const c = colorFn(t, u);
      data.colors.push(c.r, c.g, c.b);
    }
  }

  const row = nu + 1;
  for (let i = 0; i < nt; i++) {
    for (let j = 0; j < nu; j++) {
      const a = base + i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      data.indices.push(a, c, b, b, c, d);
    }
  }
}

/** 追加一个已有几何体，带变换和统一颜色 */
export function pushGeometry(
  data: GeoData,
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  color: THREE.Color
): void {
  const pos = geo.attributes.position;
  const index = geo.index;
  const base = data.positions.length / 3;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    data.positions.push(v.x, v.y, v.z);
    data.colors.push(color.r, color.g, color.b);
  }

  if (index) {
    for (let i = 0; i < index.count; i++) data.indices.push(base + index.getX(i));
  } else {
    for (let i = 0; i < pos.count; i++) data.indices.push(base + i);
  }
}

export function finalize(data: GeoData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 确定性随机数，保证每次渲染布局一致 */
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
