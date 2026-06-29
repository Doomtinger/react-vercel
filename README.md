# AI Agents 多功能演示系统

一个集成了多种AI能力的全栈应用，展示了生成式AI、多Agent协作、RAG检索增强生成、图像理解和语音处理等前沿技术。

## 🚀 功能概览

### 1. AI 对话系统
**路径**: `/`

**功能特性**:
- 多模型支持：GLM-4、DeepSeek、Claude、GPT、Gemini、豆包等
- 多模态输入：支持文本和图像
- 实时流式输出
- 模型切换和历史记录管理

**技术栈**: Next.js 16、React 19、AI SDK、Tailwind CSS

---

### 2. 生成式UI演示
**路径**: `/agent-demo`

**功能特性**:
- AI动态生成UI组件
- 支持10+种UI组件类型（Card、List、Chart、Table、Progress等）
- 实时渲染和交互
- JSON格式的UI描述语言

**支持的组件类型**:
- `container` - 容器组件
- `text` - 文本段落
- `button` - 按钮（多种样式）
- `input` - 输入框
- `card` - 卡片
- `list` - 列表
- `image` - 图片
- `chart` - 柱状图
- `table` - 表格
- `progress` - 进度条

**使用示例**:
```
输入: 创建一个销售数据图表，展示北京、上海、广州的销售额
输出: 自动生成包含数据的柱状图UI组件
```

---

### 3. WorkflowAgent + 多Agent协作
**路径**: `/multi-agent-demo`

**功能特性**:
- **工作流引擎**: 支持复杂的步骤编排和决策节点
- **多Agent协作**: 6个专业Agent协同完成任务
- **可视化监控**: 实时展示执行状态和Agent通信
- **消息追踪**: 完整的Agent间通信历史

**内置Agent角色**:
| Agent ID | 名称 | 角色 | 能力 |
|----------|------|------|------|
| coordinator | 协调者 | 任务分配和协调 | 任务分配、进度跟踪、结果汇总 |
| researcher | 研究员 | 信息收集 | 网络搜索、数据分析、报告生成 |
| analyst | 分析师 | 深度分析 | 逻辑推理、数据分析、趋势预测 |
| writer | 写作者 | 内容生成 | 文案写作、报告撰写、内容优化 |
| reviewer | 审核员 | 质量把控 | 质量检查、错误修正、改进建议 |
| creative | 创意师 | 创意生成 | 创意生成、方案设计、头脑风暴 |

**工作流模板**:
- 研究报告生成流程
- 内容创作协作流程
- 市场分析协作
- 产品发布策划

---

### 4. RAG检索增强生成
**路径**: `/rag-demo`

**功能特性**:
- **智能文档索引**: 支持3种分块策略
  - 按段落分块 (paragraph)
  - 按句子分块 (sentence)
  - 按字符分块 (character)
- **向量相似度搜索**: 余弦相似度算法
- **上下文构建**: 自动拼接检索结果
- **来源追踪**: 保留文档来源信息

**核心概念**:
- **嵌入向量**: 将文本转换为高维向量表示
- **文档分块**: 智能切分大文档
- **语义检索**: 基于向量相似度查找相关内容
- **上下文增强**: 为生成模型提供相关背景

**RAG流程**:
```
文档 → 分块 → 生成嵌入 → 向量存储
                     ↓
查询 → 生成嵌入 → 相似度搜索 → 构建上下文 → 生成答案
```

**示例文档库**:
- React 18新特性指南
- AI基础概念
- Web性能优化
- 微服务架构设计

---

### 5. 多媒体AI能力
**路径**: `/multimedia-demo`

**功能模块**:

#### 🖼️ 图像生成 (DALL-E 3 / Flux)
- 支持多种生成模型
- 可配置尺寸、质量、风格
- 批量生成功能
- 生成历史管理

#### 👁️ 图像理解 (Vision API)
- 对象检测（带置信度）
- 文字提取（OCR）
- 颜色分析
- 情绪/风格分析
- 自动标签生成

#### 🎙️ 语音识别 (Whisper)
- 实时录音转文字
- 多语言支持
- 词级时间戳
- 置信度评分
- 录音并转录一站式

#### 🔊 语音合成 (TTS / ElevenLabs)
- OpenAI TTS
- ElevenLabs语音
- 浏览器内置播放
- 可调节语速
- 多种输出格式

---

### 6. 心理学3D可视化
**路径**: `/psychology-3d`

**功能特性**:
- **情绪星球**: 6种基本情绪的3D球体可视化
- **心流状态**: 展示专注与创造的流动效果
- **压力山脉**: 可交互的压力水平调节
- **时间感知**: 时间相对性的动态展示

**技术栈**: React Three Fiber、Three.js、Drei

**情绪映射**:
- 😊 快乐 (Happy) - 黄色 #FFD93D
- 😌 平静 (Calm) - 绿色 #6BCB77
- 😢 悲伤 (Sad) - 蓝色 #4D96FF
- 🤩 兴奋 (Excited) - 红色 #FF6B6B
- 🧘 宁静 (Peaceful) - 紫色 #A78BFA
- ⚡ 活力 (Energetic) - 橙色 #F97316

**交互特性**:
- 🖱️ 鼠标拖动旋转场景
- 🔄 滚轮缩放视角
- ➡️ 右键平移视角
- 🎨 动态材质和粒子效果

---

## 🛠️ 技术栈

### 前端框架
- **Next.js 16.2.6** - React全栈框架
- **React 19.2.4** - UI库
- **TypeScript 5** - 类型安全

### AI SDK
- **@ai-sdk/react 3.0.193** - React AI集成
- **@ai-sdk/anthropic 3.0.79** - Claude API
- **@ai-sdk/openai 3.0.65** - OpenAI API
- **@ai-sdk/google 3.0.79** - Gemini API
- **zhipuai 2.0.0** - 智谱AI API

### 样式
- **Tailwind CSS 4** - 实用优先的CSS框架
- **Dark Mode** - 深色模式支持

### 开发工具
- **ESLint 9** - 代码检查
- **Turbopack** - 快速打包

---

## 📦 项目结构

```
├── app/
│   ├── page.tsx                    # 主页 - AI对话
│   ├── agent-demo/
│   │   └── page.tsx                # 生成式UI演示
│   ├── multi-agent-demo/
│   │   └── page.tsx                # 多Agent协作演示
│   ├── rag-demo/
│   │   └── page.tsx                # RAG检索演示
│   ├── multimedia-demo/
│   │   └── page.tsx                # 多媒体AI演示
│   └── api/
│       ├── chat/route.ts           # 聊天API
│       ├── chat-agent/route.ts     # Agent聊天API
│       └── glm/route.ts            # GLM API
├── lib/
│   ├── tool-loop-agent-v2.ts       # Agent基础框架
│   ├── workflow-agent.ts           # 工作流引擎
│   ├── multi-agent-system.ts       # 多Agent协作系统
│   ├── embeddings.ts               # 向量嵌入系统
│   ├── rag.ts                      # RAG检索系统
│   ├── image-generation.ts         # 图像AI系统
│   ├── voice-ai.ts                 # 语音AI系统
│   └── generative-ui.tsx           # UI渲染系统
└── package.json
```

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖
```bash
pnpm install
```

### 环境配置
创建 `.env.local` 文件并配置API密钥：

```bash
# GLM API (智谱AI)
# OpenAI API (可选，用于GPT模型)
OPENAI_API_KEY=your_openai_api_key
```

### 启动开发服务器
```bash
pnpm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 📱 访问路径速查

| 功能 | 路径 | 说明 |
|------|------|------|
| AI对话 | `/` | 多模型对话系统 |
| 生成式UI | `/agent-demo` | AI动态UI生成 |
| 多Agent协作 | `/multi-agent-demo` | 工作流+Agent协作 |
| RAG检索 | `/rag-demo` | 检索增强生成 |
| 多媒体AI | `/multimedia-demo` | 图像/语音处理 |
| 心理学3D | `/psychology-3d` | 心理学可视化 |

---

## 🎯 核心功能详解

### WorkflowAgent 工作流引擎
支持6种步骤类型的工作流编排：
- `start` - 开始节点
- `process` - 处理节点
- `decision` - 决策节点（支持条件分支）
- `agent` - Agent执行节点
- `merge` - 合并节点
- `end` - 结束节点

### MultiAgentSystem 多Agent协作
- **消息通信**: Agent间点对点或广播消息
- **任务依赖**: 支持任务间的依赖关系管理
- **状态追踪**: 实时监控Agent状态和任务进度
- **协作模式**: 6个专业Agent协同工作

### RAG向量检索
- **文档分块**: 智能切分文档（可选重叠）
- **向量嵌入**: 生成高维语义向量
- **相似度搜索**: 基于余弦相似度的语义检索
- **上下文增强**: 为生成模型提供精准背景

### 多媒体AI
- **图像生成**: DALL-E 3、Flux模型
- **图像理解**: 对象检测、OCR、颜色分析
- **语音识别**: Whisper多语言识别
- **语音合成**: OpenAI TTS、ElevenLabs

---

## 🔧 API端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/chat` | POST | 标准聊天API |
| `/api/chat-agent` | POST | Agent聊天API（支持工具调用） |
| `/api/glm` | POST | GLM专用API |
| `/api/test-env` | GET | 环境变量测试 |

---

## 📊 性能优化

- **流式输出**: 所有AI响应支持流式传输
- **状态管理**: 使用React Hooks优化状态更新
- **懒加载**: 按需加载AI模型和功能
- **缓存策略**: 向量嵌入缓存减少重复计算

---

## 🛡️ 安全性

- **API密钥隔离**: 使用环境变量管理密钥
- **输入验证**: 所有用户输入经过验证和清理
- **错误处理**: 完善的错误捕获和用户提示
- **速率限制**: 防止API滥用（可配置）

---

## 🌟 特性亮点

1. **全栈TypeScript**: 完整的类型安全
2. **模块化设计**: 独立的功能模块，易于扩展
3. **实时响应**: 流式AI输出和状态更新
4. **深色模式**: 完整的明暗主题支持
5. **响应式布局**: 适配各种屏幕尺寸
6. **可扩展架构**: 易于添加新的AI能力和模型

---

## 📈 扩展方向

- [ ] 添加更多AI模型支持
- [ ] 实现持久化存储（数据库）
- [ ] 添加用户认证系统
- [ ] 支持文件上传和管理
- [ ] 实现Agent Marketplace
- [ ] 添加API密钥管理界面
- [ ] 支持更多语言
- [ ] 添加使用统计和分析

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

## 📄 许可证

MIT License

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- GitHub Issues
- Email: your-email@example.com

---

**更新日期**: 2026-06-13

**版本**: 1.0.0
