// Flow Space Clinical · 数据模型与虚构示例数据
// 注意：以下均为虚构演示数据，不含任何真实个人信息。

export type RecordKind = 'assessment' | 'life_event' | 'clinical_note' | 'review';
export type WorkflowState = 'normal' | 'pending_review' | 'flagged' | 'missing_data';

export interface AssessmentRecord {
  id: string;
  caseId: string;
  kind: 'assessment';
  timestamp: number;
  instrument: string; // PHQ-9 / GAD-7 / WSAS
  instrumentVersionId: string;
  locale: string;
  scoringAlgorithmVersion: string;
  rawScore: number;
  maxScore: number;
  rawResponses: Record<string, number | null>;
  missingItems: string[];
  interpretation: { ruleId: string; severity: string; note?: string; reference?: string };
  reviewedBy?: string;
  reviewedAt?: number;
  workflow?: WorkflowState;
}

export interface LifeEventRecord {
  id: string;
  caseId: string;
  kind: 'life_event';
  timestamp: number;
  category: string;
  content: string;
  workflow?: WorkflowState;
}

export interface ClinicalNoteRecord {
  id: string;
  caseId: string;
  kind: 'clinical_note';
  timestamp: number;
  author: string;
  content: string;
  status: 'draft' | 'final';
  workflow?: WorkflowState;
}

export interface ReviewRecord {
  id: string;
  caseId: string;
  kind: 'review';
  timestamp: number;
  reviewer: string;
  finding: string;
  action: string;
  workflow?: WorkflowState;
}

export type CaseRecord = AssessmentRecord | LifeEventRecord | ClinicalNoteRecord | ReviewRecord;

export interface HypothesisLink {
  from: string;
  to: string;
  note: string;
}

export interface ClinicalCase {
  id: string;
  code: string;
  alias: string;
  organization: string;
  assignedTo: string;
  consentVersion: string;
  status: string;
  records: CaseRecord[];
  hypotheses: HypothesisLink[];
}

// 量表元数据：类别、版本、计分规则、适用范围
export const INSTRUMENTS: Record<
  string,
  { category: string; maxScore: number; version: string; locale: string; rule: string; reference: string; scoringNote: string; items: string[] }
> = {
  'PHQ-9': {
    category: 'Mood',
    maxScore: 27,
    version: 'PHQ-9/v1.1/en',
    locale: 'zh-CN',
    rule: 'PHQ-9.severity.v1',
    reference: 'Kroenke et al. 2001',
    scoringNote: '9 个条目各 0–3 分累加；0–4 极小，5–9 轻度，10–14 中度，15–19 中重度，20–27 重度。',
    items: ['兴趣减退', '情绪低落', '睡眠问题', '精力不足', '食欲变化', '自我评价低', '注意力难集中', '动作迟缓或不安', '自伤念头'],
  },
  'GAD-7': {
    category: 'Anxiety',
    maxScore: 21,
    version: 'GAD-7/v1.0/en',
    locale: 'zh-CN',
    rule: 'GAD-7.severity.v1',
    reference: 'Spitzer et al. 2006',
    scoringNote: '7 个条目各 0–3 分累加；0–4 极小，5–9 轻度，10–14 中度，15–21 重度。',
    items: ['紧张不安', '无法停止担忧', '过度担心', '放松困难', '坐立不安', '易烦躁', '害怕最坏结果'],
  },
  WSAS: {
    category: 'Function',
    maxScore: 40,
    version: 'WSAS/v1.0/en',
    locale: 'zh-CN',
    rule: 'WSAS.impairment.v1',
    reference: 'Mundt et al. 2002',
    scoringNote: '5 个功能领域各 0–8 分累加；0–10 正常，11–20 轻度损害，21–30 中度损害，31–40 严重损害。',
    items: ['工作', '居家任务', '社交活动', '私人休憩', '亲密关系'],
  },
};

// 类别 → 颜色（仅作“工具类别”区分，不编码好/坏或疾病类型）
export const CATEGORY_COLORS: Record<string, string> = {
  Mood: '#7894FF',
  Anxiety: '#B39AFF',
  Function: '#5FD0C0',
  Event: '#8AA0B5',
  Note: '#9AA7B5',
  Review: '#7FE0A0',
};

export function recordColor(r: CaseRecord): string {
  if (r.kind === 'assessment') return CATEGORY_COLORS[INSTRUMENTS[r.instrument].category];
  if (r.kind === 'life_event') return CATEGORY_COLORS.Event;
  if (r.kind === 'clinical_note') return CATEGORY_COLORS.Note;
  return CATEGORY_COLORS.Review;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${fmtDate(ts)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const D = (s: string) => new Date(s + 'T09:00:00').getTime();

export const CASES: ClinicalCase[] = [
  {
    id: 'case-2041',
    code: 'CASE-2041',
    alias: '来访者 A · 虚构',
    organization: '示例心理机构',
    assignedTo: '咨询师 L',
    consentVersion: 'Consent/v2.3 (2026-06)',
    status: '随访中',
    hypotheses: [{ from: 'evt-2041-1', to: 'phq-2041-4', note: '待验证：7 月工作变动是否与 8 月 PHQ-9 升高相关' }],
    records: [
      {
        id: 'phq-2041-1',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-07-03'),
        instrument: 'PHQ-9',
        instrumentVersionId: 'PHQ-9/v1.1/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'PHQ-9.score.v1',
        rawScore: 8,
        maxScore: 27,
        rawResponses: { 兴趣减退: 2, 情绪低落: 1, 睡眠问题: 2, 精力不足: 1, 食欲变化: 0, 自我评价低: 1, 注意力难集中: 1, 动作迟缓或不安: 0, 自伤念头: null },
        missingItems: ['自伤念头'],
        interpretation: { ruleId: 'PHQ-9.severity.v1', severity: '轻度', note: '缺 1 项，按有效项计分。', reference: 'Kroenke et al. 2001' },
        reviewedBy: '咨询师 L',
        reviewedAt: D('2026-07-05'),
        workflow: 'missing_data',
      },
      {
        id: 'gad-2041-1',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-07-10'),
        instrument: 'GAD-7',
        instrumentVersionId: 'GAD-7/v1.0/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'GAD-7.score.v1',
        rawScore: 4,
        maxScore: 21,
        rawResponses: { 紧张不安: 1, 无法停止担忧: 1, 过度担心: 0, 放松困难: 1, 坐立不安: 0, 易烦躁: 1, 害怕最坏结果: 0 },
        missingItems: [],
        interpretation: { ruleId: 'GAD-7.severity.v1', severity: '极小', reference: 'Spitzer et al. 2006' },
        reviewedBy: '咨询师 L',
        reviewedAt: D('2026-07-12'),
      },
      {
        id: 'evt-2041-1',
        caseId: 'case-2041',
        kind: 'life_event',
        timestamp: D('2026-07-15'),
        category: '工作变动',
        content: '升职后责任增加，出差频繁，作息被打乱。',
      },
      {
        id: 'note-2041-1',
        caseId: 'case-2041',
        kind: 'clinical_note',
        timestamp: D('2026-07-22'),
        author: '咨询师 L',
        content: '来访者主诉压力上升，入睡困难，但对工作仍有掌控感。',
        status: 'draft',
      },
      {
        id: 'phq-2041-4',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-08-05'),
        instrument: 'PHQ-9',
        instrumentVersionId: 'PHQ-9/v1.1/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'PHQ-9.score.v1',
        rawScore: 18,
        maxScore: 27,
        rawResponses: { 兴趣减退: 3, 情绪低落: 2, 睡眠问题: 3, 精力不足: 2, 食欲变化: 1, 自我评价低: 2, 注意力难集中: 2, 动作迟缓或不安: 1, 自伤念头: 2 },
        missingItems: [],
        interpretation: { ruleId: 'PHQ-9.severity.v1', severity: '中重度', reference: 'Kroenke et al. 2001' },
        workflow: 'pending_review',
      },
      {
        id: 'rev-2041-1',
        caseId: 'case-2041',
        kind: 'review',
        timestamp: D('2026-08-20'),
        reviewer: '督导 R',
        finding: '情绪与睡眠需重点关注，自伤念头为 2 分需复核。',
        action: '增加随访频率，建议加入睡眠干预。',
      },
      {
        id: 'gad-2041-2',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-09-01'),
        instrument: 'GAD-7',
        instrumentVersionId: 'GAD-7/v1.0/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'GAD-7.score.v1',
        rawScore: 11,
        maxScore: 21,
        rawResponses: { 紧张不安: 2, 无法停止担忧: 2, 过度担心: 1, 放松困难: 2, 坐立不安: 1, 易烦躁: 2, 害怕最坏结果: 1 },
        missingItems: [],
        interpretation: { ruleId: 'GAD-7.severity.v1', severity: '中度', reference: 'Spitzer et al. 2006' },
        reviewedBy: '咨询师 L',
        reviewedAt: D('2026-09-03'),
      },
      {
        id: 'phq-2041-6',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-09-12'),
        instrument: 'PHQ-9',
        instrumentVersionId: 'PHQ-9/v1.1/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'PHQ-9.score.v1',
        rawScore: 10,
        maxScore: 27,
        rawResponses: { 兴趣减退: 2, 情绪低落: 1, 睡眠问题: 2, 精力不足: 1, 食欲变化: 1, 自我评价低: 1, 注意力难集中: 1, 动作迟缓或不安: 0, 自伤念头: 1 },
        missingItems: [],
        interpretation: { ruleId: 'PHQ-9.severity.v1', severity: '中度', reference: 'Kroenke et al. 2001' },
        reviewedBy: '咨询师 L',
        reviewedAt: D('2026-09-14'),
      },
      {
        id: 'evt-2041-2',
        caseId: 'case-2041',
        kind: 'life_event',
        timestamp: D('2026-09-20'),
        category: '家庭支持增强',
        content: '与家人关系改善，获得稳定支持。',
      },
      {
        id: 'wsas-2041-1',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-10-01'),
        instrument: 'WSAS',
        instrumentVersionId: 'WSAS/v1.0/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'WSAS.score.v1',
        rawScore: 18,
        maxScore: 40,
        rawResponses: { 工作: 4, 居家任务: 3, 社交活动: 4, 私人休憩: 4, 亲密关系: 3 },
        missingItems: [],
        interpretation: { ruleId: 'WSAS.impairment.v1', severity: '中度损害', reference: 'Mundt et al. 2002' },
        reviewedBy: '咨询师 L',
        reviewedAt: D('2026-10-03'),
      },
      {
        id: 'phq-2041-8',
        caseId: 'case-2041',
        kind: 'assessment',
        timestamp: D('2026-10-08'),
        instrument: 'PHQ-9',
        instrumentVersionId: 'PHQ-9/v1.1/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'PHQ-9.score.v1',
        rawScore: 6,
        maxScore: 27,
        rawResponses: { 兴趣减退: 1, 情绪低落: 1, 睡眠问题: 1, 精力不足: 1, 食欲变化: 0, 自我评价低: 1, 注意力难集中: 0, 动作迟缓或不安: 0, 自伤念头: 1 },
        missingItems: [],
        interpretation: { ruleId: 'PHQ-9.severity.v1', severity: '轻度', reference: 'Kroenke et al. 2001' },
        reviewedBy: '咨询师 L',
        reviewedAt: D('2026-10-10'),
      },
      {
        id: 'note-2041-2',
        caseId: 'case-2041',
        kind: 'clinical_note',
        timestamp: D('2026-10-12'),
        author: '咨询师 L',
        content: '近两周情绪较平稳，睡眠改善，功能逐步恢复。',
        status: 'final',
      },
    ],
  },
  {
    id: 'case-2099',
    code: 'CASE-2099',
    alias: '来访者 B · 虚构',
    organization: '示例心理机构',
    assignedTo: '咨询师 M',
    consentVersion: 'Consent/v2.3 (2026-06)',
    status: '稳定随访',
    hypotheses: [],
    records: [
      {
        id: 'phq-2099-1',
        caseId: 'case-2099',
        kind: 'assessment',
        timestamp: D('2026-07-20'),
        instrument: 'PHQ-9',
        instrumentVersionId: 'PHQ-9/v1.1/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'PHQ-9.score.v1',
        rawScore: 4,
        maxScore: 27,
        rawResponses: { 兴趣减退: 1, 情绪低落: 1, 睡眠问题: 1, 精力不足: 0, 食欲变化: 0, 自我评价低: 1, 注意力难集中: 0, 动作迟缓或不安: 0, 自伤念头: 0 },
        missingItems: [],
        interpretation: { ruleId: 'PHQ-9.severity.v1', severity: '极小', reference: 'Kroenke et al. 2001' },
        reviewedBy: '咨询师 M',
        reviewedAt: D('2026-07-22'),
      },
      {
        id: 'gad-2099-1',
        caseId: 'case-2099',
        kind: 'assessment',
        timestamp: D('2026-08-15'),
        instrument: 'GAD-7',
        instrumentVersionId: 'GAD-7/v1.0/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'GAD-7.score.v1',
        rawScore: 2,
        maxScore: 21,
        rawResponses: { 紧张不安: 0, 无法停止担忧: 1, 过度担心: 0, 放松困难: 1, 坐立不安: 0, 易烦躁: 0, 害怕最坏结果: 0 },
        missingItems: [],
        interpretation: { ruleId: 'GAD-7.severity.v1', severity: '极小', reference: 'Spitzer et al. 2006' },
        reviewedBy: '咨询师 M',
        reviewedAt: D('2026-08-17'),
      },
      {
        id: 'evt-2099-1',
        caseId: 'case-2099',
        kind: 'life_event',
        timestamp: D('2026-09-10'),
        category: '搬迁',
        content: '搬迁至新城市，社交圈暂时减少。',
      },
      {
        id: 'note-2099-1',
        caseId: 'case-2099',
        kind: 'clinical_note',
        timestamp: D('2026-09-25'),
        author: '咨询师 M',
        content: '适应期，轻度焦虑，整体功能未受损。',
        status: 'final',
      },
      {
        id: 'phq-2099-2',
        caseId: 'case-2099',
        kind: 'assessment',
        timestamp: D('2026-10-10'),
        instrument: 'PHQ-9',
        instrumentVersionId: 'PHQ-9/v1.1/en',
        locale: 'zh-CN',
        scoringAlgorithmVersion: 'PHQ-9.score.v1',
        rawScore: 1,
        maxScore: 27,
        rawResponses: { 兴趣减退: 0, 情绪低落: 0, 睡眠问题: 1, 精力不足: 0, 食欲变化: 0, 自我评价低: 0, 注意力难集中: 0, 动作迟缓或不安: 0, 自伤念头: 0 },
        missingItems: [],
        interpretation: { ruleId: 'PHQ-9.severity.v1', severity: '极小', reference: 'Kroenke et al. 2001' },
        reviewedBy: '咨询师 M',
        reviewedAt: D('2026-10-12'),
      },
    ],
  },
];

export const METRIC_OPTIONS = ['none', 'PHQ-9', 'GAD-7', 'WSAS'] as const;
export type MetricOption = (typeof METRIC_OPTIONS)[number];
