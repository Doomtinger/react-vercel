// Flow Space Clinical · 数据模型与虚构示例数据
// 记录体系（5 类）：日常状态 / 标准化量表 / 关键事件 / 专业观察 / 风险复核
// 注意：以下均为虚构演示数据，不含任何真实个人信息。

export type RecordKind = 'assessment' | 'daily_state' | 'life_event' | 'clinical_note' | 'risk_review';

// 界面/复核状态（用于边框与证据面板）
export type WorkflowState = 'normal' | 'pending_review' | 'flagged' | 'missing_data';
export type NoteWorkflow = 'draft' | 'pending_review' | 'confirmed' | 'revised';
export type RiskLevel = 'low' | 'medium' | 'high';

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

// 01 日常状态记录（来访者填写，轻量、非标准化）
export interface DailyStateRecord {
  id: string;
  caseId: string;
  kind: 'daily_state';
  timestamp: number;
  overall: number; // 0-4：很低落 → 很好
  stress: number; // 0-4
  energy: number; // 0-4
  feelings: string[]; // 多选情绪标签
  sleep: 'good' | 'normal' | 'poor';
  impact: 0 | 1 | 2 | 3; // 日常功能影响
  notableEvent?: string; // 特别事件（可选）
  workflow?: WorkflowState;
}

// 03 关键事件记录（来访者填写，事件卡结构）
export interface LifeEventRecord {
  id: string;
  caseId: string;
  kind: 'life_event';
  timestamp: number;
  situation: string; // 发生了什么
  thoughts: string; // 当时的想法
  feelings: string; // 感受
  bodyReactions: string; // 身体反应
  behavior: string; // 当时的行为
  outcome: string; // 后来的结果
  needHelp?: string; // 现在还需要什么帮助
  category?: string;
  workflow?: WorkflowState;
}

// 04 咨询师专业观察（专业人员填写，结构化 + 版本化）
export interface ClinicalNoteRecord {
  id: string;
  caseId: string;
  kind: 'clinical_note';
  timestamp: number;
  author: string;
  topic: string; // 本次会谈主题
  clientReport: string; // 来访者报告
  observation: string; // 专业观察
  assessmentSummary?: string; // 评估结果
  hypothesis?: string; // 初步假设
  toConfirm?: string; // 需要进一步确认
  plan: string; // 后续计划
  workflow: NoteWorkflow; // draft → pending_review → confirmed → revised
  revision: number;
  revisedFrom?: string;
}

// 05 风险复核与转介记录（需专业流程）
export interface RiskReviewRecord {
  id: string;
  caseId: string;
  kind: 'risk_review';
  timestamp: number;
  signalSource: string; // 风险信号来源
  verification: string; // 人工核实结果
  action: string; // 处置措施
  responsible: string; // 责任人
  followUp: string; // 后续跟进
  riskLevel: RiskLevel;
  workflow: NoteWorkflow;
}

export type CaseRecord = AssessmentRecord | DailyStateRecord | LifeEventRecord | ClinicalNoteRecord | RiskReviewRecord;

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

// 类别 → 颜色（仅作“记录类别/工具类别”区分，不编码好/坏或疾病类型）
export const CATEGORY_COLORS: Record<string, string> = {
  Mood: '#7894FF',
  Anxiety: '#B39AFF',
  Function: '#5FD0C0',
  SelfReport: '#86E1C9',
  Event: '#8AA0B5',
  Note: '#C9A6FF',
  Risk: '#F2A65A',
};

export function recordColor(r: CaseRecord): string {
  if (r.kind === 'assessment') return CATEGORY_COLORS[INSTRUMENTS[r.instrument].category];
  if (r.kind === 'daily_state') return CATEGORY_COLORS.SelfReport;
  if (r.kind === 'life_event') return CATEGORY_COLORS.Event;
  if (r.kind === 'clinical_note') return CATEGORY_COLORS.Note;
  return CATEGORY_COLORS.Risk;
}

export function recordCategoryLabel(r: CaseRecord): string {
  switch (r.kind) {
    case 'assessment':
      return '量表评估';
    case 'daily_state':
      return '日常状态';
    case 'life_event':
      return '关键事件';
    case 'clinical_note':
      return '专业观察';
    case 'risk_review':
      return '风险复核';
  }
}

// 表单选项（来访者记录端与证据面板共用）
export const OVERALL_OPTIONS = ['很低落', '有些低落', '一般', '还不错', '很好'];
export const FEELING_TAGS = ['焦虑', '低落', '烦躁', '疲惫', '孤独', '平静', '愉快', '麻木'];
export const SLEEP_OPTIONS = [
  { v: 'good', l: '比较好' },
  { v: 'normal', l: '一般' },
  { v: 'poor', l: '不太好' },
] as const;
export const IMPACT_OPTIONS = [
  { v: 0, l: '基本没有影响' },
  { v: 1, l: '有一些影响，但大部分事情能完成' },
  { v: 2, l: '影响明显，部分事情难以完成' },
  { v: 3, l: '影响很大，基本无法正常完成' },
] as const;
export const NOTABLE_EVENT_OPTIONS = ['工作或学习', '人际关系', '家庭', '身体不适', '经济压力', '没有明显事件', '其他'];

// 计分助手：按规范计分并返回严重程度
export function severityFromScore(instrument: string, rawScore: number): string {
  if (instrument === 'PHQ-9') {
    if (rawScore <= 4) return '极小';
    if (rawScore <= 9) return '轻度';
    if (rawScore <= 14) return '中度';
    if (rawScore <= 19) return '中重度';
    return '重度';
  }
  if (instrument === 'GAD-7') {
    if (rawScore <= 4) return '极小';
    if (rawScore <= 9) return '轻度';
    if (rawScore <= 14) return '中度';
    return '重度';
  }
  if (instrument === 'WSAS') {
    if (rawScore <= 10) return '正常';
    if (rawScore <= 20) return '轻度损害';
    if (rawScore <= 30) return '中度损害';
    return '严重损害';
  }
  return '—';
}

export function scoreAssessment(
  instrument: string,
  responses: Record<string, number>
): { rawScore: number; maxScore: number; severity: string } {
  const meta = INSTRUMENTS[instrument];
  const rawScore = Object.values(responses).reduce((a, b) => a + b, 0);
  return { rawScore, maxScore: meta.maxScore, severity: severityFromScore(instrument, rawScore) };
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

// AI 辅助观察：基于现有记录生成“可能值得探索的主题”（纯前端样例，不做诊断）
export interface AISource {
  kind: string;
  date: string;
  note: string;
}
export interface AITheme {
  id: string;
  title: string;
  uncertainty: '低' | '中' | '高';
  rationale: string;
  sources: AISource[];
}

export function deriveThemes(records: CaseRecord[]): AITheme[] {
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const themes: AITheme[] = [];

  // 1) 待复核：工作流程提醒，非临床推断
  const pending = sorted.filter((r) => r.workflow === 'pending_review');
  if (pending.length) {
    themes.push({
      id: 'pending',
      title: `有待复核记录 ${pending.length} 条，建议优先核实`,
      uncertainty: '低',
      rationale: '基于界面状态标记，属于工作流程提醒，系统不据此做临床推断。',
      sources: pending.map((r) => ({ kind: recordCategoryLabel(r), date: fmtDate(r.timestamp), note: '状态：待复核' })),
    });
  }

  // 2) 日常状态中反复出现的情绪标签
  const feelingCount: Record<string, number> = {};
  const feelingRecs: Record<string, CaseRecord[]> = {};
  for (const r of sorted) {
    if (r.kind === 'daily_state') {
      for (const f of r.feelings) {
        feelingCount[f] = (feelingCount[f] ?? 0) + 1;
        (feelingRecs[f] = feelingRecs[f] ?? []).push(r);
      }
    }
  }
  for (const [f, n] of Object.entries(feelingCount)) {
    if (n >= 2) {
      themes.push({
        id: `feeling-${f}`,
        title: `来访者多次记录到「${f}」情绪（共 ${n} 次）`,
        uncertainty: '中',
        rationale: '来自来访者日常自述，反映主观体验的重复性，建议作为会谈切入点，但不构成诊断。',
        sources: feelingRecs[f].map((r) => ({ kind: '日常状态', date: fmtDate(r.timestamp), note: `感受包含「${f}」` })),
      });
    }
  }

  // 3) 风险复核：需专业人员按流程核实与处置
  for (const r of sorted) {
    if (r.kind === 'risk_review') {
      themes.push({
        id: `risk-${r.id}`,
        title: '存在风险复核记录，需确认处置与跟进闭环',
        uncertainty: '低',
        rationale: '风险复核需专业人员按流程核实与处置；系统仅呈现记录，不自动判定风险等级。',
        sources: [{ kind: '风险复核', date: fmtDate(r.timestamp), note: r.signalSource }],
      });
    }
  }

  // 4) 同工具两次评估的分数变化（仅提示，不结论）
  const byInstrument: Record<string, CaseRecord[]> = {};
  for (const r of sorted) {
    if (r.kind === 'assessment') (byInstrument[r.instrument] = byInstrument[r.instrument] ?? []).push(r);
  }
  for (const [inst, arr] of Object.entries(byInstrument)) {
    if (arr.length >= 2) {
      const first = arr[0];
      const last = arr[arr.length - 1];
      if (last.rawScore > first.rawScore) {
        themes.push({
          id: `trend-${inst}`,
          title: `${inst} 分数较首次上升（${first.rawScore} → ${last.rawScore}）`,
          uncertainty: '中',
          rationale: '仅比较同工具两次得分，提示需要结合情境与专业判断，不可单独作为结论。',
          sources: [
            { kind: '量表评估', date: fmtDate(first.timestamp), note: `${inst} ${first.rawScore} 分（${severityFromScore(inst, first.rawScore)}）` },
            { kind: '量表评估', date: fmtDate(last.timestamp), note: `${inst} ${last.rawScore} 分（${severityFromScore(inst, last.rawScore)}）` },
          ],
        });
      }
    }
  }

  // 5) 关键事件：提供可进一步询问的具体材料
  const events = sorted.filter((r) => r.kind === 'life_event');
  if (events.length) {
    themes.push({
      id: 'events',
      title: `记录到 ${events.length} 次关键事件，建议结合情境探索`,
      uncertainty: '中',
      rationale: '事件卡提供可进一步询问的具体材料；系统不将单一事件直接判定为症状原因。',
      sources: events.map((r) => ({ kind: '关键事件', date: fmtDate(r.timestamp), note: r.situation.slice(0, 24) })),
    });
  }

  return themes;
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
        id: 'daily-2041-1',
        caseId: 'case-2041',
        kind: 'daily_state',
        timestamp: D('2026-07-04'),
        overall: 1,
        stress: 3,
        energy: 1,
        feelings: ['疲惫', '低落'],
        sleep: 'poor',
        impact: 2,
        notableEvent: '工作或学习',
      },
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
        situation: '升职后责任增加，出差频繁，原定的作息被打乱。',
        thoughts: '我应该把每件事都做好，不能让人失望。',
        feelings: '压力、焦虑、疲惫',
        bodyReactions: '入睡困难，肩颈紧绷。',
        behavior: '连续加班，减少了运动和社交。',
        outcome: '短期内勉强维持，但情绪持续走低。',
        needHelp: '希望在咨询中讨论如何平衡工作与休息。',
        category: '工作变动',
      },
      {
        id: 'note-2041-1',
        caseId: 'case-2041',
        kind: 'clinical_note',
        timestamp: D('2026-07-22'),
        author: '咨询师 L',
        topic: '工作压力与睡眠',
        clientReport: '来访者主诉压力上升、入睡困难，但自述对工作仍有掌控感。',
        observation: '会谈中语速偏快，数次叹气；提及家庭支持时神情放松。',
        assessmentSummary: 'PHQ-9 轻度（缺 1 项）；GAD-7 极小。',
        hypothesis: '压力可能主要来自角色转换后的自我要求，而非客观负荷。',
        toConfirm: '自伤念头缺失项需在下次补全，并确认安全性。',
        plan: '两周后复评 PHQ-9；布置睡眠节律记录。',
        workflow: 'draft',
        revision: 1,
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
        id: 'risk-2041-1',
        caseId: 'case-2041',
        kind: 'risk_review',
        timestamp: D('2026-08-06'),
        signalSource: 'PHQ-9 自伤念头条目得 2 分（每周有几天）',
        verification: '经咨询师电话回访，来访者否认主动自杀意图，有求助意愿。',
        action: '启动周随访；提供 24h 求助渠道；告知紧急联系人。',
        responsible: '咨询师 L（督导 R 复核）',
        followUp: '7 日内复评并确认安全计划。',
        riskLevel: 'medium',
        workflow: 'confirmed',
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
        id: 'daily-2041-2',
        caseId: 'case-2041',
        kind: 'daily_state',
        timestamp: D('2026-09-21'),
        overall: 2,
        stress: 2,
        energy: 2,
        feelings: ['平静'],
        sleep: 'normal',
        impact: 1,
      },
      {
        id: 'evt-2041-2',
        caseId: 'case-2041',
        kind: 'life_event',
        timestamp: D('2026-09-20'),
        situation: '与家人关系改善，获得稳定支持。',
        thoughts: '原来我并不是一个人面对这些。',
        feelings: '安心、稍微轻松',
        bodyReactions: '紧张感较前期下降。',
        behavior: '开始恢复运动，主动约朋友。',
        outcome: '情绪逐步平稳。',
        needHelp: '暂无，希望巩固现有节奏。',
        category: '家庭支持增强',
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
        topic: '阶段回顾',
        clientReport: '近两周情绪较平稳，睡眠改善，功能逐步恢复。',
        observation: '会谈状态放松，能主动反思；无急性风险信号。',
        assessmentSummary: 'PHQ-9 轻度；WSAS 中度损害（较 8 月下降）。',
        hypothesis: '支持性资源增加后，主观困扰与功能同步改善。',
        toConfirm: '功能损害仍需持续观察，尤其工作领域。',
        plan: '改为月度随访；下次会谈聚焦职业角色期待。',
        workflow: 'confirmed',
        revision: 2,
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
        id: 'daily-2099-1',
        caseId: 'case-2099',
        kind: 'daily_state',
        timestamp: D('2026-07-21'),
        overall: 3,
        stress: 1,
        energy: 3,
        feelings: ['平静', '愉快'],
        sleep: 'good',
        impact: 0,
      },
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
        situation: '搬迁至新城市，社交圈暂时减少。',
        thoughts: '换个环境也许能轻松一点。',
        feelings: '期待中带一点不安',
        bodyReactions: '无明显躯体不适。',
        behavior: '主动整理新居，规划作息。',
        outcome: '适应顺利。',
        needHelp: '暂无。',
        category: '搬迁',
      },
      {
        id: 'note-2099-1',
        caseId: 'case-2099',
        kind: 'clinical_note',
        timestamp: D('2026-09-25'),
        author: '咨询师 M',
        topic: '适应期随访',
        clientReport: '自述适应期，轻度焦虑，整体功能未受损。',
        observation: '情绪平稳，表达清晰，资源丰富。',
        assessmentSummary: 'PHQ-9 极小；GAD-7 极小。',
        hypothesis: '当前为良性适应过程，无需强化干预。',
        toConfirm: '—',
        plan: '常规月度随访。',
        workflow: 'confirmed',
        revision: 1,
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
