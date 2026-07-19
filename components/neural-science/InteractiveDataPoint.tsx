'use client';

import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

interface InteractiveDataPointProps {
  position: [number, number, number];
  color: string;
  data: {
    id: number;
    state: string;
    emotion?: string;
    heartRate?: number;
    timestamp: number;
  };
  onHover?: (data: any) => void;
  onClick?: (data: any) => void;
  hoverScale?: number; // 悬停时的缩放比例
}

// 交互式数据点组件（支持参数化）
export function InteractiveDataPoint({
  position,
  color,
  data,
  onHover,
  onClick,
  hoverScale = 1.5
}: InteractiveDataPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [labelVisible, setLabelVisible] = useState(false);
  const { camera, raycaster, mouse } = useThree();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();

      // 悬停动画 - 使用用户偏好的缩放比例
      const targetScale = hovered ? hoverScale : 1;
      const currentScale = meshRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);

      meshRef.current.scale.set(newScale, newScale, newScale);

      // 悬停时的发光效果
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.emissive = hovered ? new THREE.Color(color) : new THREE.Color(0x000000);
        material.emissiveIntensity = hovered ? 0.5 : 0;
      }
    }
  });

  const handleClick = () => {
    if (onClick) {
      onClick(data);
    }
  };

  const handlePointerOver = () => {
    setHovered(true);
    setLabelVisible(true);
    if (onHover) {
      onHover(data);
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    setLabelVisible(false);
  };

  return (
    <group position={position}>
      {/* 交互式球体 */}
      <Sphere
        ref={meshRef}
        args={[0.15, 32, 32]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.9}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </Sphere>

      {/* 信息标签 */}
      {labelVisible && (
        <Text
          position={[0, 0.3, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {`${data.state} - ${data.timestamp.toFixed(1)}s`}
        </Text>
      )}

      {/* 发光外圈 */}
      {hovered && (
        <Sphere args={[0.2, 32, 32]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>
      )}
    </group>
  );
}

// 交互式神经数据点群
interface InteractiveNeuralPointsProps {
  points: Array<{
    x: number;
    y: number;
    z: number;
    originalData: {
      id: number;
      state: string;
      emotion?: string;
      heartRate?: number;
      timestamp: number;
    };
  }>;
  getStateColor: (state: string, emotion?: string) => string;
  selectedState?: string | null;
  hoverScale?: number; // 悬停时的缩放比例
}

export function InteractiveNeuralPoints({
  points,
  getStateColor,
  selectedState,
  hoverScale = 1.5
}: InteractiveNeuralPointsProps) {
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [clickedData, setClickedData] = useState<any>(null);

  const handleHover = (data: any) => {
    setHoveredData(data);
  };

  const handleClick = (data: any) => {
    setClickedData(data);
    console.log('Clicked data point:', data);
  };

  return (
    <>
      {points
        .filter(point => selectedState === null || point.originalData.state === selectedState)
        .map((point) => (
          <InteractiveDataPoint
            key={point.originalData.id}
            position={[point.x, point.y, point.z] as [number, number, number]}
            color={getStateColor(point.originalData.state, point.originalData.emotion)}
            data={point.originalData}
            onHover={handleHover}
            onClick={handleClick}
            hoverScale={hoverScale}
          />
        ))}

      {/* 悬停信息面板 */}
      {hoveredData && (
        <group position={[5, 4, 0]}>
          <Text
            fontSize={0.2}
            color="white"
            anchorX="left"
            anchorY="top"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`状态: ${hoveredData.state}`}
          </Text>
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="left"
            anchorY="top"
          >
            {`时间: ${hoveredData.timestamp.toFixed(1)}s`}
          </Text>
          {hoveredData.heartRate && (
            <Text
              position={[0, -0.6, 0]}
              fontSize={0.15}
              color="#ffffff"
              anchorX="left"
              anchorY="top"
            >
              {`心率: ${hoveredData.heartRate} bpm`}
            </Text>
          )}
        </group>
      )}
    </>
  );
}
