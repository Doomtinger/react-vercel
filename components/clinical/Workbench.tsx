'use client';

import { Component, type ReactNode, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { EvidencePanel, Timeline2D, AIAssistPanel } from './ui';
import { METRIC_OPTIONS, type CaseRecord, type ClinicalCase, type MetricOption, type NoteWorkflow } from './data';

const StateSpace3D = dynamic(() => import('./StateSpace3D'), { ssr: false, loading: () => null });

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

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1322] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/90">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#7894FF]';
const newId = () => `c-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

function ProNoteModal({ clinicalCase, onAdd, onClose }: { clinicalCase: ClinicalCase; onAdd: (id: string, r: CaseRecord) => void; onClose: () => void }) {
  const [f, setF] = useState({ author: clinicalCase.assignedTo, topic: '', clientReport: '', observation: '', assessmentSummary: '', hypothesis: '', toConfirm: '', plan: '' });
  const [workflow, setWorkflow] = useState<NoteWorkflow>('draft');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const submit = () => {
    const rec: CaseRecord = {
      id: newId(),
      caseId: clinicalCase.id,
      kind: 'clinical_note',
      timestamp: Date.now(),
      author: f.author,
      topic: f.topic,
      clientReport: f.clientReport,
      observation: f.observation,
      assessmentSummary: f.assessmentSummary || undefined,
      hypothesis: f.hypothesis || undefined,
      toConfirm: f.toConfirm || undefined,
      plan: f.plan,
      workflow,
      revision: 1,
    };
    onAdd(clinicalCase.id, rec);
    onClose();
  };
  return (
    <Modal title="新增专业观察（咨询师记录）" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-[12px] text-white/50">记录人</div>
            <input value={f.author} onChange={(e) => set('author', e.target.value)} className={inputCls} />
          </div>
          <div>
            <div className="mb-1 text-[12px] text-white/50">记录状态</div>
            <select value={workflow} onChange={(e) => setWorkflow(e.target.value as NoteWorkflow)} className={inputCls}>
              <option value="draft">草稿</option>
              <option value="pending_review">待复核</option>
              <option value="confirmed">已确认</option>
              <option value="revised">已修订</option>
            </select>
          </div>
        </div>
        <div><div className="mb-1 text-[12px] text-white/50">本次会谈主题</div><input value={f.topic} onChange={(e) => set('topic', e.target.value)} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">来访者报告（自述）</div><textarea value={f.clientReport} onChange={(e) => set('clientReport', e.target.value)} rows={2} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">专业观察（观察，避免推测）</div><textarea value={f.observation} onChange={(e) => set('observation', e.target.value)} rows={2} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">评估结果</div><input value={f.assessmentSummary} onChange={(e) => set('assessmentSummary', e.target.value)} className={inputCls} placeholder="量表名称 / 分数 / 解释" /></div>
        <div><div className="mb-1 text-[12px] text-white/50">初步假设（待验证）</div><input value={f.hypothesis} onChange={(e) => set('hypothesis', e.target.value)} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">需要进一步确认</div><input value={f.toConfirm} onChange={(e) => set('toConfirm', e.target.value)} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">后续计划</div><textarea value={f.plan} onChange={(e) => set('plan', e.target.value)} rows={2} className={inputCls} /></div>
        <button onClick={submit} disabled={!f.topic.trim() || !f.observation.trim()} className="w-full rounded-lg bg-[#C9A6FF] py-2 text-sm font-medium text-[#070B14] disabled:opacity-40">
          保存专业观察
        </button>
      </div>
    </Modal>
  );
}

function ProRiskModal({ clinicalCase, onAdd, onClose }: { clinicalCase: ClinicalCase; onAdd: (id: string, r: CaseRecord) => void; onClose: () => void }) {
  const [f, setF] = useState({ signalSource: '', verification: '', action: '', responsible: '', followUp: '' });
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [workflow, setWorkflow] = useState<NoteWorkflow>('confirmed');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const submit = () => {
    const rec: CaseRecord = {
      id: newId(),
      caseId: clinicalCase.id,
      kind: 'risk_review',
      timestamp: Date.now(),
      signalSource: f.signalSource,
      verification: f.verification,
      action: f.action,
      responsible: f.responsible,
      followUp: f.followUp,
      riskLevel,
      workflow,
    };
    onAdd(clinicalCase.id, rec);
    onClose();
  };
  return (
    <Modal title="新增风险复核与转介记录" onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/50">风险结论必须由专业人员人工核实，系统仅记录流程，不自动判定风险等级。</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-[12px] text-white/50">风险等级</div>
            <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')} className={inputCls}>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div>
            <div className="mb-1 text-[12px] text-white/50">记录状态</div>
            <select value={workflow} onChange={(e) => setWorkflow(e.target.value as NoteWorkflow)} className={inputCls}>
              <option value="draft">草稿</option>
              <option value="pending_review">待复核</option>
              <option value="confirmed">已确认</option>
              <option value="revised">已修订</option>
            </select>
          </div>
        </div>
        <div><div className="mb-1 text-[12px] text-white/50">风险信号来源</div><input value={f.signalSource} onChange={(e) => set('signalSource', e.target.value)} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">人工核实结果</div><textarea value={f.verification} onChange={(e) => set('verification', e.target.value)} rows={2} className={inputCls} /></div>
        <div><div className="mb-1 text-[12px] text-white/50">处置措施</div><textarea value={f.action} onChange={(e) => set('action', e.target.value)} rows={2} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="mb-1 text-[12px] text-white/50">责任人</div><input value={f.responsible} onChange={(e) => set('responsible', e.target.value)} className={inputCls} /></div>
          <div><div className="mb-1 text-[12px] text-white/50">后续跟进</div><input value={f.followUp} onChange={(e) => set('followUp', e.target.value)} className={inputCls} /></div>
        </div>
        <button onClick={submit} disabled={!f.signalSource.trim() || !f.verification.trim()} className="w-full rounded-lg bg-[#F2A65A] py-2 text-sm font-medium text-[#070B14] disabled:opacity-40">
          保存风险复核
        </button>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 border-r border-white/5 px-4 py-2 last:border-r-0">
      <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
      <span className="text-lg font-semibold leading-none text-white/90">{value}</span>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs transition ${active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'}`}
    >
      {children}
    </button>
  );
}

export default function Workbench({
  clinicalCase,
  selectedId,
  onSelect,
  onAdd,
  onSwitchSurface,
}: {
  clinicalCase: ClinicalCase;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (caseId: string, r: CaseRecord) => void;
  onSwitchSurface: (s: 'workbench' | 'client') => void;
}) {
  const records = clinicalCase.records;
  const { tMin, tMax } = useMemo(() => {
    const ts = records.map((r) => r.timestamp);
    return { tMin: Math.min(...ts), tMax: Math.max(...ts) };
  }, [records]);

  const [metric, setMetric] = useState<MetricOption>('PHQ-9');
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const [visibleUntil, setVisibleUntil] = useState<number>(tMax);
  const [playing, setPlaying] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showEvidence, setShowEvidence] = useState(true);
  const [sideTab, setSideTab] = useState<'evidence' | 'ai'>('evidence');

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

  // 新增记录后，若选中项在时间窗外，自动展开时间窗以显示它
  const selected = records.find((r) => r.id === selectedId);
  useEffect(() => {
    if (selected && selected.timestamp > visibleUntil) setVisibleUntil(selected.timestamp);
  }, [selectedId, selected, visibleUntil]);

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;
  const visibleCount = records.filter((r) => r.timestamp <= visibleUntil).length;
  const effectiveView: '3d' | '2d' = webglFailed ? '2d' : view;

  const handleSelect = (id: string | null) => {
    onSelect(id);
    if (id) {
      setShowEvidence(true);
      setSideTab('evidence');
    }
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c1322] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white/90">{clinicalCase.alias}</span>
            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/50">{clinicalCase.code}</span>
          </div>
          {!collapsed && (
            <div className="mt-0.5 truncate text-[11px] text-white/40">
              主责 {clinicalCase.assignedTo} · 同意版本 {clinicalCase.consentVersion} · {clinicalCase.status}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!collapsed && (
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
          )}

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

          <button onClick={() => onSwitchSurface('client')} className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">
            来访者记录端
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
            title={collapsed ? '展开顶部工具栏' : '收起顶部工具栏'}
          >
            {collapsed ? '展开 ▾' : '收起 ▴'}
          </button>
          <button
            onClick={() => setShowEvidence((v) => !v)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
            title={showEvidence ? '收起证据面板' : '展开证据面板'}
          >
            {showEvidence ? '收起证据 ◂' : '展开证据 ▸'}
          </button>
        </div>
      </header>

      <div className="flex shrink-0 border-b border-white/10 bg-[#0a0f1c] text-white/70">
        <Stat label="评估次数" value={records.filter((r) => r.kind === 'assessment').length} />
        <Stat label="事件记录" value={records.filter((r) => r.kind === 'life_event').length} />
        <Stat label="待复核" value={records.filter((r) => r.workflow === 'pending_review').length} />
        <Stat label="工作流状态" value={clinicalCase.status} />
      </div>

      {collapsed ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0a0f1c] px-5 py-1.5 text-xs text-white/60">
          <button onClick={() => setCollapsed(false)} className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-white/70 hover:bg-white/5" title="展开顶部工具栏">
            ▾ 展开顶部
          </button>
          <button
            onClick={() => {
              if (visibleUntil >= tMax) setVisibleUntil(tMin);
              setPlaying((p) => !p);
            }}
            className="rounded-md bg-[#7894FF] px-3 py-1 font-medium text-[#070B14]"
          >
            {playing ? '暂停' : '回放'}
          </button>
          <span className="text-white/40">可见 {visibleCount}/{records.length} 条</span>
          <button onClick={() => setShowNote(true)} className="rounded-md bg-[#C9A6FF] px-3 py-1 text-[#070B14]">
            专业观察
          </button>
          <button onClick={() => setShowRisk(true)} className="rounded-md bg-[#F2A65A] px-3 py-1 text-[#070B14]">
            风险复核
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a0f1c] px-5 py-2 text-xs text-white/60">
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
            className="min-w-[160px] flex-1 accent-[#7894FF]"
          />
          <span className="w-28 text-right text-white/40">可见 {visibleCount}/{records.length} 条</span>
          <button onClick={() => setShowNote(true)} className="rounded-md bg-[#C9A6FF] px-3 py-1 text-[#070B14]">
            专业观察
          </button>
          <button onClick={() => setShowRisk(true)} className="rounded-md bg-[#F2A65A] px-3 py-1 text-[#070B14]">
            风险复核
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-white/70 hover:bg-white/5"
            title="收起顶部工具栏"
          >
            ▴ 收起
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          {effectiveView === '3d' ? (
            <WebGLBoundary onFail={() => setWebglFailed(true)}>
              <StateSpace3D
                records={records}
                hypotheses={clinicalCase.hypotheses}
                selectedId={selectedId}
                onSelect={handleSelect}
                metric={metric}
                visibleUntil={visibleUntil}
              />
            </WebGLBoundary>
          ) : (
            <Timeline2D records={records} selectedId={selectedId} onSelect={handleSelect} />
          )}

          {effectiveView === '3d' && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white/50 backdrop-blur">
              拖动旋转 · 滚轮缩放 · 点击节点查看证据 · 颜色/形状仅用于信息组织
            </div>
          )}
        </div>

        {showEvidence ? (
          <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#0c1322]">
            <div className="flex shrink-0 border-b border-white/10">
              <TabBtn active={sideTab === 'evidence'} onClick={() => setSideTab('evidence')}>
                证据详情
              </TabBtn>
              <TabBtn active={sideTab === 'ai'} onClick={() => setSideTab('ai')}>
                AI 辅助观察
              </TabBtn>
            </div>
            <div className="relative min-h-0 flex-1">
              {sideTab === 'evidence' ? (
                <EvidencePanel record={selectedRecord} onClose={() => onSelect(null)} onCollapse={() => setShowEvidence(false)} />
              ) : (
                <AIAssistPanel records={records} />
              )}
            </div>
          </aside>
        ) : (
          <button
            onClick={() => setShowEvidence(true)}
            className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-l border-white/10 bg-[#0c1322] text-white/60 transition hover:bg-white/5 hover:text-white/90"
            title="展开证据面板"
          >
            <span className="text-base leading-none">‹</span>
            <span className="text-xs" style={{ writingMode: 'vertical-rl' }}>
              证据面板
            </span>
          </button>
        )}
      </div>

      {showNote && <ProNoteModal clinicalCase={clinicalCase} onAdd={onAdd} onClose={() => setShowNote(false)} />}
      {showRisk && <ProRiskModal clinicalCase={clinicalCase} onAdd={onAdd} onClose={() => setShowRisk(false)} />}
    </main>
  );
}
