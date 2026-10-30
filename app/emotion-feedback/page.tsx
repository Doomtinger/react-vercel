'use client';

/**
 * 情绪反馈 · MUST-03 标准化「情绪→图形→色彩→动态」映射
 *
 * - 相同文本多次生成，图形形态、色彩、动画完全一致（确定性映射）；
 * - 历史记录存储完整渲染参数与规则版本，规则迭代不回溯重绘（静默刷新）；
 * - 「规则说明」入口可查看映射表，并导出映射配置文档。
 */

import { useEffect, useState } from 'react';
import EmotionCanvas, { isFormRenderable } from '@/components/emotion-feedback/EmotionCanvas';
import {
  RULES_VERSION,
  analyzeEmotion,
  mapToShapeParams,
  buildInterpretation,
  buildRulesExport,
  safeCategoryRule,
  safeCategoryLabel,
  CATEGORY_RULES,
  INTENSITY_RULES,
  type EmotionSignal,
  type ShapeParams,
  type EmotionCategory,
  type IntensityLevel,
} from '@/components/emotion-feedback/mapping';

interface HistoryRecord {
  id: string;
  text: string;
  signal: EmotionSignal;
  params: ShapeParams;
  interpretation: string;
  version: string;
  createdAt: number;
}

const STORAGE_KEY = 'emotion-feedback-history-v1';

const presetExamples = [
  {
    label: '弥散低落 · 轻度（下沉云雾）',
    text: '最近有点提不起劲，心里闷闷的，做什么都没意思。',
  },
  {
    label: '思维反刍 · 重度（内收螺旋）',
    text: '这件事我反复想了无数遍，完全停不下来，感觉快被消耗空了。',
  },
  {
    label: '冲突拉扯 · 中度（交织双带）',
    text: '被误解了，特别委屈又愤怒，满肚子火没处说。',
  },
  {
    label: '麻木封闭 · 中度（固化团块）',
    text: '最近心里特别压抑，感觉空荡荡的，对什么都提不起兴趣。',
  },
  {
    label: '复合 · 反刍包裹低落（螺旋+云雾）',
    text: '这件事我反复想了好几天，心里又低落又疲惫，怎么都走不出来。',
  },
  {
    label: '兴奋激昂 · 中度（上升光尘）',
    text: '拿到 offer 了，特别兴奋，开心得想跳起来。',
  },
  {
    label: '弥散低落 · 中度（痛苦下沉）',
    text: '这段时间真的很痛苦，不知道怎么熬下去。',
  },
  {
    label: '平静松弛 · 轻度（兜底态）',
    text: '傍晚散步回来，心里平静了些，有点舒服。',
  },
];

const INTENSITY_COLOR: Record<IntensityLevel, string> = {
  light: 'text-emerald-400',
  medium: 'text-amber-400',
  heavy: 'text-rose-400',
};

export default function EmotionFeedbackPage() {
  const [inputText, setInputText] = useState('');
  const [current, setCurrent] = useState<HistoryRecord | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [softMode, setSoftMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 历史记录持久化（渲染只依赖存储的 params，规则迭代不影响旧图）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryRecord[];
        if (Array.isArray(parsed)) {
          setHistory(parsed);
          if (parsed.length > 0) setCurrent(parsed[0]);
        }
      }
    } catch {
      // 忽略本地存储读取失败
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // 忽略本地存储写入失败
    }
  }, [history, hydrated]);

  const handleAnalyze = () => {
    const text = inputText.trim();
    if (!text) return;

    const signal = analyzeEmotion(text);
    const params = mapToShapeParams(signal);
    const record: HistoryRecord = {
      id: `${Date.now()}`,
      text,
      signal,
      params,
      interpretation: buildInterpretation(signal),
      version: RULES_VERSION,
      createdAt: Date.now(),
    };
    setHistory((prev) => [record, ...prev].slice(0, 20));
    setCurrent(record);
  };

  const handlePresetSelect = (text: string) => {
    setInputText(text);
  };

  const handleExport = () => {
    const doc = buildRulesExport();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emotion-mapping-rules-${RULES_VERSION}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* 左侧控制面板 */}
      <aside className="w-[400px] shrink-0 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-2xl">🌫️</span>
            情绪反馈
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            描述你的感受，系统按固定映射规则生成稳定的图形、色彩与动画——同样的感受，呈现同样的图形。
          </p>
        </div>

        {/* 文本输入 */}
        <label className="text-sm font-semibold text-white mb-2 block">
          你现在的感受
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="写下关于内耗、低落、委屈或平静的话……"
          className="w-full h-32 p-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
        />
        <div className="text-xs text-gray-500 mt-1 mb-3">{inputText.length} 字符</div>

        <button
          onClick={handleAnalyze}
          disabled={!inputText.trim()}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <span>✨</span> 生成情绪图形
        </button>

        {/* 柔和模式 + 规则说明入口 */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setSoftMode((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              softMode
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-white/5 border-white/15 text-gray-400 hover:text-gray-200'
            }`}
          >
            🕊️ 柔和模式{softMode ? ' · 已关闭抖动' : '（关闭抖动）'}
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="text-xs text-gray-500 hover:text-indigo-300 underline underline-offset-2 transition-colors"
          >
            规则说明
          </button>
        </div>

        {/* 当前分析结果 */}
        {current && (
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3">📐 结构化参数</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
              <div className="text-gray-500">情绪大类</div>
              <div className="text-gray-200 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: current.params.colors[0] }}
                />
                {safeCategoryLabel(current.params.primary)}
              </div>
              <div className="text-gray-500">强度等级</div>
              <div className={`font-semibold ${INTENSITY_COLOR[current.params.intensity]}`}>
                {INTENSITY_RULES[current.params.intensity].label}
              </div>
              <div className="text-gray-500">思维反刍</div>
              <div className="text-gray-200">{current.signal.isRumination ? '是 · 循环反刍' : '否'}</div>
              <div className="text-gray-500">图形形态</div>
              <div className="text-gray-200">{safeCategoryRule(current.params.primary)?.formLabel ?? '历史形态'}</div>
              <div className="text-gray-500">规则版本</div>
              <div className="text-gray-200 font-mono">{current.version}</div>
            </div>

            {current.signal.compound.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1.5">复合情绪</div>
                <div className="flex flex-wrap gap-1.5">
                  {current.signal.compound.map((c) => {
                    const rule = safeCategoryRule(c);
                    return (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded-full text-xs border border-white/10 bg-white/5 text-gray-300 flex items-center gap-1.5"
                      >
                        {rule && (
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: rule.palette[current.params.intensity] }}
                          />
                        )}
                        {safeCategoryLabel(c)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {!current.signal.matched && (
              <p className="mt-3 text-xs text-gray-500">
                未命中情绪词，按默认规则渲染：平静松弛 · 轻度。
              </p>
            )}

            {current.signal.matchedKeywords.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1.5">命中关键词</div>
                <div className="flex flex-wrap gap-1.5">
                  {current.signal.matchedKeywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 rounded bg-white/10 text-xs text-gray-300">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 历史记录 */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            🗂️ 历史记录
            <span className="text-xs text-gray-500 font-normal">规则迭代不重绘旧图</span>
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-gray-500">暂无记录，生成后自动保存在本地。</p>
          ) : (
            <div className="space-y-2">
              {history.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => setCurrent(rec)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    current?.id === rec.id
                      ? 'bg-indigo-500/15 border-indigo-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: rec.params.colors[0] }}
                    />
                    <span className="text-xs text-gray-300">
                      {safeCategoryLabel(rec.params.primary)} ·{' '}
                      <span className={INTENSITY_COLOR[rec.params.intensity]}>
                        {INTENSITY_RULES[rec.params.intensity].label}
                      </span>
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-gray-500">{rec.version}</span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{rec.text}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 示例 */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-white mb-2">📝 示例（覆盖八类形态 + 复合）</h4>
          <div className="space-y-2">
            {presetExamples.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handlePresetSelect(ex.text)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
              >
                <div className="text-xs text-indigo-300 mb-1">{ex.label}</div>
                <div className="text-xs text-gray-400 group-hover:text-gray-200 line-clamp-2">{ex.text}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 右侧图形展示区：居中 · 无边框 · 低饱和底色 */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        {current ? (
          <>
            <div className="w-full max-w-[560px] relative">
              <div className="absolute -top-8 right-0 text-xs font-mono text-gray-500">
                映射规则 {current.version}
              </div>
              <div
                className="aspect-square w-full rounded-2xl overflow-hidden"
                style={{ backgroundColor: current.params.bgTint }}
              >
                <EmotionCanvas params={current.params} softMode={softMode} />
              </div>
            </div>

            {/* 历史记录兼容：旧版规则生成的已退役形态，保留参数但不重绘几何 */}
            {!isFormRenderable(current.params.form) && (
              <p className="w-full max-w-[560px] mt-3 text-xs text-amber-300/80">
                该记录由旧版映射规则（{current.version}）生成，其形态已退役——原始参数与色彩已保留，不再重绘几何。
              </p>
            )}

            {/* 隐喻解读（与映射规则绑定） */}
            <div className="w-full max-w-[560px] mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-1.5">🔍 图形解读</h3>
              <p className="text-xs text-gray-300 leading-relaxed">{current.interpretation}</p>
            </div>

            {/* 结构摘要 chips */}
            <div className="w-full max-w-[560px] mt-3 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300">
                形态：{safeCategoryRule(current.params.primary)?.formLabel ?? '历史形态'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300">
                圈数：{current.params.rings} · 强度：{INTENSITY_RULES[current.params.intensity].label}
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                色号：
                {current.params.colors.map((c) => (
                  <span key={c} className="flex items-center gap-1 font-mono">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: c }} />
                    {c}
                  </span>
                ))}
              </span>
              {softMode && (
                <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                  柔和模式 · 无抖动
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-center px-8">
            <div className="text-7xl mb-6 animate-pulse">🌫️</div>
            <h2 className="text-2xl font-bold text-white mb-3">情绪反馈</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
              在左侧写下你的感受，系统将按版本化映射规则，生成稳定的图形、色彩与动画。
              <br />
              同样的感受，同样的图形——不会随机乱出图。
            </p>
          </div>
        )}
      </main>

      {/* 规则说明弹窗 */}
      {showRules && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-slate-900 border border-white/15 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">映射规则说明（{RULES_VERSION}）</h2>
              <button
                onClick={() => setShowRules(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              情绪图形由参数驱动渲染，不使用随机生成。文本先经过确定性规则提取为结构化参数
              （情绪大类、强度、是否反刍、复合情绪），再查固定映射表得到形态、色彩与动画。
              同样的输入永远得到同样的图形。
            </p>

            {/* 基础形态：4 大类 + 平静兜底态 */}
            <h3 className="text-sm font-semibold text-white mb-2">基础形态（4 大类 + 扩展/兜底态）</h3>
            <div className="space-y-2 mb-5">
              {(Object.keys(CATEGORY_RULES) as EmotionCategory[]).map((cat) => {
                const rule = CATEGORY_RULES[cat];
                return (
                  <div key={cat} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {rule.palettePair ? (
                        // 冲突拉扯：悲伤蓝 + 躁动暗红 双色板
                        <span className="flex gap-1">
                          {(['light', 'medium', 'heavy'] as IntensityLevel[]).flatMap((lv) =>
                            rule.palettePair![lv].map((c) => (
                              <span
                                key={lv + c}
                                className="w-4 h-4 rounded-sm inline-block"
                                style={{ backgroundColor: c }}
                                title={`${INTENSITY_RULES[lv].label} ${c}`}
                              />
                            ))
                          )}
                        </span>
                      ) : (
                        <span className="flex gap-1">
                          {(['light', 'medium', 'heavy'] as IntensityLevel[]).map((lv) => (
                            <span
                              key={lv}
                              className="w-4 h-4 rounded-sm inline-block"
                              style={{ backgroundColor: rule.palette[lv] }}
                              title={`${INTENSITY_RULES[lv].label} ${rule.palette[lv]}`}
                            />
                          ))}
                        </span>
                      )}
                      <span className="text-sm text-white font-medium">{rule.label}</span>
                      {rule.isDefaultState && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">兜底态</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {rule.formLabel} · {rule.motion}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 复合情绪融合与版本化 */}
            <h3 className="text-sm font-semibold text-white mb-2">复合情绪融合与统一约束</h3>
            <ul className="text-xs text-gray-400 space-y-1.5 mb-5 list-disc list-inside">
              <li>多种情绪并存：主情绪作为主体几何体，次要情绪作为包裹流体/附属图层融合穿插，不再输出单一形态；</li>
              <li>高频组合：反刍+低落＝螺旋外围包裹下沉云雾；麻木+低落＝团块底部缠绕稀薄云雾；反刍+麻木＝外圈螺旋、内核固化团块；</li>
              <li>有冲突（尖角）时优先保留尖角特征；</li>
              <li>柔和模式：抹除全部尖角、关闭全部抖动（默认开启动画）；</li>
              <li>统一低饱和中性底色：暗色 #181922 / 亮色 #f6f7fa，不抢图形；单轮动画周期 3~6s，拒绝快节奏与频闪；</li>
              <li>每条图形记录绑定映射规则版本号；规则迭代后，历史记录保留生成当时的图形，不自动重绘；</li>
              <li>渲染为 SVG 矢量参数驱动，保证清晰度，禁止 AI 绘画随机生成。</li>
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-xs text-gray-500 font-mono">emotion-mapping-rules-{RULES_VERSION}.json</span>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-indigo-500/80 hover:bg-indigo-500 text-white text-sm transition-colors"
              >
                ⬇️ 导出映射配置文档
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
