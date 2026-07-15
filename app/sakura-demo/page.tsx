'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';

// 动态导入樱花场景组件
const SakuraScene = dynamic(
  () => import('@/components/cherry-blossom/SakuraScene').then(mod => ({ default: mod.SakuraScene })),
  { ssr: false }
);

export default function SakuraDemoPage() {
  const [petalCount, setPetalCount] = useState(300);
  const [treeCount, setTreeCount] = useState(3);
  const [windStrength, setWindStrength] = useState(1.0);

  return (
    <div className="h-screen flex bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50">
      {/* 控制面板 */}
      <div className="w-72 bg-white/40 backdrop-blur-lg border-r border-pink-200/50 p-5 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pink-800 mb-2 flex items-center gap-2">
            <span className="text-3xl">🌸</span>
            樱花树场景
          </h1>
          <p className="text-sm text-pink-600">
            程序化樱花树，带有飘落花瓣效果
          </p>
        </div>

        {/* 场景控制 */}
        <div className="mb-5 space-y-4">
          <div className="p-4 rounded-xl bg-white/30 border border-pink-300/30">
            <h3 className="text-sm font-semibold text-pink-800 mb-3">🎨 场景控制</h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-pink-700 mb-1">
                  <span>花瓣数量</span>
                  <span className="font-medium">{petalCount}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="500"
                  value={petalCount}
                  onChange={(e) => setPetalCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-pink-500 mt-1">
                  <span>稀疏</span>
                  <span>密集</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-pink-700 mb-1">
                  <span>树木数量</span>
                  <span className="font-medium">{treeCount} 棵</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={treeCount}
                  onChange={(e) => setTreeCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-pink-500 mt-1">
                  <span>1</span>
                  <span>5</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-pink-700 mb-1">
                  <span>风力强度</span>
                  <span className="font-medium">{windStrength.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={windStrength}
                  onChange={(e) => setWindStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-pink-500 mt-1">
                  <span>微风</span>
                  <span>强风</span>
                </div>
              </div>
            </div>
          </div>

          {/* 技术说明 */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-400/30">
            <h3 className="text-sm font-semibold text-pink-900 mb-2">🔧 技术特性</h3>
            <div className="text-xs text-pink-700 space-y-2">
              <div className="flex items-start gap-2">
                <span>🌳</span>
                <span><strong>递归算法：</strong>使用递归分形算法生成真实树枝结构</span>
              </div>
              <div className="flex items-start gap-2">
                <span>🌸</span>
                <span><strong>粒子系统：</strong>GPU加速的落花粒子效果</span>
              </div>
              <div className="flex items-start gap-2">
                <span>💫</span>
                <span><strong>实时动画：</strong>风吹摇曳的树枝和飘落花瓣</span>
              </div>
              <div className="flex items-start gap-2">
                <span>🎨</span>
                <span><strong>程序化颜色：</strong>每朵樱花都有独特的粉色调</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✨</span>
                <span><strong>动态光照：</strong>实时阴影和环境光遮蔽</span>
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="p-4 rounded-xl bg-white/30 border border-pink-300/30">
            <h3 className="text-sm font-semibold text-pink-800 mb-2">🎮 交互说明</h3>
            <div className="text-xs text-pink-700 space-y-1">
              <div>🖱️ <strong>左键拖拽：</strong>旋转视角</div>
              <div>🔍 <strong>滚轮滚动：</strong>缩放场景</div>
              <div>➡️ <strong>右键拖拽：</strong>平移视角</div>
            </div>
          </div>
        </div>

        {/* 链接 */}
        <div className="space-y-2">
          <a
            href="/sakura"
            className="block w-full text-center px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            查看完整樱花场景 →
          </a>
        </div>
      </div>

      {/* 3D 场景区域 */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [8, 6, 12], fov: 60 }}
          gl={{
            antialias: true,
            alpha: true
          }}
          shadows
        >
          <Suspense fallback={null}>
            <SakuraScene />
            <Sky
              distance={450000}
              sunPosition={[1, 0.4, 0]}
              inclination={0.6}
              azimuth={0.25}
              mieCoefficient={0.005}
              mieDirectionalG={0.8}
              rayleigh={0.5}
              turbidity={10}
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

        {/* 场景信息 */}
        <div className="absolute top-4 right-4 bg-white/40 backdrop-blur-sm p-3 rounded-xl border border-pink-300/50">
          <div className="text-pink-800 text-xs space-y-1">
            <div className="font-semibold">🌸 场景统计</div>
            <div>花瓣数量: {petalCount}</div>
            <div>树木数量: {treeCount} 棵</div>
            <div>风力强度: {windStrength.toFixed(1)}x</div>
          </div>
        </div>

        {/* 交互提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-300/50">
          <p className="text-pink-900 text-sm">
            🖱️ 拖动旋转 | 滚轮缩放 | 右键平移
          </p>
        </div>
      </div>
    </div>
  );
}
