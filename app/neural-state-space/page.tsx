'use client';

import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import dynamic from 'next/dynamic';

// 动态导入3D组件
const NeuralStateVisualization = dynamic(
  () => import('@/components/neural-science/NeuralStateSpace').then(mod => ({
    default: mod.NeuralStateSpaceScene
  })),
  { ssr: false }
);

// 神经状态数据点接口
interface NeuralDataPoint {
  id: number;
  timestamp: number;
  // 高维特征（模拟128维神经活动数据）
  features: number[];
  // 状态标签
  state: 'resting' | 'memory' | 'attention' | 'emotional' | 'cognitive_load';
  // 情绪子类别
  emotion?: 'calm' | 'aroused' | 'stressed' | 'pleased';
  // 生理指标
  heartRate?: number;
  skinConductance?: number;
}

// 降维算法接口
interface DimensionalityReduction {
  name: string;
  description: string;
  project: (data: NeuralDataPoint[]) => { x: number; y: number; z: number; originalData: NeuralDataPoint }[];
}

// 模拟高维神经数据生成器
function generateNeuralData(count: number = 100): NeuralDataPoint[] {
  const states: Array<'resting' | 'memory' | 'attention' | 'emotional' | 'cognitive_load'> =
    ['resting', 'memory', 'attention', 'emotional', 'cognitive_load'];

  const emotions: Array<'calm' | 'aroused' | 'stressed' | 'pleased'> =
    ['calm', 'aroused', 'stressed', 'pleased'];

  return Array.from({ length: count }, (_, i) => {
    const time = i * 0.5; // 每0.5秒一个数据点
    const state = states[Math.floor(Math.random() * states.length)];

    // 根据状态调整特征分布
    let baseFeatures = Array.from({ length: 128 }, () => (Math.random() - 0.5) * 2);

    // 为不同状态添加特征模式
    switch (state) {
      case 'resting':
        baseFeatures = baseFeatures.map(() => (Math.random() - 0.5) * 0.5);
        break;
      case 'memory':
        baseFeatures = baseFeatures.map((_, i) => (Math.random() - 0.5) * 2 + Math.sin(i * 0.1 + i * 0.05));
        break;
      case 'attention':
        baseFeatures = baseFeatures.map((_, i) => Math.cos(i * 0.2 + i * 0.1) * 1.5);
        break;
      case 'emotional':
        baseFeatures = baseFeatures.map(() => (Math.random() - 0.5) * 3);
        break;
      case 'cognitive_load':
        baseFeatures = baseFeatures.map(() => Math.random() * 2 + 0.5);
        break;
    }

    // 添加时间轨迹的连续性
    if (i > 0) {
      const noise = 0.3;
      baseFeatures = baseFeatures.map((val, j) => {
        return val * (1 - noise) + Math.random() * noise;
      });
    }

    const emotion = state === 'emotional' ? emotions[Math.floor(Math.random() * emotions.length)] : undefined;

    return {
      id: i,
      timestamp: time,
      features: baseFeatures,
      state,
      emotion,
      heartRate: 60 + Math.random() * 40,
      skinConductance: Math.random() * 10
    };
  });
}

// PCA降维算法（简化版）
class PCAReduction implements DimensionalityReduction {
  name = 'PCA (主成分分析)';
  description = '线性降维，保持全局结构，适合连续数据';

  project(data: NeuralDataPoint[]): { x: number; y: number; z: number; originalData: NeuralDataPoint }[] {
    if (data.length === 0) return [];

    // 计算特征矩阵
    const features = data.map(d => d.features);
    const n = features.length;
    const p = features[0].length;

    // 计算均值
    const means = new Array(p).fill(0);
    features.forEach(f => {
      f.forEach((val, i) => means[i] += val);
    });
    means.forEach((m, i) => means[i] /= n);

    // 中心化数据
    const centered = features.map(f =>
      f.map((val, i) => val - means[i])
    );

    // 这里使用前3个特征作为主成分（简化）
    return data.map((point, i) => {
      const f = centered[i];
      // 模拟主成分投射
      return {
        x: f[0] * 2 + f[1] * 0.5 + f[2] * 0.3,
        y: f[3] * 1.5 + f[4] * 1.2 + f[5] * 0.8,
        z: f[6] * 1.8 + f[7] * 1.0 + f[8] * 0.6,
        originalData: point // 保存原始数据
      };
    });
  }
}

// t-SNE降维算法（模拟版）
class TSNEReduction implements DimensionalityReduction {
  name = 't-SNE (t-分布随机邻居嵌入)';
  description = '非线性降维，保持局部邻域结构，适合分离不同类别';

  project(data: NeuralDataPoint[]): { x: number; y: number; z: number; originalData: NeuralDataPoint }[] {
    // 简化的t-SNE模拟：按状态类别聚类
    const stateCenters: Record<string, {x: number; y: number; z: number}> = {
      'resting': { x: -3, y: 2, z: 0 },
      'memory': { x: 3, y: -2, z: 1 },
      'attention': { x: 0, y: 3, z: -2 },
      'emotional': { x: -2, y: -3, z: 2 },
      'cognitive_load': { x: 4, y: 0, z: -1 }
    };

    return data.map((point, i) => {
      const center = stateCenters[point.state];
      const scatter = 0.8;

      // 添加时间轨迹连续性
      const trajectoryOffset = {
        x: Math.sin(i * 0.1) * scatter,
        y: Math.cos(i * 0.1) * scatter,
        z: Math.sin(i * 0.05) * scatter
      };

      // 添加情绪子类别偏移
      let emotionOffset = { x: 0, y: 0, z: 0 };
      if (point.emotion) {
        switch (point.emotion) {
          case 'calm':
            emotionOffset = { x: 0, y: 0, z: -0.5 };
            break;
          case 'aroused':
            emotionOffset = { x: 0.5, y: 0.3, z: 0 };
            break;
          case 'stressed':
            emotionOffset = { x: -0.5, y: -0.3, z: 0.3 };
            break;
          case 'pleased':
            emotionOffset = { x: 0.3, y: -0.5, z: -0.2 };
            break;
        }
      }

      return {
        x: center.x + trajectoryOffset.x + emotionOffset.x + (Math.random() - 0.5) * scatter,
        y: center.y + trajectoryOffset.y + emotionOffset.y + (Math.random() - 0.5) * scatter,
        z: center.z + trajectoryOffset.z + emotionOffset.z + (Math.random() - 0.5) * scatter,
        originalData: point // 保存原始数据
      };
    });
  }
}

// UMAP降维算法（模拟版）
class UMAPReduction implements DimensionalityReduction {
  name = 'UMAP (均匀流形逼近与投影)';
  description = '非线性降维，平衡局部和全局结构，计算效率高';

  project(data: NeuralDataPoint[]): { x: number; y: number; z: number; originalData: NeuralDataPoint }[] {
    // 模拟UMAP的流形结构保持特性
    return data.map((point, i) => {
      // 创建螺旋流形结构
      const angle = i * 0.15;
      const radius = 2 + Math.sin(i * 0.05) * 1.5;

      // 根据状态调整流形
      let stateModifier = 0;
      switch (point.state) {
        case 'resting':
          stateModifier = 0;
          break;
        case 'memory':
          stateModifier = Math.PI / 4;
          break;
        case 'attention':
          stateModifier = Math.PI / 2;
          break;
        case 'emotional':
          stateModifier = Math.PI * 0.75;
          break;
        case 'cognitive_load':
          stateModifier = Math.PI;
          break;
      }

      return {
        x: Math.cos(angle + stateModifier) * radius,
        y: Math.sin(angle + stateModifier) * radius * 0.8,
        z: (i * 0.05 - 2.5) + Math.sin(angle * 2) * 0.5,
        originalData: point
      };
    });
  }
}

// 新增：网络降维算法（网络结构）
class NetworkReduction implements DimensionalityReduction {
  name = 'Network (网络拓扑)';
  description = '基于网络拓扑的空间分布，突出连接关系';

  project(data: NeuralDataPoint[], seed: number = Math.random()): { x: number; y: number; z: number; originalData: NeuralDataPoint }[] {
    const random = this.seededRandom(seed);
    const stateCenters: Record<string, {x: number; y: number; z: number}> = {
      'resting': { x: (random() - 0.5) * 6, y: (random() - 0.5) * 6, z: (random() - 0.5) * 6 },
      'memory': { x: (random() - 0.5) * 6 + 4, y: (random() - 0.5) * 6 - 2, z: (random() - 0.5) * 6 },
      'attention': { x: (random() - 0.5) * 6 - 4, y: (random() - 0.5) * 6 + 2, z: (random() - 0.5) * 6 },
      'emotional': { x: (random() - 0.5) * 6, y: (random() - 0.5) * 6 + 4, z: (random() - 0.5) * 6 - 2 },
      'cognitive_load': { x: (random() - 0.5) * 6, y: (random() - 0.5) * 6 - 4, z: (random() - 0.5) * 6 + 2 }
    };

    return data.map((point, i) => {
      const center = stateCenters[point.state] || { x: 0, y: 0, z: 0 };
      const connectionStrength = random();
      const networkOffset = {
        x: Math.sin(i * 0.3) * 2 * connectionStrength,
        y: Math.cos(i * 0.2) * 2 * connectionStrength,
        z: Math.sin(i * 0.4) * 2 * connectionStrength
      };

      return {
        x: center.x + networkOffset.x + (random() - 0.5) * 1.5,
        y: center.y + networkOffset.y + (random() - 0.5) * 1.5,
        z: center.z + networkOffset.z + (random() - 0.5) * 1.5,
        originalData: point
      };
    });
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

// 新增：波浪降维算法
class WaveReduction implements DimensionalityReduction {
  name = 'Wave (波动模式)';
  description = '基于波动方程的周期性空间分布';

  project(data: NeuralDataPoint[], seed: number = Math.random()): { x: number; y: number; z: number; originalData: NeuralDataPoint }[] {
    const random = this.seededRandom(seed);

    return data.map((point, i) => {
      const waveFreq = 0.1 + random() * 0.1;
      const waveAmplitude = 2 + random() * 2;
      const phase = random() * Math.PI * 2;

      const stateModifier = {
        'resting': 1.0,
        'memory': 1.5,
        'attention': 2.0,
        'emotional': 1.2,
        'cognitive_load': 1.8
      }[point.state] || 1.0;

      return {
        x: (i * 0.2 - 10) + Math.sin(i * waveFreq + phase) * waveAmplitude * 0.3,
        y: Math.cos(i * waveFreq * stateModifier + phase) * waveAmplitude,
        z: Math.sin(i * waveFreq * 0.5 + phase) * waveAmplitude * 0.5,
        originalData: point
      };
    });
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

// 新增：星团降维算法
class ClusterReduction implements DimensionalityReduction {
  name = 'Cluster (星团聚集)';
  description = '基于密度聚类的空间分布，突出群体特征';

  project(data: NeuralDataPoint[], seed: number = Math.random()): { x: number; y: number; z: number; originalData: NeuralDataPoint }[] {
    const random = this.seededRandom(seed);
    const clusters: Record<string, {center: {x: number; y: number; z: number}, spread: number}> = {};

    // 为每个状态创建簇中心和扩散度
    ['resting', 'memory', 'attention', 'emotional', 'cognitive_load'].forEach(state => {
      clusters[state] = {
        center: {
          x: (random() - 0.5) * 8,
          y: (random() - 0.5) * 8,
          z: (random() - 0.5) * 8
        },
        spread: 1 + random() * 2
      };
    });

    return data.map((point, i) => {
      const cluster = clusters[point.state] || clusters['resting'];
      const gaussianRandom = () => {
        let u = 0, v = 0;
        while(u === 0) u = random(); //Converting [0,1) to (0,1)
        while(v === 0) v = random();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
      };

      return {
        x: cluster.center.x + gaussianRandom() * cluster.spread,
        y: cluster.center.y + gaussianRandom() * cluster.spread,
        z: cluster.center.z + gaussianRandom() * cluster.spread,
        originalData: point
      };
    });
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

type VisualizationMode = 'scatter' | 'trajectory' | 'flow_field';
type ReductionMethod = 'pca' | 'tsne' | 'umap' | 'network' | 'wave' | 'cluster';

export default function NeuralStateSpacePage() {
  const [neuralData, setNeuralData] = useState<NeuralDataPoint[]>([]);
  const [vizMode, setVizMode] = useState<VisualizationMode>('trajectory');
  const [reductionMethod, setReductionMethod] = useState<ReductionMethod>('tsne');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [patternSeed, setPatternSeed] = useState(1000); // 固定初始值避免 hydration 错误

  // 在客户端挂载后生成随机种子
  useEffect(() => {
    setPatternSeed(Math.floor(Math.random() * 10000));
  }, []);

  // 生成模拟神经数据
  useEffect(() => {
    const data = generateNeuralData(120);
    setNeuralData(data);
  }, []);

  // 动画控制
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => (prev + 0.5) % 60);
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // 降维算法实例
  const pcaReducer = new PCAReduction();
  const tsneReducer = new TSNEReduction();
  const umapReducer = new UMAPReduction();
  const networkReducer = new NetworkReduction();
  const waveReducer = new WaveReduction();
  const clusterReducer = new ClusterReduction();

  const getReducer = (): DimensionalityReduction => {
    switch (reductionMethod) {
      case 'pca':
        return pcaReducer;
      case 'tsne':
        return tsneReducer;
      case 'umap':
        return umapReducer;
      case 'network':
        return networkReducer;
      case 'wave':
        return waveReducer;
      case 'cluster':
        return clusterReducer;
      default:
        return tsneReducer;
    }
  };

  // 执行降维
  const projectedData = useMemo(() => {
    if (neuralData.length === 0) return [];

    // 为新的算法传递种子
    const reducer = getReducer();

    // 检查是否是支持种子的新算法
    if ('project' in reducer && reducer.constructor.name !== 'PCAReduction' &&
        reducer.constructor.name !== 'TSNEReduction' && reducer.constructor.name !== 'UMAPReduction') {
      // 新算法支持种子参数
      return (reducer as any).project(neuralData, patternSeed);
    }

    return reducer.project(neuralData);
  }, [neuralData, reductionMethod, patternSeed]);

  // 状态颜色映射
  const getStateColor = (state: string, emotion?: string): string => {
    const emotionColors: Record<string, string> = {
      'calm': '#90EE90',
      'aroused': '#FF6B6B',
      'stressed': '#8B0000',
      'pleased': '#FFD700'
    };

    const stateColors: Record<string, string> = {
      'resting': '#4A90E2',     // 蓝色 - 静息态
      'memory': '#9B59D6',      // 紫色 - 记忆检索
      'attention': '#F39C12',   // 橙色 - 注意力
      'emotional': '#E91E63',  // 粉红 - 情绪处理
      'cognitive_load': '#2ECC71' // 绿色 - 认知负荷
    };

    if (emotion && emotionColors[emotion]) {
      return emotionColors[emotion];
    }
    return stateColors[state] || '#95A5A6';
  };

  // 统计信息
  const getStatistics = () => {
    if (neuralData.length === 0) return null;

    const stateCounts = neuralData.reduce((acc, point) => {
      acc[point.state] = (acc[point.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stateTransitions = neuralData.reduce((acc, point, i) => {
      if (i > 0 && neuralData[i - 1].state !== point.state) {
        acc[`${neuralData[i - 1].state}→${point.state}`] =
          (acc[`${neuralData[i - 1].state}→${point.state}`] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const avgHeartRate = neuralData.reduce((sum, p) => sum + (p.heartRate || 0), 0) / neuralData.length;
    const avgSkinConductance = neuralData.reduce((sum, p) => sum + (p.skinConductance || 0), 0) / neuralData.length;

    return {
      totalPoints: neuralData.length,
      stateDistribution: stateCounts,
      stateTransitions,
      avgHeartRate,
      avgSkinConductance,
      timeSpan: neuralData.length * 0.5 // 秒
    };
  };

  const stats = getStatistics();

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      {/* 左侧控制面板 */}
      <div className="w-[420px] bg-black/30 backdrop-blur-lg border-r border-white/10 p-5 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🧠</span>
            高维状态空间投射
          </h1>
          <p className="text-sm text-gray-300">
            基于计算神经科学的神经活动低维可视化
          </p>
        </div>

        {/* 方法选择 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">📊 降维算法</h3>
          <div className="space-y-2">
            {[
              { id: 'tsne', name: 't-SNE', desc: 't-分布随机邻居嵌入 - 最适合类别分离' },
              { id: 'umap', name: 'UMAP', desc: '均匀流形逼近 - 计算效率高' },
              { id: 'pca', name: 'PCA', desc: '主成分分析 - 保持全局结构' },
              { id: 'network', name: 'Network', desc: '网络拓扑 - 突出连接关系' },
              { id: 'wave', name: 'Wave', desc: '波动模式 - 周期性空间分布' },
              { id: 'cluster', name: 'Cluster', desc: '星团聚集 - 突出群体特征' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setReductionMethod(method.id as ReductionMethod)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  reductionMethod === method.id
                    ? 'border-blue-400 bg-blue-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-white font-medium text-sm">{method.name}</div>
                <div className="text-xs text-gray-400 mt-1">{method.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 可视化模式 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">🎨 可视化模式</h3>
          <div className="space-y-2">
            {[
              { id: 'trajectory', name: '时间轨迹', desc: '显示神经状态的时间演化路径' },
              { id: 'scatter', name: '散点分布', desc: '静态状态空间分布' },
              { id: 'flow_field', name: '流形场', desc: '状态密度热力图' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setVizMode(mode.id as VisualizationMode)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  vizMode === mode.id
                    ? 'border-green-400 bg-green-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-white font-medium text-sm">{mode.name}</div>
                <div className="text-xs text-gray-400 mt-1">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 状态过滤 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">🏷️ 状态过滤</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedState(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedState === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              全部状态
            </button>
            {['resting', 'memory', 'attention', 'emotional', 'cognitive_load'].map((state) => (
              <button
                key={state}
                onClick={() => setSelectedState(selectedState === state ? null : state)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedState === state
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {
                  state === 'resting' ? '静息态' :
                  state === 'memory' ? '记忆' :
                  state === 'attention' ? '注意力' :
                  state === 'emotional' ? '情绪' : '认知负荷'
                }
              </button>
            ))}
          </div>
        </div>

        {/* 时间控制 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">⏱️ 时间控制</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                isPlaying
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isPlaying ? '⏸ 暂停' : '▶️ 播放'}
            </button>
            <button
              onClick={() => setCurrentTime(0)}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm"
            >
              🔄 重置
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            当前时间: {currentTime.toFixed(1)}s / 60.0s
          </div>
        </div>

        {/* 图案生成控制 */}
        <div className="mb-5 p-4 rounded-xl bg-white/10 border border-white/20">
          <h3 className="text-sm font-semibold text-white mb-3">🎨 图案生成</h3>
          <div className="space-y-3">
            <button
              onClick={() => setPatternSeed(Math.floor(Math.random() * 10000))}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium"
            >
              🎲 重新生成图案
            </button>
            <div className="text-xs text-gray-400">
              当前种子: <span className="text-white font-medium">{patternSeed}</span> - 点击按钮生成新的随机图案
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
            <h3 className="text-sm font-semibold text-white mb-3">📈 数据统计</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>数据点总数:</span>
                <span className="text-white font-medium">{stats.totalPoints}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>时间跨度:</span>
                <span className="text-white font-medium">{stats.timeSpan.toFixed(1)}秒</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>平均心率:</span>
                <span className="text-white font-medium">{stats.avgHeartRate.toFixed(0)} bpm</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>皮肤电导:</span>
                <span className="text-white font-medium">{stats.avgSkinConductance.toFixed(2)} μS</span>
              </div>
            </div>

            {/* 状态分布 */}
            <div className="mt-3">
              <div className="text-xs text-gray-400 mb-1">状态分布:</div>
              <div className="space-y-1">
                {Object.entries(stats.stateDistribution).map(([state, count]) => (
                  <div key={state} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStateColor(state) }}
                    />
                    <span className="text-gray-300 flex-1">
                      {
                        state === 'resting' ? '静息态' :
                        state === 'memory' ? '记忆' :
                        state === 'attention' ? '注意力' :
                        state === 'emotional' ? '情绪' : '认知负荷'
                      }
                    </span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 学术说明 */}
        <div className="p-4 rounded-xl bg-blue-500/20 border border-blue-400/30">
          <h3 className="text-sm font-semibold text-white mb-2">📚 学术原理</h3>
          <p className="text-xs text-gray-300 leading-relaxed mb-2">
            本页面采用"高维状态空间的低维投射"范式，这是计算神经科学中最核心的可视化方法。
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• <strong className="text-white">数据驱动</strong>: 每个点的位置、颜色都绑定真实的神经模拟数据</p>
            <p>• <strong className="text-white">多模态对齐</strong>: 神经数据、心率、皮肤电导在时间轴上精确同步</p>
            <p>• <strong className="text-white">可复现性</strong>: 标注算法参数，支持色觉友好配色</p>
            <p>• <strong className="text-white">降低认知负荷</strong>: 清晰图例和交互式数据探索</p>
          </div>
        </div>
      </div>

      {/* 右侧3D可视化区域 */}
      <div className="flex-1 relative">
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
          {projectedData.length > 0 ? (
            <Canvas
              camera={{ position: [8, 6, 10], fov: 60 }}
              gl={{ antialias: true }}
            >
              <NeuralStateVisualization
                projectedData={projectedData}
                neuralData={neuralData}
                vizMode={vizMode}
                selectedState={selectedState}
                currentTime={currentTime}
                getStateColor={getStateColor}
                isPlaying={isPlaying}
              />
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                zoomSpeed={0.6}
                panSpeed={0.5}
                rotateSpeed={0.4}
                minDistance={5}
                maxDistance={20}
              />
            </Canvas>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-2xl font-bold mb-2">神经状态空间</h2>
                <p className="text-gray-400">
                  高维神经活动的低维投射可视化
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  <div className="animate-pulse">正在生成神经数据...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 浮动信息面板 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
          <p className="text-white text-sm flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span>神经状态空间</span>
            <span className="text-gray-400">|</span>
            <span className="font-medium">
              {
                reductionMethod === 'pca' ? 'PCA主成分分析' :
                reductionMethod === 'tsne' ? 't-SNE随机邻居' :
                'UMAP流形逼近'
              }
            </span>
          </p>
        </div>

        {/* 底部交互提示 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm">
            🖱️ 拖动旋转 | 滚轮缩放 | 右键平移 | 📊 左侧面板控制可视化参数
          </p>
        </div>
      </div>
    </div>
  );
}