# Three.js Skills Index

这个项目现在包含了 **24个专业的Three.js skills** + 1个自定义skill，涵盖Three.js开发的各个方面。

## 🎯 可用的Three.js Skills

### 🔧 核心技能 (4个)
- **[threejs-core-scene-graph.md](threejs-core-scene-graph.md)** - Object3D层级、遍历、坐标转换、雾效、图层
- **[threejs-core-renderer.md](threejs-core-renderer.md)** - WebGLRenderer、色调映射、色彩管理、渲染目标
- **[threejs-core-math.md](threejs-core-math.md)** - Vector3、Matrix4、Quaternion、欧拉角、颜色、数学工具
- **[threejs-core-raycaster.md](threejs-core-raycaster.md)** - 鼠标拾取、悬停检测、InstancedMesh拾取

### 📝 语法技能 (5个)
- **[threejs-syntax-geometries.md](threejs-syntax-geometries.md)** - BufferGeometry、21种内置几何体、InstancedMesh
- **[threejs-syntax-materials.md](threejs-syntax-materials.md)** - 15+材质类型、PBR、纹理、色彩空间规则
- **[threejs-syntax-shaders.md](threejs-syntax-shaders.md)** - ShaderMaterial、GLSL、uniforms、ShaderChunk、onBeforeCompile
- **[threejs-syntax-loaders.md](threejs-syntax-loaders.md)** - GLTFLoader、DRACOLoader、KTX2Loader、TextureLoader
- **[threejs-syntax-controls.md](threejs-syntax-controls.md)** - OrbitControls、MapControls、FlyControls、TransformControls

### 🚀 实现技能 (10个)
- **[threejs-impl-lighting.md](threejs-impl-lighting.md)** - 7种光源类型、IBL、PMREMGenerator、HDR环境贴图
- **[threejs-impl-shadows.md](threejs-impl-shadows.md)** - 阴影映射、偏置调整、伪影诊断
- **[threejs-impl-animation.md](threejs-impl-animation.md)** - AnimationMixer、交叉渐变、GLTF骨骼动画
- **[threejs-impl-post-processing.md](threejs-impl-post-processing.md)** - EffectComposer、pmndrs/postprocessing、bloom、SSAO
- **[threejs-impl-physics.md](threejs-impl-physics.md)** - cannon-es和Rapier物理引擎集成
- **[threejs-impl-react-three-fiber.md](threejs-impl-react-three-fiber.md)** - R3F Canvas、hooks、JSX映射、事件系统
- **[threejs-impl-drei.md](threejs-impl-drei.md)** - 150+ Drei辅助组件
- **[threejs-impl-webgpu.md](threejs-impl-webgpu.md)** - WebGPURenderer、TSL、节点材质、计算着色器
- **[threejs-impl-ifc-viewer.md](threejs-impl-ifc-viewer.md)** - IFC/BIM加载、web-ifc、@thatopen/components
- **[threejs-impl-audio.md](threejs-impl-audio.md)** - 3D空间音频、AudioListener、PositionalAudio
- **[threejs-impl-xr.md](threejs-impl-xr.md)** - WebXR VR/AR、控制器、手部追踪、碰撞检测

### 🐛 调试技能 (2个)
- **[threejs-errors-performance.md](threejs-errors-performance.md)** - 内存泄漏、释放模式、绘制调用优化
- **[threejs-errors-rendering.md](threejs-errors-rendering.md)** - 黑屏、颜色错误、Z-fighting、阴影伪影

### 🤖 代理技能 (2个)
- **[threejs-agents-scene-builder.md](threejs-agents-scene-builder.md)** - 完整场景构建的决策树
- **[threejs-agents-model-optimizer.md](threejs-agents-model-optimizer.md)** - GLTF优化流程（Draco、KTX2、LOD）

### 📚 自定义技能 (1个)
- **[threejs-expert.md](threejs-expert.md)** - 通用Three.js专家知识（你之前创建的）

## 💡 如何使用这些Skills

### 方法1：直接提问
直接问Three.js相关的问题，Claude会自动应用相关的专业知识：

```bash
# 光照相关
"如何为我的Three.js场景添加真实的光照效果？"

# 材质相关  
"我想要一个发光的材质，应该用什么材质类型？"

# React Three Fiber相关
"如何在React Three Fiber中使用useFrame hook？"
```

### 方法2：指定特定技能
可以在提问时指定特定的skill：

```bash
"根据threejs-impl-lighting skill，帮我设置一个包含环境光和定向光的场景"
```

### 方法3：批量查询
可以一次性询问多个相关主题：

```bash
"我需要创建一个包含动画和后处理效果的Three.js场景，应该使用哪些skills？"
```

## 🎨 技能覆盖领域

- **3D场景构建**: 场景图、几何体、材质、光照
- **动画系统**: 关键帧动画、骨骼动画、粒子效果
- **后处理**: Bloom、SSAO、景深、色彩调整
- **性能优化**: 内存管理、绘制调用优化、LOD系统
- **React集成**: React Three Fiber、Drei组件
- **现代技术**: WebGPU、WebXR、物理引擎
- **调试**: 性能分析、渲染问题诊断

## 🔄 技能质量保证

所有24个skills都符合严格的质量要求：
- ✅ 每个skill < 500行（平均338行）
- ✅ 确定性语言（ALWAYS/NEVER，无模糊措辞）
- ✅ 完整的参考文档（methods.md、examples.md、anti-patterns.md）
- ✅ ES模块导入语法
- ✅ 版本明确（Three.js r160+、React Three Fiber 8.x）
- ✅ 每个skill独立工作

## 📚 版本信息

- **Three.js**: r160+
- **React Three Fiber**: 8.x+
- **Drei**: 最新版本
- **物理引擎**: cannon-es 0.20+, Rapier 0.12+
- **WebXR**: 最新版本

---

**安装日期**: 2026-07-28  
**来源**: [Three.js Claude Skill Package](https://github.com/OpenAEC-Foundation/Three.js-Claude-Skill-Package)  
**许可证**: MIT  
**作者**: OpenAEC Foundation