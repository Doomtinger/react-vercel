'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, Line, Sphere, Text, Float, Stars, Sparkles, Trail, MeshDistortMaterial, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';
import { InteractiveNeuralPoints } from './InteractiveDataPoint';

// 神经数据点投射接口
interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  originalData: {
    id: number;
    timestamp: number;
    state: string;
    emotion?: string;
    heartRate?: number;
    skinConductance?: number;
  };
}

interface NeuralStateSpaceSceneProps {
  projectedData: ProjectedPoint[];
  neuralData: Array<{
    id: number;
    timestamp: number;
    state: string;
    emotion?: string;
    heartRate?: number;
    skinConductance?: number;
    features: number[];
  }>;
  vizMode: 'scatter' | 'trajectory' | 'flow_field';
  selectedState: string | null;
  currentTime: number;
  getStateColor: (state: string, emotion?: string) => string;
  isPlaying: boolean;
}

// 增强的神经状态散点图组件（添加专业动画）
export function NeuralStatePoints({
  points,
  getStateColor,
  selectedState
}: {
  points: ProjectedPoint[];
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  // 创建点位置和颜色数组，添加动画效果
  const { positions, colors, sizes, originalPositions } = useMemo(() => {
    const positions: Float32Array = new Float32Array(points.length * 3);
    const colors: Float32Array = new Float32Array(points.length * 3);
    const sizes: Float32Array = new Float32Array(points.length);
    const originalPositions: Float32Array = new Float32Array(points.length * 3);

    points.forEach((point, i) => {
      const filtered = selectedState === null || point.originalData.state === selectedState;

      // 保存原始位置
      originalPositions[i * 3] = point.x;
      originalPositions[i * 3 + 1] = point.y;
      originalPositions[i * 3 + 2] = point.z;

      if (filtered) {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const color = new THREE.Color(getStateColor(point.originalData.state, point.originalData.emotion));
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // 根据状态调整大小
        const baseSize = 0.08;
        const variation = Math.sin(i * 0.1) * 0.02;
        sizes[i] = baseSize + variation;
      } else {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
        sizes[i] = 0;
      }
    });

    return { positions, colors, sizes, originalPositions };
  }, [points, getStateColor, selectedState]);

  useFrame((state) => {
    if (pointsRef.current && groupRef.current) {
      const time = state.clock.getElapsedTime();

      // 专业动画：使用平滑插值
      const positionsArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const sizesArray = pointsRef.current.geometry.attributes.size?.array as Float32Array;

      if (sizesArray) {
        for (let i = 0; i < points.length; i++) {
          if (sizesArray[i] > 0) {
            // 更平滑的脉冲动画
            const baseSize = 0.08;
            const pulse = Math.sin(time * 3 + i * 0.15) * 0.04; // 更快更明显的脉冲
            sizesArray[i] = baseSize + pulse;

            // 添加轻微的浮动效果
            const floatOffset = Math.sin(time * 0.5 + i * 0.2) * 0.02;
            positionsArray[i * 3 + 1] = originalPositions[i * 3 + 1] + floatOffset;
          }
        }
        pointsRef.current.geometry.attributes.size.needsUpdate = true;
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // 整体缓动旋转
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }
  });

  return (
    <>
      <Points
        ref={pointsRef}
        positions={positions}
        colors={colors}
        sizes={sizes}
      >
        <pointsMaterial
          size={0.08}
          sizeAttenuation={true}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Points>

      {/* 为每个点添加发光球体 */}
      {points.map((point) => {
        const filtered = selectedState === null || point.originalData.state === selectedState;
        if (!filtered) return null;

        const color = getStateColor(point.originalData.state, point.originalData.emotion);
        return (
          <Float
            key={point.originalData.id}
            speed={2}
            rotationIntensity={0.5}
            floatIntensity={0.5}
          >
            <Sphere
              position={[point.x, point.y, point.z]}
              args={[0.03, 16, 16]}
            >
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
              />
            </Sphere>
          </Float>
        );
      })}
    </>
  );
}

// 增强的时间轨迹组件
export function NeuralTrajectory({
  points,
  getStateColor,
  selectedState
}: {
  points: ProjectedPoint[];
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lineRefs = useRef<any[]>([]);

  // 创建轨迹线条
  const trajectoryLines = useMemo(() => {
    const lines: Array<{
      points: [number, number, number][];
      color: string;
      state: string;
      emotion?: string;
      id: number;
    }> = [];

    // 按时间顺序连接点
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      const filtered = selectedState === null ||
                       current.originalData.state === selectedState ||
                       next.originalData.state === selectedState;

      if (filtered) {
        lines.push({
          points: [
            [current.x, current.y, current.z],
            [next.x, next.y, next.z]
          ],
          color: getStateColor(current.originalData.state, current.originalData.emotion),
          state: current.originalData.state,
          emotion: current.originalData.emotion,
          id: i
        });
      }
    }

    return lines;
  }, [points, getStateColor, selectedState]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      // 缓慢轨动整个轨迹组
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
    }

    // 线条流动效果
    lineRefs.current.forEach((line, i) => {
      if (line) {
        const time = state.clock.getElapsedTime();
        const material = line.material as THREE.LineBasicMaterial;
        if (material) {
          material.opacity = 0.4 + Math.sin(time * 2 + i * 0.2) * 0.2;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {trajectoryLines.map((line, i) => (
        <group key={line.id}>
          <Line
            ref={(ref) => { if (ref) lineRefs.current[i] = ref; }}
            points={line.points as any}
            color={line.color}
            lineWidth={2}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
          {/* 在连接点添加小发光节点 */}
          <Sphere
            position={line.points[0] as [number, number, number]}
            args={[0.02, 8, 8]}
          >
            <meshBasicMaterial
              color={line.color}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </Sphere>
        </group>
      ))}
    </group>
  );
}

// 增强的流形场组件
export function FlowField({
  points,
  getStateColor,
  selectedState
}: {
  points: ProjectedPoint[];
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // 创建网格流场
  const flowParticles = useMemo(() => {
    const gridSize = 6;
    const particles = [];

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          let density = 0;
          let dominantState = 'resting';
          let dominantEmotion: string | undefined;

          points.forEach(point => {
            const dist = Math.sqrt(
              Math.pow((point.x + 5) / 10 * gridSize - x, 2) +
              Math.pow((point.y + 5) / 10 * gridSize - y, 2) +
              Math.pow((point.z + 5) / 10 * gridSize - z, 2)
            );

            if (dist < 2) {
              const weight = 1 - dist / 2;
              density += weight;
              dominantState = point.originalData.state;
              dominantEmotion = point.originalData.emotion;
            }
          });

          if (density > 0.3) {
            particles.push({
              position: [
                (x / gridSize) * 10 - 5,
                (y / gridSize) * 10 - 5,
                (z / gridSize) * 10 - 5
              ] as [number, number, number],
              state: dominantState,
              emotion: dominantEmotion,
              density
            });
          }
        }
      }

      return particles || [];
    }
  }, [points, getStateColor, selectedState]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      // 缓慢流动动画
      groupRef.current.rotation.x = Math.sin(time * 0.05) * 0.2;
      groupRef.current.rotation.y = time * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {flowParticles?.map((particle, i) => {
        const filtered = selectedState === null || particle.state === selectedState;
        if (!filtered) return null;

        const color = getStateColor(particle.state, particle.emotion);
        const size = 0.1 + particle.density * 0.15;

        return (
          <Float
            key={i}
            speed={1 + Math.random()}
            rotationIntensity={0.2}
            floatIntensity={0.3}
          >
            <Icosahedron
              position={particle.position}
              args={[size, 1]}
            >
              <MeshDistortMaterial
                color={color}
                transparent
                opacity={0.3 * particle.density}
                distort={0.3}
                speed={2}
                blending={THREE.AdditiveBlending}
              />
            </Icosahedron>
          </Float>
        );
      })}

      {/* 添加闪烁粒子效果 */}
      <Sparkles
        count={100}
        scale={12}
        size={2}
        speed={0.4}
        opacity={0.5}
        color="#ffffff"
      />
    </group>
  );
}

// 增强的状态转换指示器
export function StateTransitionIndicators({
  neuralData,
  projectedData
}: {
  neuralData: Array<{
    id: number;
    timestamp: number;
    state: string;
    emotion?: string;
  }>;
  projectedData: ProjectedPoint[];
}) {
  const groupRef = useRef<THREE.Group>(null);

  // 找出状态转换点
  const transitionPoints = useMemo(() => {
    const transitions = [];

    for (let i = 1; i < neuralData.length; i++) {
      const prev = neuralData[i - 1];
      const curr = neuralData[i];

      if (prev.state !== curr.state && projectedData[i] && projectedData[i - 1]) {
        transitions.push({
          from: projectedData[i - 1],
          to: projectedData[i],
          fromState: prev.state,
          toState: curr.state,
          fromEmotion: prev.emotion,
          toEmotion: curr.emotion,
          timestamp: curr.timestamp,
          id: i
        });
      }
    }

    return transitions;
  }, [neuralData, projectedData]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {transitionPoints.map((transition) => (
        <group key={transition.id}>
          {/* 转换能量弧 */}
          <Trail
            width={0.1}
            color="#FFD700"
            length={2}
            attenuation={(width: number) => width * 0.5}
          >
            <Sphere
              position={[
                (transition.from.x + transition.to.x) / 2,
                (transition.from.y + transition.to.y) / 2,
                (transition.from.z + transition.to.z) / 2
              ]}
              args={[0.05, 8, 8]}
            >
              <meshBasicMaterial
                color="#FFD700"
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
              />
            </Sphere>
          </Trail>

          {/* 转换点标记 */}
          <Float
            speed={3}
            rotationIntensity={1}
            floatIntensity={0.5}
          >
            <Icosahedron
              position={[transition.to.x, transition.to.y, transition.to.z]}
              args={[0.12, 0]}
            >
              <MeshDistortMaterial
                color="#FFD700"
                transparent
                opacity={0.7}
                distort={0.5}
                speed={3}
                blending={THREE.AdditiveBlending}
              />
            </Icosahedron>
          </Float>

          {/* 转换光晕 */}
          <Sphere
            position={[transition.to.x, transition.to.y, transition.to.z]}
            args={[0.2, 16, 16]}
          >
            <meshBasicMaterial
              color="#FFD700"
              transparent
              opacity={0.15}
              blending={THREE.AdditiveBlending}
            />
          </Sphere>
        </group>
      ))}
    </group>
  );
}

// 3D背景星空（增强版）
export function NeuralBackground() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y = time * 0.01;
      groupRef.current.rotation.x = Math.sin(time * 0.005) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={100}
        depth={50}
        count={8000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <Sparkles
        count={300}
        scale={25}
        size={4}
        speed={0.4}
        opacity={0.6}
        color="#ffffff"
      />

      {/* 添加多层星空效果 */}
      <Stars
        radius={60}
        depth={30}
        count={3000}
        factor={2}
        saturation={0.2}
        fade
        speed={0.5}
      />
    </group>
  );
}

// 增强的状态标签
export function StateLabels({
  getStateColor,
  selectedState
}: {
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const states = ['resting', 'memory', 'attention', 'emotional', 'cognitive_load'];

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();

      // 浮动效果
      states.forEach((_, i) => {
        const child = groupRef.current?.children[i];
        if (child) {
          child.position.y = (4 - i * 0.8) + Math.sin(time * 0.5 + i) * 0.05;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[5, 4, 0]}>
      {states.map((state, i) => {
        const y = 4 - i * 0.8;
        const color = getStateColor(state);
        const isSelected = selectedState === state;

        return (
          <group key={state} position={[0, y, 0]}>
            {/* 状态球体 */}
            <Float
              speed={2}
              rotationIntensity={0.3}
              floatIntensity={0.2}
            >
              <Icosahedron args={[0.15, 1]}>
                <MeshDistortMaterial
                  color={color}
                  transparent
                  opacity={isSelected ? 0.9 : 0.5}
                  distort={0.3}
                  speed={1}
                  blending={THREE.AdditiveBlending}
                />
              </Icosahedron>
            </Float>

            {/* 光晕效果 */}
            {isSelected && (
              <Sphere args={[0.25, 16, 16]}>
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.2}
                  blending={THREE.AdditiveBlending}
                />
              </Sphere>
            )}

            {/* 状态文字 */}
            <Text
              position={[0.4, y, 0]}
              fontSize={0.35}
              color="white"
              anchorX="left"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {
                state === 'resting' ? '静息态' :
                state === 'memory' ? '记忆' :
                state === 'attention' ? '注意力' :
                state === 'emotional' ? '情绪' : '认知负荷'
              }
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// 主场景组件
export function NeuralStateSpaceScene({
  projectedData,
  neuralData,
  vizMode,
  selectedState,
  currentTime,
  getStateColor,
  isPlaying
}: NeuralStateSpaceSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && isPlaying) {
      // 时间演化动画
      const rotationSpeed = 0.001;
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 3D背景 */}
      <NeuralBackground />

      {/* 坐标网格 */}
      <gridHelper args={[15, 15, 0x303030, 0x202020]} position={[0, -3, 0]} />

      {/* 增强的坐标轴 */}
      <group position={[-6, -3, -6]}>
        <Line
          points={[[0, 0, 0], [12, 0, 0]]}
          color="#4A90E2"
          lineWidth={2}
        />
        <Text position={[6, 0, 0.2]} fontSize={0.3} color="#4A90E2">
          X
        </Text>

        <Line
          points={[[0, 0, 0], [0, 6, 0]]}
          color="#2ECC71"
          lineWidth={2}
        />
        <Text position={[0, 3, 0.2]} fontSize={0.3} color="#2ECC71">
          Y
        </Text>

        <Line
          points={[[0, 0, 0], [0, 0, 12]]}
          color="#E91E63"
          lineWidth={2}
        />
        <Text position={[0.2, 0, 6]} fontSize={0.3} color="#E91E63">
          Z
        </Text>
      </group>

      {/* 根据可视化模式渲染不同内容 */}
      {vizMode === 'scatter' && (
        <>
          <NeuralStatePoints
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
          />
          <InteractiveNeuralPoints
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
          />
        </>
      )}

      {vizMode === 'trajectory' && (
        <>
          <NeuralStatePoints
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
          />
          <InteractiveNeuralPoints
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
          />
          <NeuralTrajectory
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
          />
        </>
      )}

      {vizMode === 'flow_field' && (
        <FlowField
          points={projectedData}
          getStateColor={getStateColor}
          selectedState={selectedState}
        />
      )}

      {/* 状态转换指示器 */}
      {vizMode === 'trajectory' && (
        <StateTransitionIndicators
          neuralData={neuralData}
          projectedData={projectedData}
        />
      )}

      {/* 增强的状态标签 */}
      <StateLabels
        getStateColor={getStateColor}
        selectedState={selectedState}
      />

      {/* 环境光照效果（增强版） */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#4A90E2" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#E91E63" />
      <pointLight position={[0, -10, 10]} intensity={0.4} color="#2ECC71" />

      {/* 环境贴图 - 使用基本的背景色替代 HDR 加载 */}
      {/* <Environment preset="night" /> */}

      {/* 替代方案：使用简单的环境光照 */}
      <hemisphereLight
        args={['#ffffff', '#0x050510', 0.5]}
        position={[0, 10, 0]}
      />

      {/* 接触阴影 - 移除可能引起问题的组件 */}
      {/* <ContactShadows
        position={[0, -5, 0]}
        opacity={0.3}
        scale={20}
        blur={2}
        far={10}
      /> */}
    </group>
  );
}
