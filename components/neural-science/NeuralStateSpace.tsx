'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, Line, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

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

// 神经状态散点图组件
export function NeuralStatePoints({
  points,
  getStateColor,
  selectedState,
  currentTime
}: {
  points: ProjectedPoint[];
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
  currentTime: number;
}) {
  const pointsRef = useRef<THREE.Points>();

  // 创建点位置和颜色数组
  const { positions, colors } = useMemo(() => {
    const positions: Float32Array = new Float32Array(points.length * 3);
    const colors: Float32Array = new Float32Array(points.length * 3);

    points.forEach((point, i) => {
      const filtered = selectedState === null || point.originalData.state === selectedState;

      if (filtered) {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const color = new THREE.Color(getStateColor(point.originalData.state, point.originalData.emotion));
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      } else {
        // 过滤的点设置为透明
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    });

    return { positions, colors };
  }, [points, getStateColor, selectedState]);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <Points
      ref={pointsRef}
      positions={positions}
      colors={colors}
      size={0.15}
      sizeAttenuation={true}
      transparent
      opacity={0.8}
    />
  );
}

// 时间轨迹组件
export function NeuralTrajectory({
  points,
  getStateColor,
  selectedState,
  currentTime
}: {
  points: ProjectedPoint[];
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
  currentTime: number;
}) {
  const groupRef = useRef<THREE.Group>();

  // 创建轨迹线条
  const trajectoryLines = useMemo(() => {
    const lines: Array<{
      points: [number, number, number][];
      color: string;
      state: string;
      emotion?: string;
    }> = [];

    // 按时间顺序连接点
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // 只连接相同状态的点，或显示状态转换
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
          emotion: current.originalData.emotion
        });
      }
    }

    return lines;
  }, [points, getStateColor, selectedState]);

  useFrame((state) => {
    if (groupRef.current) {
      // 轨动整个轨迹组
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {trajectoryLines.map((line, i) => (
        <Line
          key={i}
          points={line.points as any}
          color={line.color}
          lineWidth={0.02}
          transparent
          opacity={0.6}
        />
      ))}
    </group>
  );
}

// 流形场组件（状态密度可视化）
export function FlowField({
  points,
  getStateColor,
  selectedState
}: {
  points: ProjectedPoint[];
  getStateColor: (state: string, emotion?: string) => string;
  selectedState: string | null;
}) {
  const groupRef = useRef<THREE.Group>();

  // 创建网格流场
  const flowParticles = useMemo(() => {
    const gridSize = 8;
    const particles = [];

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          // 计算该网格点的状态密度
          let density = 0;
          let dominantState = 'resting';
          let dominantEmotion: string | undefined;

          points.forEach(point => {
            const dist = Math.sqrt(
              Math.pow((point.x * 3) / 6 - x, 2) +
              Math.pow((point.y * 3) / 6 - y, 2) +
              Math.pow((point.z * 3) / 6 - z, 2)
            );

            if (dist < 2) {
              const weight = 1 - dist / 2;
              if (point.originalData.state === point.originalData.state) {
                density += weight;
              }
              dominantState = point.originalData.state;
              dominantEmotion = point.originalData.emotion;
            }
          });

          if (density > 0.5) {
            particles.push({
              position: [
                (x / gridSize) * 8 - 4,
                (y / gridSize) * 8 - 4,
                (z / gridSize) * 8 - 4
              ],
              state: dominantState,
              emotion: dominantEmotion,
              density
            });
          }
        }
      }
    }

    return particles;
  }, [points, getStateColor, selectedState]);

  useFrame((state) => {
    if (groupRef.current) {
      // 缓慢流动动画
      groupRef.current.rotation.x += 0.0005;
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {flowParticles.map((particle, i) => {
        const filtered = selectedState === null || particle.state === selectedState;
        if (!filtered) return null;

        const color = getStateColor(particle.state, particle.emotion);
        const size = 0.05 + particle.density * 0.1;

        return (
          <Sphere
            key={i}
            position={particle.position as [number, number, number]}
            args={[size, 8, 8]}
          >
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4 * particle.density}
            />
          </Sphere>
        );
      })}
    </group>
  );
}

// 状态转换指示器
export function StateTransitionIndicators({
  neuralData,
  getStateColor
}: {
  neuralData: Array<{
    id: number;
    timestamp: number;
    state: string;
    emotion?: string;
  }>;
  getStateColor: (state: string, emotion?: string) => string;
}) {
  const groupRef = useRef<THREE.Group>();

  // 找出状态转换点
  const transitionPoints = useMemo(() => {
    const transitions = [];

    for (let i = 1; i < neuralData.length; i++) {
      const prev = neuralData[i - 1];
      const curr = neuralData[i];

      if (prev.state !== curr.state) {
        const projectedPrev = { x: Math.cos(i * 0.1) * 3, y: Math.sin(i * 0.1) * 3, z: (i * 0.05) - 2 };
        const projectedCurr = {
          x: Math.cos((i + 1) * 0.1) * 3,
          y: Math.sin((i + 1) * 0.1) * 3,
          z: ((i + 1) * 0.05) - 2
        };

        transitions.push({
          from: projectedPrev,
          to: projectedCurr,
          fromState: prev.state,
          toState: curr.state,
          fromEmotion: prev.emotion,
          toEmotion: curr.emotion,
          timestamp: curr.timestamp
        });
      }
    }

    return transitions;
  }, [neuralData]);

  return (
    <group ref={groupRef}>
      {transitionPoints.map((transition, i) => (
        <group key={i}>
          {/* 转换箭头 */}
          <Line
            points={[
              [transition.from.x, transition.from.y, transition.from.z],
              [transition.to.x, transition.to.y, transition.to.z]
            ] as any}
            color="#FFD700"
            lineWidth={0.05}
          />

          {/* 转换点标记 */}
          <Sphere
            position={[transition.to.x, transition.to.y, transition.to.z]}
            args={[0.1, 8, 8]}
          >
            <meshBasicMaterial color="#FFD700" />
          </Sphere>

          {/* 转换文字标签 */}
          {/* 在实际应用中，这里可以使用Text组件显示状态名称 */}
        </group>
      ))}
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
  const groupRef = useRef<THREE.Group>();

  useFrame((state) => {
    if (groupRef.current && isPlaying) {
      // 时间演化动画
      const rotationSpeed = 0.001;
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 坐标网格 */}
      <gridHelper args={[10, 10, 10]} position={[0, 0, -3]} />

      {/* 根据可视化模式渲染不同内容 */}
      {vizMode === 'scatter' && (
        <NeuralStatePoints
          points={projectedData}
          getStateColor={getStateColor}
          selectedState={selectedState}
          currentTime={currentTime}
        />
      )}

      {vizMode === 'trajectory' && (
        <>
          <NeuralStatePoints
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
            currentTime={currentTime}
          />
          <NeuralTrajectory
            points={projectedData}
            getStateColor={getStateColor}
            selectedState={selectedState}
            currentTime={currentTime}
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
          getStateColor={getStateColor}
        />
      )}

      {/* 状态标签 */}
      <group position={[5, 4, 0]}>
        {['resting', 'memory', 'attention', 'emotional', 'cognitive_load'].map((state, i) => {
          const y = 4 - i * 0.8;
          return (
            <group key={state} position={[0, y, 0]}>
              <Sphere args={[0.15, 8, 8]}>
                <meshBasicMaterial
                  color={getStateColor(state)}
                  transparent
                  opacity={selectedState === state ? 0.9 : 0.4}
                />
              </Sphere>
              <Text
                position={[0.3, y, 0]}
                fontSize={0.3}
                color="white"
                anchorX="left"
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
    </group>
  );
}