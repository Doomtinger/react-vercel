'use client';

import { type ReactNode } from 'react';
import { CASES, fmtDate, fmtDateTime, recordCategoryLabel, type CaseRecord, type ClinicalCase, type NoteWorkflow } from './data';

const KIND_BADGE: Record<CaseRecord['kind'], string> = {
  assessment: 'bg-[#7894FF]/20 text-[#9DB0FF]',
  daily_state: 'bg-[#86E1C9]/20 text-[#9FE9D6]',
  life_event: 'bg-[#8AA0B5]/20 text-[#AFC2D2]',
  clinical_note: 'bg-[#C9A6FF]/20 text-[#DCC2FF]',
  risk_review: 'bg-[#F2A65A]/20 text-[#F7C98C]',
};

export function WorkflowBadge({ r }: { r: CaseRecord }) {
  const wf =
    r.kind === 'assessment'
      ? r.workflow ?? (r.missingItems.length > 0 ? 'missing_data' : 'normal')
      : r.workflow ?? 'normal';
  if (wf === 'normal' || wf === 'draft') return null;
  const map: Record<string, { t: string; c: string }> = {
    pending_review: { t: '待复核', c: 'bg-[#E0A458]/20 text-[#F0C078]' },
    flagged: { t: '已标记', c: 'bg-[#E5484D]/20 text-[#F08A8D]' },
    missing_data: { t: '缺失数据', c: 'bg-[#8A93A5]/20 text-[#B9C0CC]' },
    confirmed: { t: '已确认', c: 'bg-[#7FE0A0]/20 text-[#9FE9BD]' },
    revised: { t: '已修订', c: 'bg-[#7894FF]/20 text-[#9DB0FF]' },
  };
  const m = map[wf];
  if (!m) return null;
  return <span className={`rounded px-1.5 py-0.5 text-[10px] ${m.c}`}>{m.t}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function CaseList({
  cases,
  activeId,
  onSelect,
}: {
  cases: ClinicalCase[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const list = cases.length ? cases : CASES;
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
        {list.map((c) => (
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

export function EvidencePanel({ record, onClose, onCollapse }: { record: CaseRecord | null; onClose?: () => void; onCollapse?: () => void }) {
  if (!record) {
    return (
      <aside className="relative flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#0c1322] p-4">
        {onCollapse && (
          <button onClick={onCollapse} className="absolute right-3 top-3 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/60 hover:bg-white/10" title="收起面板">
            ‹
          </button>
        )}
        <div className="text-sm text-white/50">选择左侧任一节点查看证据来源</div>
        <Legend />
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#0c1322]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] ${KIND_BADGE[record.kind]}`}>{recordCategoryLabel(record)}</span>
            <WorkflowBadge r={record} />
          </div>
          <div className="flex items-center gap-1">
            {onCollapse && (
              <button onClick={onCollapse} className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/60 hover:bg-white/10" title="收起面板">
                ‹
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/60 hover:bg-white/10" title="关闭内容">
                ✕
              </button>
            )}
          </div>
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

        {record.kind === 'daily_state' && (
          <>
            <Field label="整体感觉">{['很低落', '有些低落', '一般', '还不错', '很好'][record.overall]}</Field>
            <Field label="压力 / 精力">
              <span className="text-white/90">压力 {record.stress}/4</span>
              <span className="ml-3 text-white/90">精力 {record.energy}/4</span>
            </Field>
            <Field label="感受标签">
              <div className="flex flex-wrap gap-1">
                {record.feelings.length ? record.feelings.map((f) => <span key={f} className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/80">{f}</span>) : <span className="text-white/40">未选择</span>}
              </div>
            </Field>
            <Field label="睡眠">
              {{ good: '比较好', normal: '一般', poor: '不太好' }[record.sleep]}
            </Field>
            <Field label="日常功能影响">
              {['基本没有影响', '有一些影响，但大部分事情能完成', '影响明显，部分事情难以完成', '影响很大，基本无法正常完成'][record.impact]}
            </Field>
            {record.notableEvent && <Field label="特别事件">{record.notableEvent}</Field>}
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/50">
              此为来访者的主观状态自述，非经过验证的心理量表分数，不应单独据此判断疾病。
            </div>
          </>
        )}

        {record.kind === 'life_event' && (
          <>
            <Field label="发生了什么（情境）"><p className="text-white/80">{record.situation}</p></Field>
            <Field label="当时的想法"><p className="text-white/80">{record.thoughts}</p></Field>
            <Field label="感受"><p className="text-white/80">{record.feelings}</p></Field>
            <Field label="身体反应"><p className="text-white/80">{record.bodyReactions}</p></Field>
            <Field label="当时的行为"><p className="text-white/80">{record.behavior}</p></Field>
            <Field label="后来的结果"><p className="text-white/80">{record.outcome}</p></Field>
            {record.needHelp && <Field label="现在还需要什么帮助"><p className="text-white/80">{record.needHelp}</p></Field>}
          </>
        )}

        {record.kind === 'clinical_note' && (
          <>
            <Field label="本次会谈主题"><p className="text-white/90">{record.topic}</p></Field>
            <Field label="来访者报告（自述）"><p className="text-white/80">{record.clientReport}</p></Field>
            <Field label="专业观察（观察）"><p className="text-white/80">{record.observation}</p></Field>
            {record.assessmentSummary && <Field label="评估结果"><p className="text-white/80">{record.assessmentSummary}</p></Field>}
            {record.hypothesis && <Field label="初步假设（待验证）"><p className="text-white/80">{record.hypothesis}</p></Field>}
            {record.toConfirm && <Field label="需要进一步确认"><p className="text-white/80">{record.toConfirm}</p></Field>}
            <Field label="后续计划"><p className="text-white/80">{record.plan}</p></Field>
            <Field label="记录状态 / 版本">
              <span className="text-white/90">{noteWorkflowLabel(record.workflow)}</span>
              <span className="ml-1 text-white/40">· 第 {record.revision} 版</span>
              {record.revisedFrom && <span className="ml-1 text-white/40">（由 {record.revisedFrom} 修订）</span>}
            </Field>
          </>
        )}

        {record.kind === 'risk_review' && (
          <>
            <Field label="风险等级">
              <span className={record.riskLevel === 'high' ? 'text-[#F08A8D]' : record.riskLevel === 'medium' ? 'text-[#F0C078]' : 'text-[#9FE9BD]'}>
                {{ low: '低', medium: '中', high: '高' }[record.riskLevel]}
              </span>
            </Field>
            <Field label="风险信号来源"><p className="text-white/80">{record.signalSource}</p></Field>
            <Field label="人工核实结果"><p className="text-white/80">{record.verification}</p></Field>
            <Field label="处置措施"><p className="text-white/80">{record.action}</p></Field>
            <Field label="责任人"><p className="text-white/80">{record.responsible}</p></Field>
            <Field label="后续跟进"><p className="text-white/80">{record.followUp}</p></Field>
            <Field label="记录状态"><span className="text-white/90">{noteWorkflowLabel(record.workflow)}</span></Field>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/50">
              风险结论必须由专业人员人工核实，系统仅记录流程，不自动判定风险等级。
            </div>
          </>
        )}

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/50">
          <div>
            证据来源：
            {record.kind === 'assessment'
              ? record.instrumentVersionId
              : record.kind === 'clinical_note'
              ? `咨询师记录 · ${record.author}`
              : recordCategoryLabel(record)}
          </div>
          {record.kind === 'assessment' && (
            <div className="mt-0.5">计分算法：{record.scoringAlgorithmVersion} · 语言 {record.locale}</div>
          )}
          <div className="mt-0.5 text-white/40">3D 中的形状 / 颜色仅用于信息组织，不代表诊断。</div>
        </div>
      </div>
    </aside>
  );
}

function noteWorkflowLabel(w: NoteWorkflow): string {
  return { draft: '草稿', pending_review: '待复核', confirmed: '已确认', revised: '已修订' }[w];
}

export function Legend() {
  return (
    <div className="mt-auto border-t border-white/10 p-4 text-[11px] text-white/50">
      <div className="mb-2 text-white/40">视觉编码说明</div>
      <ul className="space-y-1">
        <li>● 球=量表　◆ 二十面体=日常状态　■ 立方=事件　◆ 八面体=专业观察　▲ 四面体=风险</li>
        <li>边框：琥珀=待复核，红=标记，灰=缺失，绿=已确认，蓝=已修订</li>
        <li>颜色：按记录类别区分；量表按工具类别（不表达好/坏）</li>
        <li>位置：沿时间轨道排布；高度可由所选指标映射</li>
      </ul>
    </div>
  );
}

export function Timeline2D({
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
            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${KIND_BADGE[r.kind]}`}>{recordCategoryLabel(r)}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/85">
              {r.kind === 'assessment'
                ? `${r.instrument} · ${r.rawScore}/${r.maxScore} · ${r.interpretation.severity}`
                : r.kind === 'daily_state'
                ? `状态自述 · 整体 ${['很低落', '有些低落', '一般', '还不错', '很好'][r.overall]}`
                : r.kind === 'life_event'
                ? `事件：${r.category ?? '关键事件'}`
                : r.kind === 'clinical_note'
                ? `专业观察（${r.author}）`
                : `风险复核 · ${{ low: '低', medium: '中', high: '高' }[r.riskLevel]}`}
            </span>
            <WorkflowBadge r={r} />
          </button>
        ))}
      </div>
    </div>
  );
}
