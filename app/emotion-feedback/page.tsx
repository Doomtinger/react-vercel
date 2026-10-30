'use client';

/**
 * 情绪反馈 · MUST-03 标准化「情绪→图形→色彩→动态」映射
 *
 * - 相同文本多次生成，图形形态、色彩、动画完全一致（确定性映射）；
 * - 识别结果先预览，可手动微调主情绪/强度/次要情绪后再生成（人工调整标记 source=manual）；
 * - 高危拦截：文本含危机信号时阻断生成，直接展示心理援助热线；
 * - 呼吸交互：按住图形临时形变，不修改记录参数，松开恢复；动画速度档位，柔和模式锁定最慢；
 * - 触发/躯体标签仅作元数据；与上一条的变化提示只做中性描述，不评判好坏；
 * - 历史记录存储完整渲染参数与规则版本，规则迭代不回溯重绘（静默刷新）。
 *
 * 合规红线：不诊断、不做医疗判定、不做测谎、不做健康评分；觉察问句只提问不给答案。
 */

import { useEffect, useMemo, useState } from 'react';
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
  containsCrisisSignal,
  appendBodyNote,
  resolveLayerDocs,
  awarenessPrompts,
  flowNote,
  buildTransitionHint,
  TRIGGER_TAGS,
  BODY_TAGS,
  type EmotionSignal,
  type ShapeParams,
  type EmotionCategory,
  type IntensityLevel,
  type LayerDoc,
  type ResolvedLayerDoc,
} from '@/components/emotion-feedback/mapping';

interface HistoryRecord {
  id: string;
  text: string;
  signal: EmotionSignal;
  params: ShapeParams;
  interpretation: string;
  version: string;
  createdAt: number;
  source: 'auto' | 'manual'; // 人工微调过的参数标记为 manual
  triggerTags: string[]; // 触发类型标签（仅元数据，不参与形态判定）
  bodyTags: string[]; // 躯体感受标签（仅元数据，解读中温和引用）
  transitionHint?: string; // 与上一条记录的中性变化提示
  layerDocs?: ResolvedLayerDoc[]; // 分层释义版本快照（旧记录无此字段时按当前规则实时解析）
  layerViewed?: boolean; // 仅记录是否点击过分层（不收集反馈、不做情绪判断）
}

const STORAGE_KEY = 'emotion-feedback-history-v1';
const SETTINGS_KEY = 'emotion-feedback-settings-v1';
const INTENSITY_ORDER: IntensityLevel[] = ['light', 'medium', 'heavy'];

/** 历史记录兼容：旧版本记录缺少 v1.4/v1.5 字段时补默认值，不崩溃、不重绘 */
function normalizeRecord(r: HistoryRecord): HistoryRecord {
  return {
    ...r,
    source: r.source === 'manual' ? 'manual' : 'auto',
    triggerTags: Array.isArray(r.triggerTags) ? r.triggerTags : [],
    bodyTags: Array.isArray(r.bodyTags) ? r.bodyTags : [],
    transitionHint: typeof r.transitionHint === 'string' ? r.transitionHint : undefined,
    layerDocs: Array.isArray(r.layerDocs) ? r.layerDocs : undefined,
    layerViewed: typeof r.layerViewed === 'boolean' ? r.layerViewed : false,
  };
}

const SPEED_STEPS: { label: string; value: number }[] = [
  { label: '慢', value: 0.5 },
  { label: '标准', value: 1 },
  { label: '快', value: 1.6 },
];

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

/** 标签开关 */
function toggleIn<T>(list: T[], tag: T): T[] {
  return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
}

export default function EmotionFeedbackPage() {
  const [inputText, setInputText] = useState('');
  const [current, setCurrent] = useState<HistoryRecord | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [softMode, setSoftMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // P0 识别预览 + 手动微调
  const [preview, setPreview] = useState<{ text: string; signal: EmotionSignal } | null>(null);
  const [adjPrimary, setAdjPrimary] = useState<EmotionCategory>('calm');
  const [adjIntensity, setAdjIntensity] = useState<IntensityLevel>('medium');
  const [adjCompound, setAdjCompound] = useState<EmotionCategory[]>([]);

  // P2 元数据标签
  const [selTriggers, setSelTriggers] = useState<string[]>([]);
  const [selBodies, setSelBodies] = useState<string[]>([]);

  // P1 交互
  const [crisis, setCrisis] = useState(false);
  const [held, setHeld] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5 慢 / 1 标准 / 1.6 快
  const [bubble, setBubble] = useState<LayerDoc | null>(null); // 分层释义气泡，用户主动点击才出现
  const [showPrompts, setShowPrompts] = useState(false);

  // 全局开关（个人设置）
  const [layerDocsOn, setLayerDocsOn] = useState(true);
  const [promptsOn, setPromptsOn] = useState(true);

  const effSpeed = softMode ? 0.5 : speed; // 柔和模式锁定最慢

  // 历史记录持久化（渲染只依赖存储的 params，规则迭代不影响旧图）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryRecord[];
        if (Array.isArray(parsed)) {
          const records = parsed.filter((r) => r && r.params && r.signal).map(normalizeRecord);
          setHistory(records);
          if (records.length > 0) setCurrent(records[0]);
        }
      }
    } catch {
      // 忽略本地存储读取失败
    }
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as { layerDocsOn?: boolean; promptsOn?: boolean };
        if (typeof parsed.layerDocsOn === 'boolean') setLayerDocsOn(parsed.layerDocsOn);
        if (typeof parsed.promptsOn === 'boolean') setPromptsOn(parsed.promptsOn);
      }
    } catch {
      // 忽略设置读取失败
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ layerDocsOn, promptsOn }));
    } catch {
      // 忽略设置写入失败
    }
  }, [layerDocsOn, promptsOn, hydrated]);

  /** 识别（P0 第一步）：高危拦截优先级最高，阻断生成、不写入历史 */
  const handleRecognize = () => {
    const text = inputText.trim();
    if (!text) return;
    if (containsCrisisSignal(text)) {
      setCrisis(true);
      setPreview(null);
      return;
    }
    setCrisis(false);
    const signal = analyzeEmotion(text);
    setAdjPrimary(signal.primary);
    setAdjIntensity(signal.intensity);
    setAdjCompound(signal.compound);
    setPreview({ text, signal });
  };

  /** 微调后的信号（柔和模式全局降级：拉扯尖角 → 反刍螺旋） */
  const adjustedSignal = useMemo<EmotionSignal | null>(() => {
    if (!preview) return null;
    const primary = softMode && adjPrimary === 'conflict' ? 'rumination' : adjPrimary;
    const compound = adjCompound.filter((c) => c !== primary);
    const reshaped =
      primary !== preview.signal.primary ||
      compound.length !== preview.signal.compound.length ||
      compound.some((c, i) => preview.signal.compound[i] !== c);
    return {
      ...preview.signal,
      primary,
      compound,
      intensity: adjIntensity,
      // 只有主/次情绪被调整时才重算反刍标记；仅调强度时保留自动识别值
      isRumination: reshaped
        ? primary === 'rumination' || compound.includes('rumination')
        : preview.signal.isRumination,
    };
  }, [preview, adjPrimary, adjIntensity, adjCompound, softMode]);

  const previewParams = useMemo<ShapeParams | null>(
    () => (adjustedSignal ? mapToShapeParams(adjustedSignal) : null),
    [adjustedSignal]
  );
  const previewInterpretation = useMemo(
    () => (adjustedSignal ? buildInterpretation(adjustedSignal) : ''),
    [adjustedSignal]
  );
  /** 微调参数与自动识别不一致 → 人工调整记录 */
  const isManual = useMemo(() => {
    if (!preview || !adjustedSignal) return false;
    return (
      adjustedSignal.primary !== preview.signal.primary ||
      adjustedSignal.intensity !== preview.signal.intensity ||
      adjustedSignal.compound.length !== preview.signal.compound.length ||
      adjustedSignal.compound.some((c, i) => preview.signal.compound[i] !== c)
    );
  }, [preview, adjustedSignal]);

  /** 分层释义：优先用记录内版本快照（旧记录沿用当时文案），否则按当前规则实时解析 */
  const activeLayerDocs = useMemo<ResolvedLayerDoc[]>(() => {
    if (!current) return [];
    if (Array.isArray(current.layerDocs) && current.layerDocs.length > 0) return current.layerDocs;
    return resolveLayerDocs(current.params);
  }, [current]);

  const hotspotLayers = useMemo(
    () => (layerDocsOn ? activeLayerDocs.map((d) => d.layerIndex) : []),
    [layerDocsOn, activeLayerDocs]
  );

  /** 点击热区 → 展示气泡 + 静默记录「是否点击过分层」（不收集反馈、不做情绪判断） */
  const handleLayerSelect = (layerIndex: number) => {
    const doc = activeLayerDocs.find((d) => d.layerIndex === layerIndex);
    if (!doc || !current) return;
    setBubble({ key: doc.key, title: doc.title, text: doc.text });
    if (!current.layerViewed) {
      const updated = { ...current, layerViewed: true };
      setCurrent(updated);
      setHistory((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  /** 觉察问句：实时按当前图形规则渲染（柔和模式自动切柔和版）；默认版多条时按图形种子确定性轮换 1 条 */
  const activePrompt = useMemo(() => {
    if (!current) return '';
    const list = awarenessPrompts(current.params.primary, softMode, current.params.compound);
    if (list.length === 0) return '';
    return list[current.params.seed % list.length];
  }, [current, softMode]);

  const commitRecord = (text: string, signal: EmotionSignal, source: 'auto' | 'manual') => {
    const params = mapToShapeParams(signal);
    let interpretation = buildInterpretation(signal);
    if (selBodies.length > 0) {
      interpretation = appendBodyNote(interpretation, selBodies); // 躯体感受温和引用
    }
    const prev = history[0];
    const transitionHint = prev
      ? buildTransitionHint(
          { primary: prev.params.primary, intensity: prev.params.intensity },
          { primary: params.primary, intensity: params.intensity }
        )
      : undefined;
    const record: HistoryRecord = {
      id: `${Date.now()}`,
      text,
      signal,
      params,
      interpretation,
      version: RULES_VERSION,
      createdAt: Date.now(),
      source,
      triggerTags: selTriggers,
      bodyTags: selBodies,
      transitionHint,
      // 分层释义版本快照：手动微调后跟随新图形结构，旧记录不受后续模板迭代影响
      layerDocs: resolveLayerDocs({ primary: params.primary, compound: params.compound, form: params.form }),
      layerViewed: false,
    };
    setHistory((p) => [record, ...p].slice(0, 20));
    setCurrent(record);
    setPreview(null);
    setBubble(null);
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

  const selectValue = softMode && adjPrimary === 'conflict' ? 'rumination' : adjPrimary;

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
            识别结果可以先预览、手动修正，再生成。
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

        {/* P2 触发类型标签（仅元数据） */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1.5">🏷️ 触发类型（可选标签 · 不影响图形）</div>
          <div className="flex flex-wrap gap-1.5">
            {TRIGGER_TAGS.map((t) => {
              const on = selTriggers.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setSelTriggers(toggleIn(selTriggers, t))}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    on
                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                      : 'bg-white/5 border-white/15 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* P2 躯体感受标签 */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1.5">🫀 躯体感受（勾选后在解读中温和提及）</div>
          <div className="flex flex-wrap gap-1.5">
            {BODY_TAGS.map((t) => {
              const on = selBodies.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setSelBodies(toggleIn(selBodies, t))}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    on
                      ? 'bg-rose-400/15 border-rose-300/40 text-rose-300'
                      : 'bg-white/5 border-white/15 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleRecognize}
          disabled={!inputText.trim()}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <span>🔍</span> 识别情绪
        </button>

        {/* 高危拦截：不生成图形、不写入记录 */}
        {crisis && (
          <div className="mt-4 p-4 rounded-xl border border-rose-400/40 bg-rose-500/10">
            <h3 className="text-sm font-semibold text-rose-200 mb-2">🫂 先停一停，图形不重要</h3>
            <p className="text-xs text-rose-100/80 leading-relaxed mb-3">
              你刚才的描述里，可能有处在危机中的信号。这一页已经暂停生成，也不会把这段话存进历史记录。
              你不需要马上做任何分析，先照顾自己。
            </p>
            <p className="text-xs text-white font-semibold">
              全国心理援助热线：<span className="font-mono text-base">12356</span>（24 小时）
            </p>
            <p className="text-xs text-gray-400 mt-1">
              如果此刻有紧急危险，请直接拨打 120 或 110。
            </p>
            <button
              onClick={() => setCrisis(false)}
              className="mt-3 text-xs text-rose-300 hover:text-rose-200 underline underline-offset-2"
            >
              返回编辑
            </button>
          </div>
        )}

        {/* P0 识别结果预览 + 手动微调面板 */}
        {preview && adjustedSignal && previewParams && (
          <div className="mt-4 p-4 rounded-xl border border-indigo-400/30 bg-indigo-500/10">
            <h3 className="text-sm font-semibold text-white mb-2">🔍 识别结果预览</h3>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              识别到：主情绪【{safeCategoryLabel(adjustedSignal.primary)}】｜强度【
              {INTENSITY_RULES[adjustedSignal.intensity].label}】
              {adjustedSignal.compound.length > 0 && (
                <>
                  ｜次要情绪【{adjustedSignal.compound.map((c) => safeCategoryLabel(c)).join('、')}】
                </>
              )}
            </p>

            <div className="flex gap-3">
              {/* 实时预览小图 */}
              <div
                className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-white/10"
                style={{ backgroundColor: previewParams.bgTint }}
              >
                <EmotionCanvas params={previewParams} softMode={softMode} />
              </div>

              <div className="flex-1 space-y-2.5">
                {/* 主情绪下拉 */}
                <label className="block">
                  <span className="text-[10px] text-gray-400 block mb-1">主情绪</span>
                  <select
                    value={selectValue}
                    onChange={(e) => setAdjPrimary(e.target.value as EmotionCategory)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
                  >
                    {(Object.keys(CATEGORY_RULES) as EmotionCategory[]).map((cat) => (
                      <option key={cat} value={cat} disabled={softMode && cat === 'conflict'}>
                        {safeCategoryLabel(cat)}
                        {softMode && cat === 'conflict' ? '（柔和模式下已降级）' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 强度滑条 Ⅰ/Ⅱ/Ⅲ */}
                <label className="block">
                  <span className="text-[10px] text-gray-400 block mb-1">
                    强度{' '}
                    <span className={INTENSITY_COLOR[adjustedSignal.intensity]}>
                      {INTENSITY_RULES[adjustedSignal.intensity].label}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={INTENSITY_ORDER.indexOf(adjustedSignal.intensity)}
                    onChange={(e) => setAdjIntensity(INTENSITY_ORDER[Number(e.target.value)])}
                    className="w-full accent-indigo-400"
                  />
                </label>

                {/* 次要情绪开关 */}
                {preview.signal.compound.length > 0 && (
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-1">次要情绪</span>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.signal.compound.map((c) => {
                        const on = adjustedSignal.compound.includes(c);
                        return (
                          <button
                            key={c}
                            onClick={() => setAdjCompound(toggleIn(adjCompound, c))}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                              on
                                ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                                : 'bg-white/5 border-white/15 text-gray-500 line-through'
                            }`}
                          >
                            {safeCategoryLabel(c)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {softMode && adjPrimary === 'conflict' && (
              <p className="mt-2 text-[10px] text-amber-300/80">
                柔和模式：拉扯尖角已降级为反刍螺旋（无尖角）。
              </p>
            )}
            {isManual && (
              <p className="mt-2 text-[10px] text-amber-300/80">
                已手动调整——这条记录将标记为「人工」，与自动识别区分。
              </p>
            )}
            <p className="mt-2 text-[10px] text-gray-500">
              识别基于固定关键词规则，不是心理评估；一切都可以手动修正。
              {previewInterpretation ? '' : ''}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => commitRecord(preview.text, adjustedSignal, isManual ? 'manual' : 'auto')}
                className="py-2 rounded-lg bg-indigo-500/80 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                ✔️ 确认生成
              </button>
              <button
                onClick={() => commitRecord(preview.text, preview.signal, 'auto')}
                className="py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-xs transition-colors"
              >
                直接生成，不调整
              </button>
              <button
                onClick={() => setPreview(null)}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors"
              >
                ← 返回编辑
              </button>
            </div>
          </div>
        )}

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

        {/* 个人设置：全局开关（关闭后对应能力完全无响应/不展示） */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">个人设置</span>
          <button
            onClick={() => {
              setLayerDocsOn((v) => !v);
              setBubble(null);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              layerDocsOn
                ? 'bg-purple-500/15 border-purple-400/30 text-purple-300'
                : 'bg-white/5 border-white/15 text-gray-500'
            }`}
          >
            🫧 图形分层释义{layerDocsOn ? ' · 开' : ' · 关'}
          </button>
          <button
            onClick={() => {
              setPromptsOn((v) => !v);
              setShowPrompts(false);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              promptsOn
                ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                : 'bg-white/5 border-white/15 text-gray-500'
            }`}
          >
            💭 觉察问句{promptsOn ? ' · 开' : ' · 关'}
          </button>
        </div>

        {/* 当前记录的结构化参数 */}
        {current && (
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              📐 结构化参数
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  current.source === 'manual'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-white/10 text-gray-500'
                }`}
              >
                {current.source === 'manual' ? '人工调整' : '自动识别'}
              </span>
            </h3>
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
                  onClick={() => {
                    setCurrent(rec);
                    setBubble(null);
                  }}
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
                    <span className="ml-auto flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          rec.source === 'manual'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/10 text-gray-500'
                        }`}
                      >
                        {rec.source === 'manual' ? '人工' : '自动'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">{rec.version}</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{rec.text}</p>
                  {(rec.triggerTags.length > 0 || rec.bodyTags.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {rec.triggerTags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300/80">
                          🏷️ {t}
                        </span>
                      ))}
                      {rec.bodyTags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-400/10 text-rose-300/80">
                          🫀 {t}
                        </span>
                      ))}
                    </div>
                  )}
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

      {/* 右侧图形展示区：居中 · 无边框 · 低饱和底色
          滚动在外层、居中在内层 min-h-full 容器：内容超高时可完整滚动，
          避免 flex justify-center 溢出裁掉顶部内容 */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-8">
        {current ? (
          <>
            {/* P1 速度档位 + 呼吸交互提示 */}
            <div className="w-full max-w-[560px] mb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">动画速度</span>
                <div className="flex rounded-lg overflow-hidden border border-white/10">
                  {SPEED_STEPS.map((s) => (
                    <button
                      key={s.label}
                      disabled={softMode}
                      onClick={() => setSpeed(s.value)}
                      className={`px-3 py-1 text-xs transition-colors ${
                        softMode
                          ? 'cursor-not-allowed text-gray-600'
                          : speed === s.value
                            ? 'bg-indigo-500/30 text-white'
                            : 'bg-white/5 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {softMode && <span className="text-[10px] text-emerald-300/80">柔和模式 · 锁定最慢</span>}
              </div>
              <span className="text-[10px] text-gray-500">按住图形 · 临时形变 · 松开恢复 · 不保存</span>
            </div>

            <div className="w-full max-w-[560px]">
              <div
                className="relative aspect-square w-full rounded-2xl overflow-hidden select-none"
                style={{ backgroundColor: current.params.bgTint, touchAction: 'none' }}
                onClick={() => setBubble(null)} // 点击空白收起气泡
                onPointerDown={(e) => {
                  e.preventDefault();
                  setHeld(true);
                }}
                onPointerUp={() => setHeld(false)}
                onPointerLeave={() => setHeld(false)}
                onPointerCancel={() => setHeld(false)}
              >
                <EmotionCanvas
                  params={current.params}
                  softMode={softMode}
                  held={held}
                  speed={effSpeed}
                  hotspotLayers={hotspotLayers}
                  onLayerClick={layerDocsOn ? handleLayerSelect : undefined}
                />
                {/* 分层释义气泡：图形侧边轻量卡片（圆角低灰度、文字小于主解读），切换热区自动替换 */}
                {bubble && layerDocsOn && (
                  <div
                    className="absolute left-3 top-3 w-[230px] p-3 rounded-xl bg-slate-800/90 border border-white/10 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-200">{bubble.title}</span>
                      <button
                        onClick={() => setBubble(null)}
                        className="text-gray-500 hover:text-gray-300 text-sm leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{bubble.text}</p>
                    <p className="text-[9px] text-gray-600 mt-1.5">图形结构的隐喻说明，不代表任何诊断或评判。</p>
                  </div>
                )}
              </div>
              {/* 版本号走常规流放在画布下方右对齐，不再负偏移压住上方提示文字 */}
              <div className="mt-2 text-right text-xs font-mono text-gray-500">
                映射规则 {current.version}
              </div>
            </div>

            {/* 历史记录兼容：旧版规则生成的已退役形态，保留参数但不重绘几何 */}
            {!isFormRenderable(current.params.form) && (
              <p className="w-full max-w-[560px] mt-3 text-xs text-amber-300/80">
                该记录由旧版映射规则（{current.version}）生成，其形态已退役——原始参数与色彩已保留，不再重绘几何。
              </p>
            )}

            {/* 隐喻解读（与映射规则绑定）+ 情绪流动注解 */}
            <div className="w-full max-w-[560px] mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-1.5">🔍 图形解读</h3>
              <p className="text-xs text-gray-300 leading-relaxed">{current.interpretation}</p>
              <p className="text-[11px] text-slate-400/80 mt-2.5 leading-relaxed">
                🌊 {flowNote(current.params.primary)}——情绪是流动的过程，不是固定标签。
              </p>
            </div>

            {/* P2 与上一条记录的中性变化提示（只做形态对比，不评判好坏） */}
            {current.transitionHint && (
              <div className="w-full max-w-[560px] mt-3">
                <span className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300 inline-flex items-center gap-1.5">
                  ↔ 与上一条：{current.transitionHint}
                  <span className="text-gray-500">（中性描述 · 无好坏评判）</span>
                </span>
              </div>
            )}

            {/* P2 元数据标签回显 */}
            {(current.triggerTags.length > 0 || current.bodyTags.length > 0) && (
              <div className="w-full max-w-[560px] mt-3 flex flex-wrap gap-2">
                {current.triggerTags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-xs bg-sky-500/10 border border-sky-400/20 text-sky-300"
                  >
                    🏷️ 触发：{t}
                  </span>
                ))}
                {current.bodyTags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-xs bg-rose-400/10 border border-rose-300/20 text-rose-300"
                  >
                    🫀 躯体：{t}
                  </span>
                ))}
              </div>
            )}

            {/* P1-02 觉察引导问句：默认收起，仅一行浅灰小字入口；全局开关关闭时不出现 */}
            {promptsOn && activePrompt && (
              <div className="w-full max-w-[560px] mt-3">
                <button
                  onClick={() => setShowPrompts((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPrompts ? '收起' : '查看觉察问句'}
                </button>
                {showPrompts && (
                  <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-400 leading-relaxed">{activePrompt}</p>
                    <p className="text-[10px] text-gray-600 mt-2">
                      问句只用于自我觉察：不需要回答、没有输入框，也不会被保存或分析。
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 结构摘要 chips */}
            <div className="w-full max-w-[560px] mt-3 mb-2 flex flex-wrap gap-2">
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
              在左侧写下你的感受，系统先识别、你确认或微调，再按版本化映射规则生成稳定的图形、色彩与动画。
              <br />
              同样的感受，同样的图形——不会随机乱出图。
            </p>
          </div>
        )}
        </div>
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
              同样的输入永远得到同样的图形。本页不诊断、不做医疗判定、不做测谎、不做健康评分。
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
            <ul className="text-xs text-gray-400 space-y-1.5 mb-4 list-disc list-inside">
              <li>多种情绪并存：主情绪作为主体几何体，次要情绪作为包裹流体/附属图层融合穿插，不再输出单一形态；</li>
              <li>高频组合：反刍+低落＝螺旋外围包裹下沉云雾；麻木+低落＝团块底部缠绕稀薄云雾；反刍+麻木＝外圈螺旋、内核固化团块；</li>
              <li>有冲突（尖角）时优先保留尖角特征；</li>
              <li>柔和模式：抹除全部尖角、关闭全部抖动（默认开启动画）；</li>
              <li>统一低饱和中性底色：暗色 #181922 / 亮色 #f6f7fa，不抢图形；单轮动画周期 3~6s，拒绝快节奏与频闪；</li>
              <li>每条图形记录绑定映射规则版本号；规则迭代后，历史记录保留生成当时的图形，不自动重绘；</li>
              <li>渲染为 SVG 矢量参数驱动，保证清晰度，禁止 AI 绘画随机生成。</li>
            </ul>

            {/* v1.4 交互与边界规则 */}
            <h3 className="text-sm font-semibold text-white mb-2">交互规则与边界（v1.4）</h3>
            <ul className="text-xs text-gray-400 space-y-1.5 mb-5 list-disc list-inside">
              <li>高危拦截：文本包含危机信号时，不生成图形、不写入记录，直接展示心理援助热线（优先级最高）；</li>
              <li>识别预览与手动微调：生成前展示「主情绪 / 强度 / 次要情绪」，可手动修正后生成；调整过的记录标记为「人工」；</li>
              <li>柔和模式全局降级：柔和模式下冲突拉扯（尖角）选项不可选，降级为反刍螺旋；</li>
              <li>呼吸交互：按住图形产生临时形变（螺旋减速外扩、云雾散开、团块膨起、波纹放缓），仅作用于展示层，不修改任何记录参数，松开缓动恢复，柔和模式形变减半；</li>
              <li>动画速度档位：慢 / 标准 / 快，柔和模式锁定最慢；变速不跳帧；</li>
              <li>分层点击隐喻：仅复合图形支持（最多 3 个热区），PC 悬浮 / 移动端长按 0.5s 显示静态微弱光晕（柔和模式更弱、不闪烁），点击弹出「结构名称 + 固定隐喻文案」气泡，点击空白或关闭按钮收起；单一基础图形悬浮无光晕、点击无响应；释义文案随记录做版本快照，旧记录沿用当时文案；全局开关可一键关闭；</li>
              <li>觉察问句：默认收起，仅展示一行【查看觉察问句】浅灰小字入口；按图形形态绑定模板库，柔和模式自动切换柔和版并缩减为 1 条；文案黑名单强制校验，杜绝说教评判话术；只提问、不给答案、无输入框，不会被保存或分析；全局开关可一键关闭；</li>
              <li>触发类型 / 躯体感受标签仅作为元数据记录，不影响图形渲染；躯体感受只在解读中温和引用，不做推断；</li>
              <li>与上一条记录的变化提示只做中性形态对比，不评判好坏，不做情绪评分或预测。</li>
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
