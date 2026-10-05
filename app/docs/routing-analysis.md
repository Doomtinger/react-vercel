# 项目路由分析文档

> 本文档分析 `app/` 目录下的路由结构。本项目基于 **Next.js 16.2.6 + App Router**（文件式路由），React 19 + TypeScript。

## 1. 路由架构总览

- **路由范式**：App Router（基于文件系统的约定式路由），所有路由定义位于 `app/` 目录下。
- **根布局**：`app/layout.tsx` 是唯一的布局文件，作为所有页面的公共外壳（`html` / `body`），并注入 Google 字体（`Geist` / `Geist_Mono`）和全局 `metadata`。
- **布局层级**：仅存在根布局，**没有**任何嵌套 `layout.tsx`，也**没有**动态路由段（`[param]`）、路由分组（`(group)`）或并行/拦截路由（`@slot`、`(.)folder`）。
- **页面类型**：绝大多数页面为客户端组件（`'use client'`），依赖浏览器能力（Three.js / WebGL、摄像头、AI SDK 流式调用）。涉及 3D 渲染的页面普遍使用 `next/dynamic` 动态导入以避免 SSR 报错。
- **API 层**：`app/api/` 下为 Route Handlers（`route.ts`），提供模型对话、Agent、RAG 等后端能力。

## 2. 页面路由表（Page Routes）

| 路径 (Path) | 文件 | 类型 | 功能说明 |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | Client | 首页 AI Agent 聊天界面，支持多模型（智谱 / DeepSeek / 豆包 / Claude / GPT）切换与图片输入 |
| `/agent-demo` | `app/agent-demo/page.tsx` | Client | AI 生成 UI Demo（列表 / 图表 / 表格 / 信息卡片的 ```` ```ui JSON ```` 渲染） |
| `/flow-state` | `app/flow-state/page.tsx` | Client | "心流状态" 3D 可视化（React Three Fiber） |
| `/mental-universe` | `app/mental-universe/page.tsx` | Client | "心智宇宙" 3D 场景（动态导入 `MentalUniverse` 组件） |
| `/multimedia-demo` | `app/multimedia-demo/page.tsx` | Client | 多模态 Demo：图像生成 / 图像分析 / 语音识别 / 语音合成 |
| `/neural-state-space` | `app/neural-state-space/page.tsx` | Client | 神经状态空间 3D 可视化，含问卷驱动的参数生成 |
| `/multi-agent-demo` | `app/multi-agent-demo/page.tsx` | Client | 多 Agent 协作流程 / 任务编排 Demo |
| `/personality-test` | `app/personality-test/page.tsx` | Client | MBTI 性格测试（含描述 / 优势 / 职业建议映射） |
| `/psychology-3d` | `app/psychology-3d/page.tsx` | Client | 心理学 3D 情绪状态探索场景 |
| `/psychology-grid` | `app/psychology-grid/page.tsx` | Client | 心理学网格可视化 |
| `/rag-demo` | `app/rag-demo/page.tsx` | Client | RAG 检索增强生成 Demo（示例文档库 + 向量检索） |
| `/sakura-demo` | `app/sakura-demo/page.tsx` | Client | 樱花 3D 场景 Demo（`Sky`、`OrbitControls`） |
| `/sakura` | `app/sakura/page.tsx` | Client | 樱花场景（含 `Environment` / `ContactShadows`） |
| `/spiral-emotion` | `app/spiral-emotion/page.tsx` | Client | 螺旋情绪可视化（思维反刍 / 情绪引导） |
| `/test-3d` | `app/test-3d/page.tsx` | Client | 3D 渲染测试页（动态导入 `SimpleEmotionScene`） |
| `/test-cam` | `app/test-cam/page.tsx` | Client | 摄像头调用测试页（日志 / 流信息） |
| `/test-camera` | `app/test-camera/page.tsx` | Client | 摄像头调用测试页（状态机：idle/starting/running/error） |
| `/docs` | `app/docs/` | — | **当前仅含文档，无 `page.tsx`，尚不可访问为页面** |

> 共 17 个可访问页面路由 + 1 个文档目录（`/docs` 暂无页面）。

## 3. API 路由表（Route Handlers）

| 路径 (Path) | 方法 | 文件 | 说明 |
| --- | --- | --- | --- |
| `/api/chat` | `GET`, `POST` | `app/api/chat/route.ts` | 多模型文本流式对话。POST 接收 `{ messages, model }`，用 `ai` SDK 的 `streamText` 返回文本流；GET 返回可用模型列表与环境变量状态 |
| `/api/glm` | `POST` | `app/api/glm/route.ts` | 智谱 GLM 直连流式接口（SSE，`text/event-stream`）。支持图文多模态（自动切换 `glm-4v` 视觉模型）；由首页 `/` 的 GLM 分支调用 |
| `/api/chat-agent` | `GET`, `POST` | `app/api/chat-agent/route.ts` | 带工具调用的 Agent 对话。POST 接收 `{ messages, model, tools }`，`streamText` 设 `maxSteps: 10` 支持多步工具循环；GET 返回就绪状态与支持的模型 |
| `/api/test-env` | `GET` | `app/api/test-env/route.ts` | 环境变量检测接口，返回各 API Key 是否存在及含 API/KEY 的环境变量名 |

### 路由与页面的调用关系
- 首页 `/` 在 GLM 模型分支调用 `/api/glm`，其它模型分支经 AI SDK `useChat` 调用（默认 `/api/chat`，由 `body.model` 选择模型）。
- `/agent-demo`、`/multi-agent-demo` 等 Agent 类页面调用 `/api/chat-agent`。
- `/rag-demo` 使用 `lib/rag` 客户端逻辑（本地示例文档检索），未见独立 RAG API。
- `/multimedia-demo` 依赖 `lib/image-generation` 与 `lib/voice-ai`，调用对应厂商接口。

## 4. 关键特征与模式

1. **全量客户端组件**：几乎所有页面标记 `'use client'`，逻辑集中在浏览器端；根布局 `layout.tsx` 为服务端组件并导出 `metadata`。
2. **3D / WebGL 的 SSR 规避**：所有 Three.js 页面通过 `next/dynamic(() => import(...), { ssr: false })` 动态加载 3D 组件，避免服务端无 `window` 的报错。
3. **流式响应**：API 统一采用 `ReadableStream` / AI SDK `toTextStreamResponse()` 实现逐字输出；GLM 路由使用自定义 SSE 协议（`data: {...}\n\n` + `[DONE]`）。
4. **多模型抽象**：`/api/chat` 将各家模型（Anthropic / OpenAI / Google / Mistral / Cohere / xAI / DeepSeek / 豆包 / 智谱）统一封装在 `getModel(modelId)` 工厂中。
5. **环境变量驱动**：所有密钥均通过 `process.env` 读取（如 `GLM_API_KEY`、`ANTHROPIC_API_KEY` 等），缺省时回退 `'dummy'` 以避免初始化崩溃。

## 5. 如何新增路由

- **新增页面**：在 `app/` 下新建文件夹并添加 `page.tsx`（如 `app/about/page.tsx` → `/about`）。如需 3D 内容，请用 `dynamic(() => import(...), { ssr: false })` 包裹。
- **新增 API**：在 `app/api/<name>/route.ts` 中导出 `GET` / `POST` 等处理函数。
- **新增布局**：在目标路由目录下放 `layout.tsx` 即可形成嵌套布局（当前项目未使用）。

## 6. 小结

本项目是一个以 **AI 对话 + 3D 心理/神经可视化** 为主题的演示型应用，采用典型 App Router 扁平结构（无动态段 / 无嵌套布局），通过 17 个页面路由与 4 个 API 路由组织功能，3D 与流式能力是核心架构关注点。
