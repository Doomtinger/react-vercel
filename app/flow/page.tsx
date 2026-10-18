'use client';

import { Component, type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { COLORS, type Phase } from '@/components/flow-space/theme';
import {
  FlowSession,
  Interruption,
  SessionReview,
  formatClock,
  saveSession,
  uid,
} from '@/components/flow-space/session';

const FlowScene = dynamic(() => import('@/components/flow-space/FlowScene'), {
  ssr: false,
  loading: () => null,
});

const CATEGORIES = ['编程', '写作', '学习', '设计', '思考'];
const INT_REASONS = [
  { key: 'notification', label: '通知打扰' },
  { key: 'external', label: '外部打断' },
  { key: 'task_switch', label: '切换任务' },
  { key: 'fatigue', label: '疲劳走神' },
  { key: 'other', label: '其他' },
];

// WebGL 初始化失败时提供静态视觉降级
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 45%, #1a2348 0%, #070B14 70%)' }}
        />
      );
    }
    return this.props.children;
  }
}

export default function FlowSpacePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState(CATEGORIES[0]);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accum, setAccum] = useState(0); // 有效专注毫秒（不含暂停）
  const [segStart, setSegStart] = useState<number | null>(null);
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [savedSession, setSavedSession] = useState<FlowSession | null>(null);
  const [reviewDone, setReviewDone] = useState(false);

  const [bloom, setBloom] = useState(0.9);
  const [showAmbient, setShowAmbient] = useState(false);
  const [pulse, setPulse] = useState(0);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const [, tick] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    if (phase === 'active' || phase === 'paused' || phase === 'entering') {
      const t = setInterval(tick, 250);
      return () => clearInterval(t);
    }
  }, [phase]);

  const elapsedSec =
    accum / 1000 + (phase === 'active' && segStart ? (Date.now() - segStart) / 1000 : 0);

  const openStart = useCallback(() => setShowStart(true), []);
  const start = useCallback(
    (title: string, category: string) => {
      if (!title.trim()) return;
      const id = uid();
      const now = Date.now();
      setTaskTitle(title);
      setTaskCategory(category);
      setDraftId(id);
      setStartedAt(now);
      setAccum(0);
      setSegStart(null);
      setInterruptions([]);
      setShowStart(false);
      setPhase('entering');
      window.setTimeout(() => {
        if (phaseRef.current === 'entering') {
          setSegStart(Date.now());
          setPhase('active');
        }
      }, 4000);
    },
    []
  );

  const pause = useCallback(() => {
    if (phase !== 'active') return;
    setAccum((a) => a + (segStart ? Date.now() - segStart : 0));
    setSegStart(null);
    setPhase('paused');
  }, [phase, segStart]);

  const resume = useCallback(() => {
    if (phase !== 'paused') return;
    setSegStart(Date.now());
    setPhase('active');
  }, [phase]);

  const requestEnd = useCallback(() => setShowEnd(true), []);
  const cancelEnd = useCallback(() => setShowEnd(false), []);

  const end = useCallback(() => {
    if (!draftId || startedAt == null) return;
    const finalElapsed = accum + (segStart ? Date.now() - segStart : 0);
    const endedAt = Date.now();
    const s: FlowSession = {
      id: draftId,
      taskTitle,
      taskCategory,
      status: 'completed',
      startedAt,
      endedAt,
      elapsedSeconds: Math.round(finalElapsed / 1000),
      wallClockSeconds: Math.round((endedAt - startedAt) / 1000),
      interruptions,
      review: null,
    };
    saveSession(s);
    setSavedSession(s);
    setSegStart(null);
    setShowEnd(false);
    setPhase('completed');
  }, [draftId, startedAt, accum, segStart, taskTitle, taskCategory, interruptions]);

  const addInterruption = useCallback((reason: string) => {
    setInterruptions((a) => [...a, { reason, at: Date.now() }]);
    setPulse((p) => p + 1);
  }, []);

  const submitReview = useCallback(
    (rv: SessionReview) => {
      setSavedSession((prev) => {
        if (!prev) return prev;
        const up: FlowSession = { ...prev, review: rv };
        saveSession(up);
        return up;
      });
      setReviewDone(true);
    },
    []
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setDraftId(null);
    setSavedSession(null);
    setReviewDone(false);
    setTaskTitle('');
    setInterruptions([]);
    setAccum(0);
    setSegStart(null);
    setStartedAt(null);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden text-white" style={{ background: COLORS.deepSpace }}>
      {/* 3D 场景 */}
      <div className="absolute inset-0">
        <SceneBoundary>
          <FlowCanvas phase={phase} pulse={pulse} bloom={bloom} />
        </SceneBoundary>
      </div>

      {/* UI 覆盖层 */}
      <div className="pointer-events-none absolute inset-0">
        {/* 顶部导航 */}
        <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS.flowBlue, boxShadow: `0 0 12px ${COLORS.flowBlue}` }}
            />
            <span className="text-sm font-semibold tracking-[0.25em] text-white/90">FLOW SPACE</span>
            {phase !== 'idle' && taskTitle && (
              <span className="ml-3 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                {taskCategory} · {taskTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAmbient((v) => !v)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            >
              场景强度
            </button>
            <Link
              href="/flow/history"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            >
              历史
            </Link>
          </div>
        </header>

        {/* 场景强度面板 */}
        {showAmbient && (
          <div className="pointer-events-auto absolute right-6 top-16 w-56 rounded-2xl border border-white/10 bg-[#111A2D]/90 p-4 backdrop-blur">
            <div className="mb-2 text-xs text-white/60">辉光强度</div>
            <input
              type="range"
              min={0}
              max={1.6}
              step={0.05}
              value={bloom}
              onChange={(e) => setBloom(parseFloat(e.target.value))}
              className="w-full accent-[#7894FF]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-white/40">
              <span>柔和</span>
              <span>明亮</span>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/40">
              提示：沉浸期间界面尽量不索取注意力，使用滚轮可缩放、拖拽可旋转视角。
            </p>
          </div>
        )}

        {/* 中央计时 / 状态 */}
        <div className="absolute inset-x-0 bottom-28 flex flex-col items-center">
          {phase === 'entering' && (
            <div className="text-sm tracking-[0.3em] text-white/60">进入空间 …</div>
          )}
          {(phase === 'active' || phase === 'paused') && (
            <>
              <div className="font-mono text-6xl font-light tabular-nums text-white/95">
                {formatClock(elapsedSec)}
              </div>
              <div className="mt-2 text-xs tracking-[0.25em] text-white/40">
                {phase === 'paused' ? '已暂停' : '已专注时长'}
              </div>
            </>
          )}
        </div>

        {/* 底部控制区 */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-8 flex items-center justify-center gap-3">
          {phase === 'idle' && (
            <button
              onClick={openStart}
              className="rounded-full px-8 py-3 text-sm font-medium text-[#070B14] transition hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${COLORS.flowBlue}, ${COLORS.flowViolet})` }}
            >
              开始专注
            </button>
          )}

          {phase === 'active' && (
            <>
              <button
                onClick={() => addInterruption('external')}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
                title="记录一次中断"
              >
                记录中断
              </button>
              <button
                onClick={pause}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/80 transition hover:bg-white/10"
              >
                暂停
              </button>
              <button
                onClick={requestEnd}
                className="rounded-full px-6 py-3 text-sm font-medium text-[#070B14] transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${COLORS.flowBlue}, ${COLORS.flowViolet})` }}
              >
                结束
              </button>
            </>
          )}

          {phase === 'paused' && (
            <>
              <button
                onClick={resume}
                className="rounded-full px-6 py-3 text-sm font-medium text-[#070B14] transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${COLORS.flowBlue}, ${COLORS.flowViolet})` }}
              >
                继续
              </button>
              <button
                onClick={requestEnd}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/80 transition hover:bg-white/10"
              >
                结束
              </button>
            </>
          )}
        </div>

        {/* 开始对话框 */}
        {showStart && (
          <StartDialog
            defaultCategory={taskCategory}
            onCancel={() => setShowStart(false)}
            onConfirm={start}
          />
        )}

        {/* 结束确认 */}
        {showEnd && (
          <ConfirmDialog
            title="结束本次专注？"
            desc="系统会保存实际时长与中断记录，随后进入简短回顾。"
            onCancel={cancelEnd}
            onConfirm={end}
          />
        )}

        {/* 会话回顾 */}
        {phase === 'completed' && savedSession && !reviewDone && (
          <ReviewForm
            session={savedSession}
            onAddInterruption={addInterruption}
            onSubmit={submitReview}
          />
        )}

        {/* 完成总结 */}
        {phase === 'completed' && savedSession && reviewDone && (
          <SummaryCard session={savedSession} onReset={reset} />
        )}
      </div>
    </main>
  );
}

function FlowCanvas({ phase, pulse, bloom }: { phase: Phase; pulse: number; bloom: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 7], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <FlowScene phase={phase} pulse={pulse} bloom={bloom} />
    </Canvas>
  );
}

function StartDialog({
  defaultCategory,
  onCancel,
  onConfirm,
}: {
  defaultCategory: string;
  onCancel: () => void;
  onConfirm: (title: string, category: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[min(92vw,420px)] rounded-3xl border border-white/10 bg-[#111A2D] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">设定意图</h2>
        <p className="mt-1 text-xs text-white/50">一个任务，一段完整的时间。</p>
        <label className="mt-5 block text-xs text-white/60">任务名称</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：实现 AI Agent 任务规划"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7894FF]"
        />
        <label className="mt-4 block text-xs text-white/60">任务类型</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                category === c
                  ? 'text-[#070B14]'
                  : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              style={category === c ? { background: 'linear-gradient(135deg,#7894FF,#B39AFF)' } : undefined}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 hover:bg-white/10"
          >
            取消
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => onConfirm(title, category)}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-[#070B14] transition enabled:hover:brightness-110 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7894FF,#B39AFF)' }}
          >
            进入空间
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  desc,
  onCancel,
  onConfirm,
}: {
  title: string;
  desc: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[min(92vw,380px)] rounded-3xl border border-white/10 bg-[#111A2D] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/55">{desc}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 hover:bg-white/10"
          >
            继续专注
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-[#070B14] transition hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#7894FF,#B39AFF)' }}
          >
            确认结束
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({
  session,
  onAddInterruption,
  onSubmit,
}: {
  session: FlowSession;
  onAddInterruption: (reason: string) => void;
  onSubmit: (rv: SessionReview) => void;
}) {
  const [taskCompleted, setTaskCompleted] = useState(true);
  const [engagement, setEngagement] = useState(4);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm">
      <div className="w-[min(94vw,460px)] rounded-3xl border border-white/10 bg-[#111A2D] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">会话回顾</h2>
        <p className="mt-1 text-xs text-white/50">
          {session.taskCategory} · {session.taskTitle} · 专注 {formatClock(session.elapsedSeconds)}
        </p>

        <div className="mt-5 flex gap-2">
          {session.interruptions.length > 0 && (
            <button
              onClick={() => onAddInterruption('other')}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              + 追加中断（已记录 {session.interruptions.length} 次）
            </button>
          )}
        </div>

        <div className="mt-5 text-sm text-white/80">本次任务是否完成？</div>
        <div className="mt-2 flex gap-2">
          {[
            { v: true, l: '已完成' },
            { v: false, l: '未完成' },
          ].map((o) => (
            <button
              key={o.l}
              onClick={() => setTaskCompleted(o.v)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                taskCompleted === o.v
                  ? 'text-[#070B14]'
                  : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              style={taskCompleted === o.v ? { background: 'linear-gradient(135deg,#7894FF,#B39AFF)' } : undefined}
            >
              {o.l}
            </button>
          ))}
        </div>

        <div className="mt-5 text-sm text-white/80">主观投入感</div>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setEngagement(n)}
              className={`h-9 w-9 rounded-full text-sm transition ${
                engagement >= n ? 'text-[#070B14]' : 'border border-white/10 bg-white/5 text-white/50'
              }`}
              style={engagement >= n ? { background: 'linear-gradient(135deg,#7894FF,#B39AFF)' } : undefined}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm text-white/80">本次成果</label>
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          rows={2}
          placeholder="今天实际完成了什么？"
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7894FF]"
        />

        <label className="mt-4 block text-sm text-white/80">备注（可选）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="任何想记住的专注条件或感受"
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7894FF]"
        />

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onSubmit({ taskCompleted, engagement, outcome, notes })}
            className="rounded-full px-6 py-2.5 text-sm font-medium text-[#070B14] transition hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#7894FF,#B39AFF)' }}
          >
            保存并返回
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ session, onReset }: { session: FlowSession; onReset: () => void }) {
  const rv = session.review;
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 px-4 py-10 backdrop-blur-sm">
      <div className="w-[min(94vw,440px)] rounded-3xl border border-white/10 bg-[#111A2D] p-6 shadow-2xl">
        <div className="text-xs tracking-[0.25em] text-white/40">本次专注已完成</div>
        <div className="mt-2 font-mono text-4xl font-light text-white">
          {formatClock(session.elapsedSeconds)}
        </div>
        <div className="mt-1 text-xs text-white/50">
          实际经过 {formatClock(session.wallClockSeconds)} · 中断 {session.interruptions.length} 次
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-xs text-white/40">任务</div>
            <div className="mt-1 text-white/90">{session.taskTitle}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-xs text-white/40">投入感</div>
            <div className="mt-1 text-white/90">{rv ? `${rv.engagement} / 5` : '—'}</div>
          </div>
          <div className="col-span-2 rounded-xl bg-white/5 p-3">
            <div className="text-xs text-white/40">成果</div>
            <div className="mt-1 text-white/90">{rv?.outcome || '（未填写）'}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Link
            href="/flow/history"
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 hover:bg-white/10"
          >
            查看历史
          </Link>
          <button
            onClick={onReset}
            className="rounded-full px-6 py-2.5 text-sm font-medium text-[#070B14] transition hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#7894FF,#B39AFF)' }}
          >
            返回主空间
          </button>
        </div>
      </div>
    </div>
  );
}
