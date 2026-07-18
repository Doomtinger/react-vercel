'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

// 动态导入樱花场景组件
const SakuraScene = dynamic(
  () => import('@/components/cherry-blossom/SakuraScene'),
  { ssr: false }
);

export default function SakuraPage() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-pink-100 via-pink-50 to-orange-50">
      {/* 顶部标题 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/20 backdrop-blur-sm border-b border-pink-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">🌸</span>
                樱花树场景
              </h1>
              <p className="text-sm text-pink-700 mt-1">
                Three.js 程序化樱花树，带有飘落花瓣效果
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-pink-600 font-medium">🎨 渲染特性</div>
              <div className="text-xs text-pink-500 mt-1 space-y-1">
                <div>✨ 程序化树结构</div>
                <div>🌸 粒子系统落花</div>
                <div>💫 动态光照</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D 场景 */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [8, 6, 12], fov: 60 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2
          }}
          shadows
        >
          <Suspense fallback={null}>
            <SakuraScene />
            {/* 使用简单的环境光代替 HDR 环境 */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <pointLight position={[-10, 5, -5]} intensity={0.3} color="#FFB6C1" />
            <ContactShadows
              position={[0, -0.1, 0]}
              opacity={0.5}
              scale={30}
              blur={2}
              far={10}
            />
          </Suspense>

          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            zoomSpeed={0.6}
            panSpeed={0.5}
            rotateSpeed={0.4}
            minDistance={5}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 2, 0]}
          />
        </Canvas>

        {/* 交互提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/40 backdrop-blur-sm px-6 py-3 rounded-full border border-pink-300/50">
          <p className="text-pink-900 text-sm flex items-center gap-2">
            <span>🖱️</span>
            <span>拖动旋转 | 滚轮缩放 | 右键平移</span>
          </p>
        </div>

        {/* 技术信息 */}
        <div className="absolute top-4 right-4 bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-pink-300/50">
          <div className="text-pink-900 text-xs space-y-2">
            <div className="font-semibold text-sm">🎨 技术细节</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span>🌳</span>
                <span>递归分支算法生成树结构</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🌸</span>
                <span>300+ 粒子落花系统</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💫</span>
                <span>实时风吹动画</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🌅</span>
                <span>动态环境光照</span>
              </div>
            </div>
          </div>
        </div>

        {/* 樱花飘落提示 */}
        <div className="absolute top-4 left-4 bg-gradient-to-r from-pink-500/30 to-orange-500/30 backdrop-blur-sm p-4 rounded-xl border border-pink-400/50">
          <div className="text-white text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-xl">🌸</span>
              <span>春日樱花</span>
            </div>
            <div className="text-xs text-pink-200">
              感受宁静的樱花树下
            </div>
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-pink-100/80 to-orange-100/80 backdrop-blur-sm border-t border-pink-200/50 py-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-pink-700">
          <div className="flex items-center gap-4">
            <span className="font-medium">Powered by</span>
            <span className="flex items-center gap-1">
              <span>⚛️</span> React Three Fiber
            </span>
            <span className="flex items-center gap-1">
              <span>🎨</span> Three.js
            </span>
            <span className="flex items-center gap-1">
              <span>✨</span> @react-three/drei
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>🌸</span>
            <span>程序化樱花树场景</span>
          </div>
        </div>
      </div>
    </div>
  );
}
