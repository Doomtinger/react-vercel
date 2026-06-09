'use client';

import React from 'react';

// UI 组件类型定义
export interface UINode {
  type: 'container' | 'text' | 'button' | 'input' | 'card' | 'list' | 'image' | 'chart' | 'table' | 'progress';
  props?: Record<string, any>;
  children?: UINode[];
  id?: string;
}

// 组件渲染器映射
const ComponentRenderers: Record<string, React.ComponentType<any>> = {
  container: ({ children, className = '', style = {} }: any) => (
    <div className={className} style={style}>{children}</div>
  ),

  text: ({ children, className = '', style = {} }: any) => (
    <p className={className} style={style}>{children}</p>
  ),

  button: ({ children, onClick, className = '', variant = 'primary' }: any) => {
    const variants = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
      success: 'bg-green-500 hover:bg-green-600 text-white',
    };

    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg transition-colors ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  },

  input: ({ placeholder, value, onChange, type = 'text', className = '' }: any) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  ),

  card: ({ title, children, className = '' }: any) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  ),

  list: ({ items, className = '' }: any) => (
    <ul className={`space-y-2 ${className}`}>
      {items?.map((item: any, index: number) => (
        <li key={index} className="flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ),

  image: ({ src, alt, className = '' }: any) => (
    <img src={src} alt={alt} className={`rounded-lg ${className}`} />
  ),

  chart: ({ data, type = 'bar', className = '' }: any) => {
    // 简化的图表渲染
    const maxValue = Math.max(...data.map((d: any) => d.value));

    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-3">
            <span className="w-24 text-sm">{item.label}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    );
  },

  table: ({ headers, rows, className = '' }: any) => (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {headers?.map((header: string, index: number) => (
              <th key={index} className="px-4 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row: any[], rowIndex: number) => (
            <tr key={rowIndex} className="border-b">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),

  progress: ({ value, max = 100, label, className = '' }: any) => (
    <div className={`space-y-1 ${className}`}>
      {label && <span className="text-sm">{label}</span>}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  ),
};

// 递归渲染 UI 节点
export function renderUINode(node: UINode, key: string = 'root'): React.ReactNode {
  if (!node) return null;

  const Renderer = ComponentRenderers[node.type];
  if (!Renderer) {
    console.warn(`Unknown UI node type: ${node.type}`);
    return null;
  }

  const children = node.children?.map((child, index) =>
    renderUINode(child, `${key}-${index}`)
  );

  return (
    <Renderer key={key} {...node.props}>
      {children}
    </Renderer>
  );
}

// 解析 AI 输出生成的 UI 描述
export function parseAIGeneratedUI(text: string): UINode | null {
  // 检测文本中是否包含 UI 生成标记
  const uiBlockMatch = text.match(/```ui\n([\s\S]*?)\n```/);

  if (!uiBlockMatch) return null;

  try {
    const uiSpec = JSON.parse(uiBlockMatch[1]);
    return uiSpec as UINode;
  } catch (error) {
    console.error('Failed to parse UI spec:', error);
    return null;
  }
}

// 生成式 UI 组件
export function GenerativeUI({ content }: { content: string }) {
  const uiNode = parseAIGeneratedUI(content);

  if (!uiNode) {
    // 如果没有检测到 UI 标记，显示普通文本
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p>{content}</p>
      </div>
    );
  }

  return (
    <div className="generative-ui-container">
      {renderUINode(uiNode)}
    </div>
  );
}

// 预设的 UI 模板
export const UITemplates = {
  welcome: {
    type: 'container',
    props: { className: 'space-y-4' },
    children: [
      {
        type: 'card',
        props: { title: '欢迎使用 AI 助手' },
        children: [
          {
            type: 'text',
            props: {
              className: 'text-gray-600',
              children: '我可以帮助您完成各种任务，包括回答问题、生成内容、创建UI等。'
            }
          }
        ]
      }
    ]
  },

  taskProgress: (steps: Array<{ name: string; status: 'completed' | 'pending' | 'running' }>) => ({
    type: 'card',
    props: { title: '任务进度' },
    children: [
      {
        type: 'list',
        props: {
          items: steps.map(step =>
            step.status === 'completed' ? `✓ ${step.name}` :
            step.status === 'running' ? `◐ ${step.name}` :
            `○ ${step.name}`
          )
        }
      }
    ]
  }),

  dataChart: (data: Array<{ label: string; value: number }>) => ({
    type: 'card',
    props: { title: '数据可视化' },
    children: [
      {
        type: 'chart',
        props: { data }
      }
    ]
  }),
};
