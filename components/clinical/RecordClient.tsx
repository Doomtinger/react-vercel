'use client';

import { useState } from 'react';
import {
  FEELING_TAGS,
  IMPACT_OPTIONS,
  INSTRUMENTS,
  NOTABLE_EVENT_OPTIONS,
  OVERALL_OPTIONS,
  SLEEP_OPTIONS,
  scoreAssessment,
  type CaseRecord,
  type ClinicalCase,
} from './data';

const EMOJI = ['😞', '🙁', '😐', '🙂', '😄'];
const newId = () => `c-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1322] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7894FF] text-xs font-semibold text-[#070B14]">{n}</span>
        <h3 className="text-sm font-medium text-white/90">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Seg({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`h-9 w-9 rounded-lg text-sm transition ${
            value === v ? 'bg-[#7894FF] text-[#070B14]' : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export default function RecordClient({
  clinicalCase,
  onAdd,
  onRecorded,
}: {
  clinicalCase: ClinicalCase;
  onAdd: (caseId: string, record: CaseRecord) => void;
  onRecorded: (recordId: string) => void;
}) {
  // 01 快速状态记录
  const [overall, setOverall] = useState(2);
  const [stress, setStress] = useState(2);
  const [energy, setEnergy] = useState(2);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [sleep, setSleep] = useState<'good' | 'normal' | 'poor'>('normal');
  const [impact, setImpact] = useState<0 | 1 | 2 | 3>(1);
  const [notable, setNotable] = useState('');
  const [preview, setPreview] = useState('');

  // 03 事件卡
  const [ev, setEv] = useState({ situation: '', thoughts: '', feelings: '', body: '', behavior: '', outcome: '', need: '', category: '' });

  // 02 量表填写
  const [inst, setInst] = useState('PHQ-9');
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [scored, setScored] = useState<{ rawScore: number; maxScore: number; severity: string } | null>(null);

  const toggleFeeling = (f: string) => setFeelings((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));

  const submitDaily = () => {
    const rec: CaseRecord = {
      id: newId(),
      caseId: clinicalCase.id,
      kind: 'daily_state',
      timestamp: Date.now(),
      overall,
      stress,
      energy,
      feelings,
      sleep,
      impact,
      notableEvent: notable && notable !== '没有明显事件' ? notable : undefined,
    };
    onAdd(clinicalCase.id, rec);
    onRecorded(rec.id);
  };

  const previewDaily = () => {
    const text = [
      `# 日常状态记录（虚构示例 · 不用于临床诊断）`,
      `时间：${new Date().toLocaleString('zh-CN')}`,
      `整体感觉：${OVERALL_OPTIONS[overall]}`,
      `压力：${stress}/4　精力：${energy}/4`,
      `感受：${feelings.join('、') || '（未选择）'}`,
      `睡眠：${{ good: '比较好', normal: '一般', poor: '不太好' }[sleep]}`,
      `日常影响：${IMPACT_OPTIONS[impact].l}`,
      notable && notable !== '没有明显事件' ? `特别事件：${notable}` : '特别事件：无明显事件',
      ``,
      `说明：以上为个人主观状态自述，不是经过验证的心理量表分数。`,
    ].join('\n');
    setPreview(text);
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const submitEvent = () => {
    const rec: CaseRecord = {
      id: newId(),
      caseId: clinicalCase.id,
      kind: 'life_event',
      timestamp: Date.now(),
      situation: ev.situation,
      thoughts: ev.thoughts,
      feelings: ev.feelings,
      bodyReactions: ev.body,
      behavior: ev.behavior,
      outcome: ev.outcome,
      needHelp: ev.need || undefined,
      category: ev.category || undefined,
    };
    onAdd(clinicalCase.id, rec);
    onRecorded(rec.id);
  };

  const computeScore = () => {
    const meta = INSTRUMENTS[inst];
    const filled: Record<string, number> = {};
    for (const it of meta.items) filled[it] = responses[it] ?? 0;
    setScored(scoreAssessment(inst, filled));
  };

  const submitAssessment = () => {
    const meta = INSTRUMENTS[inst];
    const filled: Record<string, number> = {};
    for (const it of meta.items) filled[it] = responses[it] ?? 0;
    const { rawScore, maxScore, severity } = scoreAssessment(inst, filled);
    const rec: CaseRecord = {
      id: newId(),
      caseId: clinicalCase.id,
      kind: 'assessment',
      timestamp: Date.now(),
      instrument: inst,
      instrumentVersionId: meta.version,
      locale: meta.locale,
      scoringAlgorithmVersion: `${inst}.score.v1`,
      rawScore,
      maxScore,
      rawResponses: filled,
      missingItems: [],
      interpretation: { ruleId: meta.rule, severity, reference: meta.reference },
      workflow: 'pending_review',
    };
    onAdd(clinicalCase.id, rec);
    setResponses({});
    setScored(null);
    onRecorded(rec.id);
  };

  const inputCls = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#7894FF]';

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[12px] text-white/50">
          来访者记录端 · 交互示例 · 虚构数据 · 不用于临床诊断。正式产品应说明谁能查看记录、用于什么目的、保存多久，以及如何撤回授权。本原型不会将内容发送到服务器。
        </div>

        {/* 01 快速状态记录 */}
        <Section n={1} title="今天的状态（快速记录 · 约 30–60 秒）">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[12px] text-white/50">1. 今天整体感觉怎么样？</div>
              <div className="flex gap-2">
                {EMOJI.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setOverall(i)}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition ${
                      overall === i ? 'bg-[#86E1C9]/30 ring-1 ring-[#86E1C9]' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-[11px] text-white/40">主观感受记录，不是经过验证的心理量表分数。</div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-white/50">2. 今天的压力有多大？（0 没有压力 → 4 非常大）</div>
              <Seg value={stress} min={0} max={4} onChange={setStress} />
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-white/50">3. 今天的精力怎么样？（0 几乎没有 → 4 非常充足）</div>
              <Seg value={energy} min={0} max={4} onChange={setEnergy} />
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-white/50">4. 今天有哪些感受？（可多选，也可不选）</div>
              <div className="flex flex-wrap gap-1.5">
                {FEELING_TAGS.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleFeeling(f)}
                    className={`rounded-full px-3 py-1 text-[12px] transition ${
                      feelings.includes(f) ? 'bg-[#86E1C9] text-[#070B14]' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-white/50">5. 睡眠情况如何？</div>
              <div className="flex gap-2">
                {SLEEP_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setSleep(o.v)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] transition ${
                      sleep === o.v ? 'bg-[#7894FF] text-[#070B14]' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-white/50">6. 今天的日常生活受到多大影响？</div>
              <div className="flex flex-col gap-1.5">
                {IMPACT_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setImpact(o.v)}
                    className={`rounded-lg px-3 py-1.5 text-left text-[12px] transition ${
                      impact === o.v ? 'bg-[#7894FF] text-[#070B14]' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-white/50">7. 今天发生了什么特别的事情？（可选）</div>
              <select value={notable} onChange={(e) => setNotable(e.target.value)} className={inputCls}>
                <option value="">不记录</option>
                {NOTABLE_EVENT_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={submitDaily} className="rounded-lg bg-[#86E1C9] px-4 py-2 text-sm font-medium text-[#070B14]">
                保存状态记录
              </button>
              <button onClick={previewDaily} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10">
                生成并复制记录示例
              </button>
            </div>
            {preview && <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[11px] text-white/60">{preview}</pre>}
          </div>
        </Section>

        {/* 03 关键事件记录卡 */}
        <Section n={2} title="发生了什么？（心理事件记录卡 · 约 2–5 分钟）">
          <div className="space-y-3">
            <p className="text-[12px] text-white/40">使用“情境 → 想法 → 感受 → 身体反应 → 行为 → 结果”的结构，记录一次具体事件，而不是直接解释原因。</p>
            <div>
              <div className="mb-1 text-[12px] text-white/50">发生了什么？（客观描述）</div>
              <textarea value={ev.situation} onChange={(e) => setEv({ ...ev, situation: e.target.value })} rows={2} className={inputCls} />
            </div>
            <div>
              <div className="mb-1 text-[12px] text-white/50">当时脑中出现了什么想法？</div>
              <textarea value={ev.thoughts} onChange={(e) => setEv({ ...ev, thoughts: e.target.value })} rows={2} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[12px] text-white/50">感受</div>
                <input value={ev.feelings} onChange={(e) => setEv({ ...ev, feelings: e.target.value })} className={inputCls} />
              </div>
              <div>
                <div className="mb-1 text-[12px] text-white/50">身体反应</div>
                <input value={ev.body} onChange={(e) => setEv({ ...ev, body: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[12px] text-white/50">当时做了什么？</div>
                <input value={ev.behavior} onChange={(e) => setEv({ ...ev, behavior: e.target.value })} className={inputCls} />
              </div>
              <div>
                <div className="mb-1 text-[12px] text-white/50">后来发生了什么？</div>
                <input value={ev.outcome} onChange={(e) => setEv({ ...ev, outcome: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[12px] text-white/50">现在还需要什么帮助？（可选）</div>
              <input value={ev.need} onChange={(e) => setEv({ ...ev, need: e.target.value })} className={inputCls} placeholder="例如希望在咨询中讨论的问题" />
            </div>
            <div>
              <div className="mb-1 text-[12px] text-white/50">事件类别（可选）</div>
              <input value={ev.category} onChange={(e) => setEv({ ...ev, category: e.target.value })} className={inputCls} placeholder="例如 工作变动 / 人际关系" />
            </div>
            <button
              onClick={submitEvent}
              disabled={!ev.situation.trim()}
              className="rounded-lg bg-[#8AA0B5] px-4 py-2 text-sm font-medium text-[#070B14] disabled:opacity-40"
            >
              保存事件记录
            </button>
          </div>
        </Section>

        {/* 02 标准化量表填写 */}
        <Section n={3} title="标准化量表（由咨询师发起或自行完成）">
          <div className="space-y-3">
            <div className="flex gap-2">
              {Object.keys(INSTRUMENTS).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setInst(k);
                    setResponses({});
                    setScored(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[12px] transition ${
                    inst === k ? 'bg-[#7894FF] text-[#070B14]' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-white/40">{INSTRUMENTS[inst].scoringNote}</div>
            <div className="space-y-2">
              {INSTRUMENTS[inst].items.map((it) => {
                const max = inst === 'WSAS' ? 8 : 3;
                return (
                  <div key={it} className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-white/70">{it}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: max + 1 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setResponses({ ...responses, [it]: i })}
                          className={`h-7 w-7 rounded text-[11px] ${
                            (responses[it] ?? -1) === i ? 'bg-[#7894FF] text-[#070B14]' : 'bg-white/5 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={computeScore} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10">
                计算分数
              </button>
              {scored && (
                <span className="self-center text-sm text-white/80">
                  {scored.rawScore}/{scored.maxScore} · {scored.severity}
                </span>
              )}
              <button
                onClick={submitAssessment}
                className="ml-auto rounded-lg bg-[#7894FF] px-4 py-2 text-sm font-medium text-[#070B14]"
              >
                保存评估（待复核）
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
