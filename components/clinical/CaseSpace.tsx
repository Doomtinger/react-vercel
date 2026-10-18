'use client';

import { Component, type ReactNode, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  CASES,
  METRIC_OPTIONS,
  fmtDate,
  fmtDateTime,
  type CaseRecord,
  type ClinicalCase,
  type MetricOption,
} from './data';

const StateSpace3D = dynamic(() => import('./StateSpace3D'), { ssr: false, loading: () => null });

const KIND_LABEL: Record<CaseRecord['kind'], string> = {
  assessment: '评估',
  life_event: '生活事件',
  clinical_note: '咨询记录',
  review: '专业复核',
};

const KIND_BADGE: Record<CaseRecord['kind'], string> = {
  assessment: 'bg-[#7894FF]/20 text-[#9DB0FF]',
  life_event: 'bg-[#8AA0B5]/20 text-[#AFC2D2]',
  clinical_note: 'bg-[#9AA7B5]/20 text-[#C2CCD6]',
  review: 'bg-[#7FE0A0]/20 text-[#9FE9BD]',
};

function WorkflowBadge({ r }: { r: CaseRecord }) {
  const wf = r.workflow ?? (r.kind === 'assessment' && r.missingItems.length > 0 ? 'missing_data' : 'normal');
  if (wf === 'normal') return null;
  const map: Record<string, { t: string; c: string }> = {
    pending_review: { t: '待复核', c: 'bg-[#E0A458]/20 text-[#F0C078]' },
    flagged: { t: '已标记', c: 'bg-[#E5484D]/20 text-[#F08A8D]' },
    missing_data: { t: '缺失数据', c: 'bg-[#8A93A5]/20 text-[#B9C0CC]' },
  };
  const m = map[wf];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] ${m.c}`}>{m.t}</span>;
}

class WebGLBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function CaseList({
  cases,
  activeId,
  onSelect,
}: {
  cases: ClinicalCase[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#0c1322]">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7894FF]" style={{ boxShadow: '0 0 12px #7894FF' }} />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/90">FLOW SPACE CLINICAL</span>
        </div>
        <div className="mt-1 text-[10px] text-white/40">心理状态评估与追踪平台</div>
      </div>
      <div className="px-3 text-[10px] uppercase tracking-widest text-white/30">个案列表</div>
      <nav className="mt-2 flex-1 space-y-1 px-2">
        {cases.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
              activeId === c.id ? 'bg-white/10 ring-1 ring-white/15' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/90">{c.alias}</span>
              <span className="text-[10px] text-white/40">{c.records.length}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-white/40">
              {c.code} · {c.status}
            </div>
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 text-[10px] text-white/30">虚构演示数据 · 不含真实个人信息</div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function EvidencePanel({ record }: { record: CaseRecord | null }) {
  if (!record) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#0c1322] p-4">
        <div className="text-sm text-white/50">选择左侧任一节点查看证据来源</div>
        <Legend />
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#0c1322]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] ${KIND_BADGE[record.kind]}`}>{KIND_LABEL[record.kind]}</span>
          <WorkflowBadge r={record} />
        </div>
        <div className="mt-2 text-[11px] text-white/40">{fmtDateTime(record.timestamp)}</div>
      </div>

      <div className="space-y-4 p-4 text-sm">
        {record.kind === 'assessment' && (
          <>
            <Field label="量表 / 版本">
              <span className="text-white/90">{record.instrument}</span>
              <span className="ml-1 text-white/40">({record.instrumentVersionId})</span>
            </Field>
            <Field label="原始分数">
              <span className="text-lg font-semibold text-white">{record.rawScore}</span>
              <span className="text-white/40"> / {record.maxScore}</span>
            </Field>
            <Field label={`解释（规则 ${record.interpretation.ruleId}）`}>
              <div className="text-white/90">{record.interpretation.severity}</div>
              {record.interpretation.note && <div className="mt-1 text-white/50">{record.interpretation.note}</div>}
              <div className="mt-1 text-[11px] text-white/40">来源：{record.interpretation.reference}</div>
            </Field>

            <div>
              <div className="mb-1 text-[11px] text-white/40">逐项原始回答</div>
              <div className="space-y-1 rounded-lg bg-black/20 p-2">
                {Object.entries(record.rawResponses).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-[12px]">
                    <span className="text-white/60">{k}</span>
                    <span className={v === null ? 'text-[#B9C0CC]' : 'text-white/90'}>{v === null ? '— 缺失' : v}</span>
                  </div>
                ))}
              </div>
              {record.missingItems.length > 0 && (
                <div className="mt-1 text-[11px] text-[#B9C0CC]">缺失项：{record.missingItems.join('、')}（按有效项计分）</div>
              )}
            </div>

            <Field label="复核状态">
              {record.reviewedBy ? (
                <span className="text-white/90">
                  已由 {record.reviewedBy} 复核{record.reviewedAt ? ` · ${fmtDate(record.reviewedAt)}` : ''}
                </span>
              ) : (
                <span className="text-[#F0C078]">待专业人员复核</span>
              )}
            </Field>
          </>
        )}

        {record.kind === 'life_event' && (
          <>
            <Field label="类别">{record.category}</Field>
            <Field label="自述内容">
              <p className="text-white/80">{record.content}</p>
            </Field>
          </>
        )}

        {record.kind === 'clinical_note' && (
          <>
            <Field label="作者 / 状态">
              <span className="text-white/90">{record.author}</span>
              <span className="ml-1 text-white/40">· {record.status === 'final' ? '已定稿' : '草稿'}</span>
            </Field>
            <Field label="内容">
              <p className="text-white/80">{record.content}</p>
            </Field>
          </>
        )}

        {record.kind === 'review' && (
          <>
            <Field label="复核人">{record.reviewer}</Field>
            <Field label="发现">
              <p className="text-white/80">{record.finding}</p>
            </Field>
            <Field label="处置 / 行动">
              <p className="text-white/80">{record.action}</p>
            </Field>
          </>
        )}

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/50">
          <div>证据来源：{record.kind === 'assessment' ? record.instrumentVersionId : KIND_LABEL[record.kind]}</div>
          {record.kind === 'assessment' && (
            <div className="mt-0.5">计分算法：{record.scoringAlgorithmVersion} · 语言 {record.locale}</div>
          )}
          <div className="mt-0.5 text-white/40">3D 中的形状 / 颜色仅用于信息组织，不代表诊断。</div>
        </div>
      </div>
    </aside>
  );
}

function Legend() {
  return (
    <div className="mt-auto border-t border-white/10 p-4 text-[11px] text-white/50">
      <div className="mb-2 text-white/40">视觉编码说明</div>
      <ul className="space-y-1">
        <li>● 球 = 评估　■ 立方 = 事件　◆ 八面体 = 记录　▲ 四面体 = 复核</li>
        <li>边框：琥珀=待复核，红=标记，灰=缺失数据</li>
        <li>颜色：按工具类别区分，不表达好/坏</li>
        <li>位置：沿时间轨道排布；高度可由所选指标映射</li>
      </ul>
    </div>
  );
}

function Timeline2D({
  records,
  selectedId,
  onSelect,
}: {
  records: CaseRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-2">
        {sorted.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
              selectedId === r.id ? 'border-[#7894FF]/60 bg-[#7894FF]/10' : 'border-white/10 bg-[#0c1322] hover:bg-white/5'
            }`}
          >
            <span className="w-24 shrink-0 text-[11px] text-white/40">{fmtDate(r.timestamp)}</span>
            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${KIND_BADGE[r.kind]}`}>{KIND_LABEL[r.kind]}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/85">
              {r.kind === 'assessment'
                ? `${r.instrument} · ${r.rawScore}/${r.maxScore} · ${r.interpretation.severity}`
                : r.kind === 'life_event'
                ? `事件：${r.category}`
                : r.kind === 'clinical_note'
                ? `记录（${r.author}）`
                : `复核（${r.reviewer}）`}
            </span>
            <WorkflowBadge r={r} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CaseWorkspace({ caseId }: { caseId: string }) {
  const clinicalCase = useMemo(() => CASES.find((c) => c.id === caseId)!, [caseId]);
  const records = clinicalCase.records;
  const { tMin, tMax } = useMemo(() => {
    const ts = records.map((r) => r.timestamp);
    return { tMin: Math.min(...ts), tMax: Math.max(...ts) };
  }, [records]);

  const [recordId, setRecordId] = useState<string | null>(null);
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const [metric, setMetric] = useState<MetricOption>('PHQ-9');
  const [visibleUntil, setVisibleUntil] = useState<number>(tMax);
  const [playing, setPlaying] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setVisibleUntil((v) => {
        const next = v + (tMax - tMin) / 200;
        if (next >= tMax) {
          setPlaying(false);
          return tMax;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing, tMin, tMax]);

  const selectedRecord = records.find((r) => r.id === recordId) ?? null;
  const visibleCount = records.filter((r) => r.timestamp <= visibleUntil).length;
  const effectiveView: '3d' | '2d' = webglFailed ? '2d' : view;

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#0c1322] px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-white/90">{clinicalCase.alias}</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/50">{clinicalCase.code}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-white/40">
              主责 {clinicalCase.assignedTo} · 同意版本 {clinicalCase.consentVersion} · {clinicalCase.status}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricOption)}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/80 outline-none"
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 'none' ? '高度：仅时间' : `高度：${m} 分数`}
                </option>
              ))}
            </select>

            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {(['3d', '2d'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs transition ${
                    effectiveView === v ? 'bg-[#7894FF] text-[#070B14]' : 'bg-black/30 text-white/70 hover:bg-white/5'
                  }`}
                >
                  {v === '3d' ? '3D 空间' : '2D 时间线'}
                </button>
              ))}
            </div>

            <Link href="/flow" className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5">
              心流空间
            </Link>
          </div>
        </header>

        <div className="flex items-center gap-3 border-b border-white/10 bg-[#0a0f1c] px-5 py-2 text-xs text-white/60">
          <button
            onClick={() => {
              if (visibleUntil >= tMax) setVisibleUntil(tMin);
              setPlaying((p) => !p);
            }}
            className="rounded-md bg-[#7894FF] px-3 py-1 font-medium text-[#070B14]"
          >
            {playing ? '暂停' : '回放'}
          </button>
          <span className="text-white/40">时间窗</span>
          <input
            type="range"
            min={tMin}
            max={tMax}
            step={(tMax - tMin) / 200 || 1}
            value={visibleUntil}
            onChange={(e) => {
              setPlaying(false);
              setVisibleUntil(Number(e.target.value));
            }}
            className="flex-1 accent-[#7894FF]"
          />
          <span className="w-28 text-right text-white/40">可见 {visibleCount}/{records.length} 条</span>
        </div>

        <div className="relative min-h-0 flex-1">
          {effectiveView === '3d' ? (
            <WebGLBoundary onFail={() => setWebglFailed(true)}>
              <StateSpace3D
                records={records}
                hypotheses={clinicalCase.hypotheses}
                selectedId={recordId}
                onSelect={setRecordId}
                metric={metric}
                visibleUntil={visibleUntil}
              />
            </WebGLBoundary>
          ) : (
            <Timeline2D records={records} selectedId={recordId} onSelect={setRecordId} />
          )}

          {effectiveView === '3d' && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white/50 backdrop-blur">
              拖动旋转 · 滚轮缩放 · 点击节点查看证据 · 颜色/形状仅用于信息组织
            </div>
          )}
        </div>
      </main>

      <EvidencePanel record={selectedRecord} />
    </>
  );
}

export default function CaseSpace() {
  const [caseId, setCaseId] = useState(CASES[0].id);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14] text-white">
      <CaseList cases={CASES} activeId={caseId} onSelect={setCaseId} />
      <CaseWorkspace key={caseId} caseId={caseId} />
    </div>
  );
}
