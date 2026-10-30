/**
 * 情绪反馈 · MUST-03 标准化「情绪 → 图形 → 色彩 → 动态」映射规则
 *
 * v1.2.0 细化版：4 大类基础形态 + 平静兜底态 + 复合情绪融合
 *  1. 弥散低落 · 云雾形态（无闭环、向外漫开下沉的流体）
 *  2. 思维反刍 · 内收螺旋形态（带状柔滑曲线，向内收拢，无尖角）
 *  3. 冲突拉扯 · 带尖角交织螺旋（悲伤蓝 + 躁动暗红双带交织，细碎软尖角）
 *  4. 麻木封闭 · 固化团块形态（闭合紧实形体，近乎静止）
 *  +. 平静松弛 · 舒展波纹（兜底态：未命中情绪词或正面情绪时使用）
 *
 * 设计约束：
 * - 完全确定性：相同输入文本 → 相同结构化参数 → 相同的图形、色彩与动画；
 * - 禁止随机：唯一的"个性偏移"来自文本哈希（djb2），同文本哈希恒定，仅影响相位；
 * - 色板固定低饱和色号，禁止随机取色、禁止高饱和刺眼色；
 * - 尖角/破碎只做柔和细碎：柔和模式下抹除全部尖角、关闭全部抖动；
 * - 统一低饱和中性底色（暗 #181922 / 亮 #f6f7fa），不抢图形；
 * - 单轮动画周期 3~6s，低帧率低刺激，拒绝快节奏与频闪；
 * - 复合情绪：主情绪作为主体几何，次要情绪作为包裹流体/附属图层融合穿插；
 *   有冲突（尖角）时优先保留尖角特征；
 * - 映射表版本化管理：调整规则需递增 RULES_VERSION；
 * - 历史记录绑定生成时的版本与参数，规则迭代不回溯重绘旧图形（静默刷新）。
 */

/**
 * 映射规则版本：每次调整下方任何映射表都必须递增
 * v1.3.0 新增「兴奋激昂 · 上升光尘」扩展态；痛苦/难受归入弥散低落；
 *        开心/快乐/幸福等高唤起正面词自平静移入兴奋激昂
 * v1.4.0 增值能力：高危拦截、可选元数据标签（触发类型/躯体感受）、分层隐喻、
 *        觉察引导问句、情绪流动注解、中性变化提示、手动微调来源标记
 */
export const RULES_VERSION = 'v1.4.0';

export type EmotionCategory = 'diffuse-low' | 'rumination' | 'conflict' | 'numbness' | 'excited' | 'calm';
export type IntensityLevel = 'light' | 'medium' | 'heavy';
export type ShapeForm = 'cloud' | 'spiral' | 'conflict-spiral' | 'solid-block' | 'ripple' | 'ascending';

/** 强度等级（Ⅰ 轻度 / Ⅱ 中度 / Ⅲ 重度）→ 统一程序参数 */
export interface IntensityRule {
  label: string;
  rings: number; // 螺旋圈数：Ⅰ 2~3 / Ⅱ 4~6 / Ⅲ 7+
  strokeOpacity: number;
  jitterAmp: number; // 扰动幅度 px（仅冲突拉扯形态生效，恒为低幅）
  rotationSpeed: number; // 旋转角速度 deg/s（缓慢）
  contraction: number; // 向内收缩幅度 0-1
  flowSpeed: number; // 云雾下沉 / 波纹扩散速度倍率
}

export const INTENSITY_RULES: Record<IntensityLevel, IntensityRule> = {
  light: { label: 'Ⅰ 轻度', rings: 3, strokeOpacity: 0.6, jitterAmp: 0.5, rotationSpeed: 4, contraction: 0.03, flowSpeed: 1.0 },
  medium: { label: 'Ⅱ 中度', rings: 5, strokeOpacity: 0.72, jitterAmp: 1.0, rotationSpeed: 7, contraction: 0.1, flowSpeed: 1.5 },
  heavy: { label: 'Ⅲ 重度', rings: 7, strokeOpacity: 0.82, jitterAmp: 1.6, rotationSpeed: 10, contraction: 0.18, flowSpeed: 2.0 },
};

/** 情绪标签 → 形态 / 固定色板 / 动态特质 */
export interface CategoryRule {
  label: string;
  form: ShapeForm;
  formLabel: string;
  palette: Record<IntensityLevel, string>;
  /** 冲突拉扯专属：双色板 [悲伤蓝, 躁动暗红] */
  palettePair?: Record<IntensityLevel, [string, string]>;
  motion: string;
  /** 兜底态（非四大类，用于未命中或正面情绪） */
  isDefaultState?: boolean;
}

export const CATEGORY_RULES: Record<EmotionCategory, CategoryRule> = {
  'diffuse-low': {
    label: '弥散低落',
    form: 'cloud',
    formLabel: '下沉云雾',
    palette: { light: '#b8c8e0', medium: '#7c94b8', heavy: '#4a5b78' },
    motion: '缓慢匀速下沉，无抖动、无旋转、无收缩，边缘消融弥散',
  },
  rumination: {
    label: '思维反刍',
    form: 'spiral',
    formLabel: '内收螺旋',
    palette: { light: '#c9b8dd', medium: '#8c70a8', heavy: '#5c4475' },
    motion: '缓慢收缩 + 缓慢自转，带状柔滑线条，无尖角',
  },
  conflict: {
    label: '冲突拉扯',
    form: 'conflict-spiral',
    formLabel: '带尖角交织螺旋',
    palette: { light: '#b8c8e0', medium: '#7c94b8', heavy: '#4a5b78' },
    palettePair: {
      light: ['#b8c8e0', '#c98890'],
      medium: ['#7c94b8', '#884850'],
      heavy: ['#4a5b78', '#582830'],
    },
    motion: '收缩自转 + 低幅高频微抖动，双带交织，细碎软尖角',
  },
  numbness: {
    label: '麻木封闭',
    form: 'solid-block',
    formLabel: '固化团块',
    palette: { light: '#b0b4b8', medium: '#787c80', heavy: '#444648' },
    motion: '近乎静止，仅极微弱呼吸式缩放，无流动无旋转',
  },
  excited: {
    label: '兴奋激昂',
    form: 'ascending',
    formLabel: '上升光尘',
    palette: { light: '#E8CFA8', medium: '#D9B37E', heavy: '#C29A5C' },
    motion: '光点缓缓上升漂浮，轻快明亮，无抖动',
  },
  calm: {
    label: '平静松弛',
    form: 'ripple',
    formLabel: '舒展向外波纹',
    palette: { light: '#A9CBD8', medium: '#9CC3AD', heavy: '#84B39C' },
    motion: '缓慢向外扩散（兜底态：未命中情绪词或正面情绪时使用）',
    isDefaultState: true,
  },
};

/** 平静波纹的第二色（浅绿），与浅天蓝交替 */
export const CALM_ACCENT = '#A6CBAD';

/** 兴奋光尘的第二色（奶金），与暖金交替 */
export const EXCITED_ACCENT = '#F2E3C4';

/** 统一低饱和中性底色（不抢图形） */
export const STAGE_BG_DARK = '#181922';
export const STAGE_BG_LIGHT = '#f6f7fa';

/** 结构化情绪信号（NLP：确定性关键词规则提取，非 AI 随机生成） */
export interface EmotionSignal {
  primary: EmotionCategory;
  compound: EmotionCategory[]; // 复合情绪（最多 2 个次要情绪）
  intensity: IntensityLevel;
  isRumination: boolean; // 是否思维反刍循环
  categoryScores: Record<EmotionCategory, number>;
  matchedKeywords: string[];
  matched: boolean; // 是否命中任何情绪词
  seed: number; // 文本哈希，仅用于相位偏移
}

/**
 * 确定性文本哈希（djb2）。同一段文本永远得到同一个 seed，
 * 用于给图形一个稳定的初始相位——保证"同文本 → 同图形"。
 */
export function hashText(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function countOccurrences(text: string, kw: string): number {
  return text.split(kw).length - 1;
}

/**
 * 情绪大类关键词词典
 * v1.2 迁移：panic→反刍；oppression→麻木封闭；孤独疏离→弥散低落；委屈/自我攻击→冲突拉扯
 * v1.3 迁移：痛苦/难受/煎熬→弥散低落；开心/快乐/幸福/喜悦→兴奋激昂
 */
export const CATEGORY_KEYWORDS: Record<EmotionCategory, string[]> = {
  'diffuse-low': ['低落', '难过', '伤心', '沮丧', '消沉', '失落', '空虚', '疲惫', '无力', '提不起', '没意思', '郁闷', '不开心', '想哭', '灰心', '泄气', '心酸', 'emo', '孤独', '孤单', '疏离', '格格不入', '没人懂', '疏远', '被孤立', '独处', '痛苦', '难受', '煎熬', '挣扎', '心如刀绞'],
  rumination: ['内耗', '反刍', '纠结', '反复', '想不通', '走不出', '困在', '停不下来', '停不下', '钻牛角尖', '自我怀疑', '胡思乱想', '放不下', '越想', '循环', '翻来覆去', '失眠', '想太多', '焦虑', '心慌', '慌', '不安', '紧张', '害怕', '恐惧', '担心', '担忧', '忐忑', '坐立不安', '心神不宁'],
  conflict: ['愤怒', '生气', '恼火', '火大', '气死', '烦躁', '暴躁', '气愤', '易怒', '不公平', '不公', '凭什么', '吵架', '冲突', '争执', '被指责', '被误解', '不服', '委屈', '不甘', '憋屈', '自责', '自我攻击', '怪自己', '都是我'],
  numbness: ['麻木', '空洞', '空荡荡', '没感觉', '无感', '不真实', '恍惚', '呆滞', '行尸走肉', '心如死水', '停滞', '压抑', '憋闷', '喘不过气', '透不过', '沉重', '压得', '压着', '胸口堵', '胸闷', '喘不上气', '封闭', '心里关上了'],
  excited: ['兴奋', '激动', '开心', '快乐', '幸福', '喜悦', '期待', '盼望', '雀跃', '惊喜', '跃跃欲试', '干劲', '兴高采烈', '手舞足蹈', '充满能量'],
  calm: ['平静', '放松', '松弛', '安心', '舒服', '惬意', '宁静', '释然', '踏实', '舒缓', '自在', '满足', '轻松', '治愈'],
};

/** 强度程度词词典：多档同时命中时取最高档（v1.3：「痛苦」移入弥散低落类别词） */
export const INTENSITY_KEYWORDS: Record<IntensityLevel, string[]> = {
  heavy: ['崩溃', '窒息', '绝望', '极度', '无法', '完全', '失控', '撑不住', '严重', '要疯', '疯掉'],
  medium: ['特别', '非常', '很', '总是', '一直', '持续', '反复', '无数次'],
  light: ['有点', '一点', '稍微', '些许', '轻微', '偶尔', '有时', '些'],
};

/** 主情绪平局优先级（得分相同时按此顺序，规则文档中公示） */
const PRIMARY_PRIORITY: EmotionCategory[] = ['rumination', 'conflict', 'diffuse-low', 'numbness', 'excited', 'calm'];

/**
 * 确定性文本分析：提取情绪大类、强度、是否反刍、复合情绪。
 * 纯关键词规则，无随机、无 AI —— 同文本永远得到同结果。
 */
export function analyzeEmotion(rawText: string): EmotionSignal {
  const text = rawText.trim().toLowerCase();

  const categoryScores: Record<EmotionCategory, number> = {
    'diffuse-low': 0,
    rumination: 0,
    conflict: 0,
    numbness: 0,
    excited: 0,
    calm: 0,
  };
  const matchedByCategory: Record<EmotionCategory, string[]> = {
    'diffuse-low': [],
    rumination: [],
    conflict: [],
    numbness: [],
    excited: [],
    calm: [],
  };

  for (const cat of Object.keys(CATEGORY_KEYWORDS) as EmotionCategory[]) {
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      const n = countOccurrences(text, kw);
      if (n > 0) {
        categoryScores[cat] += n;
        if (!matchedByCategory[cat].includes(kw)) matchedByCategory[cat].push(kw);
      }
    }
  }

  const matched = Object.values(categoryScores).some((s) => s > 0);

  // 主情绪：得分最高；平局按 PRIMARY_PRIORITY；全部未命中则默认平静兜底态
  let primary: EmotionCategory = 'calm';
  let best = 0;
  for (const cat of PRIMARY_PRIORITY) {
    if (categoryScores[cat] > best) {
      best = categoryScores[cat];
      primary = cat;
    }
  }

  // 复合情绪：其余得分 > 0 的类别，最多取 2 个
  const compound = (Object.keys(categoryScores) as EmotionCategory[])
    .filter((c) => c !== primary && categoryScores[c] > 0)
    .slice(0, 2);

  // 强度：程度词多档命中取最高档
  let intensity: IntensityLevel = 'medium';
  let intensityHit = false;
  if (INTENSITY_KEYWORDS.heavy.some((k) => text.includes(k))) {
    intensity = 'heavy';
    intensityHit = true;
  } else if (INTENSITY_KEYWORDS.medium.some((k) => text.includes(k))) {
    intensity = 'medium';
    intensityHit = true;
  } else if (INTENSITY_KEYWORDS.light.some((k) => text.includes(k))) {
    intensity = 'light';
    intensityHit = true;
  }
  // 未命中程度词：平静兜底默认轻度（避免兜底图形过浓），其余默认中度
  if (!intensityHit) intensity = primary === 'calm' ? 'light' : 'medium';

  const isRumination = categoryScores.rumination > 0;

  const matchedKeywords = (Object.keys(matchedByCategory) as EmotionCategory[]).flatMap(
    (c) => matchedByCategory[c]
  );

  return {
    primary,
    compound,
    intensity,
    isRumination,
    categoryScores,
    matchedKeywords,
    matched,
    seed: hashText(text),
  };
}

/** 映射后的完整图形渲染参数（历史记录直接存储此对象 → 规则迭代不重绘旧图） */
export interface ShapeParams {
  seed: number;
  form: ShapeForm;
  primary: EmotionCategory;
  compound: EmotionCategory[];
  intensity: IntensityLevel;
  rings: number;
  strokeOpacity: number;
  jitterAmp: number;
  rotationSpeed: number;
  contraction: number;
  flowSpeed: number;
  spikeCount: number; // 仅冲突拉扯 > 0：细碎软尖角数量
  colors: string[]; // 冲突拉扯 = [悲伤蓝, 躁动红, ...复合色]，其余 = [主色, ...复合色]
  compoundColorStart: number; // 复合情绪颜色在 colors 中的起始下标
  bgTint: string; // 统一中性底色
}

/** 结构化信号 → 图形参数（查固定映射表，无任何随机） */
export function mapToShapeParams(signal: EmotionSignal): ShapeParams {
  const level = INTENSITY_RULES[signal.intensity];
  const primaryRule = CATEGORY_RULES[signal.primary];

  let colors: string[];
  let compoundColorStart: number;
  if (primaryRule.palettePair) {
    // 冲突拉扯：双带各自取色
    colors = [...primaryRule.palettePair[signal.intensity]];
    compoundColorStart = 2;
  } else {
    colors = [primaryRule.palette[signal.intensity]];
    compoundColorStart = 1;
  }
  for (const c of signal.compound) {
    const rule = CATEGORY_RULES[c];
    // 次要情绪若为冲突拉扯，取其躁动红（保留尖角躁动特征）
    colors.push(rule.palettePair ? rule.palettePair[signal.intensity][1] : rule.palette[signal.intensity]);
  }

  // 尖角数量仅冲突拉扯：Ⅰ 零星少量 / Ⅲ 分布整条螺旋（圈数 × 1.7 + 4）
  const spikeCount = signal.primary === 'conflict' ? Math.round(4 + level.rings * 1.7) : 0;

  return {
    seed: signal.seed,
    form: primaryRule.form,
    primary: signal.primary,
    compound: signal.compound,
    intensity: signal.intensity,
    rings: level.rings,
    strokeOpacity: level.strokeOpacity,
    jitterAmp: level.jitterAmp,
    rotationSpeed: level.rotationSpeed,
    contraction: level.contraction,
    flowSpeed: level.flowSpeed,
    spikeCount,
    colors,
    compoundColorStart,
    bgTint: STAGE_BG_DARK,
  };
}

/** 图形下方绑定的隐喻解读文案（与映射规则绑定） */
const FORM_METAPHOR: Record<EmotionCategory, string> = {
  'diffuse-low': '这片下沉的云雾，代表一种没有明确缘由的沉重低落，情绪弥散开来，说不清源头，只是持续的疲惫与沉闷。',
  rumination: '向内收拢的螺旋，代表你正在陷入思维反刍，思绪反复绕回同一件事，不断消耗自己。',
  conflict: '交织的螺旋带着细碎尖角，代表你同时承载着难过与愤懑，两种情绪互相拉扯、对抗，内心持续紧绷。',
  numbness: '这个封闭的团块，代表你暂时把情绪隔绝起来，内心进入麻木、封闭的状态，感受暂时停滞。',
  excited: '点点光尘缓缓上升——雀跃的心情在胸口发亮，轻快地往上飘，藏都藏不住。',
  calm: '波纹一层层向外舒展——心里的水面安静下来，涟漪慢慢散开，越来越宽。',
};

const INTENSITY_LINE: Record<IntensityLevel, string> = {
  light: '当前强度：Ⅰ 轻度——形态松散通透，动态舒缓。',
  medium: '当前强度：Ⅱ 中度——结构变密，动态略快。',
  heavy: '当前强度：Ⅲ 重度——结构致密紧凑，动态最沉。',
};

export function buildInterpretation(signal: EmotionSignal): string {
  const parts = [FORM_METAPHOR[signal.primary], INTENSITY_LINE[signal.intensity]];
  if (signal.compound.length > 0) {
    parts.push(
      `检测到复合情绪（${signal.compound.map((c) => CATEGORY_RULES[c].label).join('、')}）：主情绪作为主体几何，次要情绪作为包裹流体/附属图层融合穿插——它们同时真实地存在。`
    );
  }
  return parts.join(' ');
}

/** 情绪大类中文名 */
export function categoryLabel(cat: EmotionCategory): string {
  return CATEGORY_RULES[cat].label;
}

/* ============================================================
 * v1.4 增值能力（不改变基础映射；守住合规红线：不诊断、不做医疗判定、不做测谎）
 * ============================================================ */

/** 高危信号词：命中即阻断图形生成，仅提供支持信息（优先级最高） */
export const CRISIS_KEYWORDS = ['自杀', '轻生', '不想活', '活不下去', '自残', '伤害自己', '结束生命', '了结自己', '割腕', '跳楼', '遗书'];

export function containsCrisisSignal(text: string): boolean {
  const t = text.trim().toLowerCase();
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

/** 快捷情绪锚点（可选附加标签，仅元数据，不参与形态判定，供后续复盘统计） */
export const TRIGGER_TAGS = ['人际矛盾', '工作压力', '自我苛责', '无来由低落', '创伤回想', '释怀放松'] as const;

/** 躯体感受附加标记（可选元数据；解读文案温和引用，不与图形渲染强绑定） */
export const BODY_TAGS = ['胸口发闷', '心慌', '疲惫', '紧绷', '窒息感'] as const;

const BODY_NOTE_PHRASE: Record<string, string> = {
  胸口发闷: '同时你感受到胸口发闷',
  心慌: '同时你感受到一阵心慌',
  疲惫: '同时身体传来疲惫的信号',
  紧绷: '同时你感受到身体的紧绷',
  窒息感: '同时你感受到一丝窒息感',
};

/** 解读文案温和引用躯体感受（仅当用户勾选） */
export function appendBodyNote(interpretation: string, bodyTags: string[]): string {
  const notes = bodyTags.map((t) => BODY_NOTE_PHRASE[t]).filter(Boolean);
  if (notes.length === 0) return interpretation;
  return `${interpretation} ${notes.join('，')}。`;
}

/** 分层隐喻：点击图形对应区域弹出该层含义（复合图形可分层拆解） */
export type ClickZone = 'layer' | 'outer' | 'center';

const LAYER_METAPHOR: Record<EmotionCategory, { layer: string; outer?: string; center?: string }> = {
  'diffuse-low': { layer: '向外漫开的雾：没有明确形状的沉重，在持续弥漫' },
  rumination: {
    layer: '向内收拢的螺旋：思绪反复绕回同一件事',
    outer: '外圈螺旋：反复思虑循环',
    center: '中心收拢：注意力持续收窄',
  },
  conflict: {
    layer: '交织双带：难过与愤懑互相拉扯',
    outer: '外圈双带：两种情绪互相缠绕',
    center: '中心：对抗最紧的焦点',
  },
  numbness: { layer: '封闭的团块：感受暂时被隔绝在外' },
  excited: { layer: '上升的光尘：雀跃的心情正在上扬' },
  calm: { layer: '舒展的波纹：松弛正在向外扩散' },
};

export function layerMetaphor(cat: string, zone: ClickZone = 'layer'): string {
  const m = (LAYER_METAPHOR as Record<string, { layer: string; outer?: string; center?: string } | undefined>)[cat]
    ?? { layer: '这一层保留了你当时的图形参数' };
  if (zone === 'outer' && m.outer) return m.outer;
  if (zone === 'center' && m.center) return m.center;
  return m.layer;
}

/** 觉察引导问句（与图形类型绑定；非说教、不给答案、不要求回答） */
export const AWARENESS_PROMPTS: Record<EmotionCategory, string[]> = {
  rumination: ['是什么想法，让你反复回到这里？', '这个想法是事实，还是脑海里的猜测？'],
  'diffuse-low': ['这种沉重感，在身体的哪个位置？', '它是从什么时候开始弥漫的？'],
  conflict: ['这两种感受，哪一个更早出现？', '它们各自想保护你什么？'],
  numbness: ['是什么让你想要关上感受、保护自己？', '封闭的外壳之下，还有什么在等待？'],
  excited: ['是什么让这份雀跃升起来的？', '这份心情，你最想和谁分享？'],
  calm: ['是什么让你慢慢松下来？', '此刻的身体是什么感觉？'],
};

export function awarenessPrompts(cat: string): string[] {
  return (AWARENESS_PROMPTS as Record<string, string[]>)[cat] ?? ['此刻的你，注意到了什么？'];
}

/** 情绪流动注解（时序隐喻：情绪是动态过程，不是固定标签） */
export const FLOW_NOTE: Record<EmotionCategory, string> = {
  rumination: '下行螺旋：情绪正在自我强化，越回想越沉重',
  'diffuse-low': '弥散消耗：没有明确的循环，但持续消耗',
  conflict: '对抗拉扯：两股情绪互相消耗，持续紧绷',
  numbness: '封闭停滞：感受暂时冻结',
  excited: '上行轻盈：情绪正在上扬、有活力',
  calm: '上行舒展：情绪正在拓宽、松动',
};

export function flowNote(cat: string): string {
  return (FLOW_NOTE as Record<string, string>)[cat] ?? '情绪是一个动态过程';
}

/** 中性变化提示上下文（只做形态对比描述，不做好坏评判） */
export interface TransitionContext {
  primary: string;
  intensity: IntensityLevel;
}

/**
 * 本次图形与上一条图形的中性变化描述。
 * 同类别：按强度变化描述；跨类别：查固定模板表；无匹配：通用中性描述。
 */
export function buildTransitionHint(prev: TransitionContext, curr: TransitionContext): string {
  const IDX: Record<IntensityLevel, number> = { light: 0, medium: 1, heavy: 2 };
  if (prev.primary === curr.primary) {
    const d = IDX[curr.intensity] - IDX[prev.intensity];
    const sameTable: Record<string, [string, string, string]> = {
      rumination: ['思虑循环仍在持续', '思虑的循环比上次更收紧', '相比上一次，你的循环在松动'],
      'diffuse-low': ['低落仍在弥散', '云雾比上次更沉了一些', '云雾比上次薄了一些'],
      conflict: ['拉扯仍在持续', '拉扯的张力比上次更紧', '拉扯的张力缓和了些'],
      numbness: ['感受仍处于封闭状态', '封闭感比上次更深', '封闭的外壳出现一点松动'],
      excited: ['状态依然上扬', '上扬的能量比上次更满', '上扬的能量回落了些'],
      calm: ['平静依旧', '波纹比上次更舒展', '波纹收敛了些'],
    };
    const row = (sameTable as Record<string, [string, string, string] | undefined>)[prev.primary];
    // [持平, 加重, 减轻]：d>0 → 加重，d<0 → 减轻，d=0 → 持平（强度差范围 ±2，不可直接用 d+1 索引）
    const ti = d > 0 ? 1 : d < 0 ? 2 : 0;
    return row ? row[ti] : '情绪形态与上次一致';
  }
  const crossTable: Record<string, string> = {
    'numbness->diffuse-low': '封闭的感受下，低落开始浮现',
    'calm->rumination': '松弛的状态重新卷入思虑循环',
    'calm->diffuse-low': '平静的水面泛起了阴霾',
    'diffuse-low->rumination': '弥散的低落收拢成了具体的循环',
    'rumination->diffuse-low': '收紧的循环散开了一些',
    'rumination->numbness': '思虑停了下来，感受进入封闭',
    'conflict->rumination': '拉扯的对抗沉淀为反复思虑',
    'rumination->conflict': '思虑里长出了对抗的张力',
    'excited->calm': '上扬的能量缓缓落回平静',
    'calm->excited': '平静里升起雀跃的能量',
    'diffuse-low->calm': '云雾散去，水面渐平',
    'numbness->rumination': '封闭之下，思绪开始活动',
    'conflict->diffuse-low': '对抗的火气沉淀为低落',
    'diffuse-low->conflict': '低落里升起了不甘',
    'calm->conflict': '平静被拉扯打破',
    'numbness->calm': '封闭的外壳打开了一扇窗',
    'excited->diffuse-low': '上扬的能量落了下来',
    'diffuse-low->excited': '低落里透出了一点光',
    'rumination->calm': '循环终于慢了下来',
    'conflict->calm': '拉扯归于平缓',
    'calm->numbness': '平静转向了封闭',
    'excited->rumination': '上扬的能量卷入了思虑',
    'rumination->excited': '思虑松开，能量升了起来',
    'conflict->excited': '拉扯解开，能量升了起来',
    'numbness->excited': '封闭中透出了活力',
    'excited->numbness': '上扬的能量静止了下来',
    'conflict->numbness': '拉扯停下，感受进入封闭',
    'diffuse-low->numbness': '低落沉入封闭',
    'excited->conflict': '上扬的能量卷入拉扯',
  };
  return crossTable[`${prev.primary}->${curr.primary}`] ?? '情绪形态发生了变化';
}

/**
 * 安全读取类别规则：历史记录可能携带已废弃的类别 key（v1.0/v1.1 的 anger/panic/oppression/isolation），
 * 直接下标访问会得到 undefined。旧记录不重绘、只降级展示文案。
 */
export function safeCategoryRule(cat: string): CategoryRule | undefined {
  return (CATEGORY_RULES as Record<string, CategoryRule | undefined>)[cat];
}

export function safeCategoryLabel(cat: string): string {
  return safeCategoryRule(cat)?.label ?? '历史类别';
}

/** 导出映射配置文档（JSON）——验收标准：可导出映射配置文档 */
export function buildRulesExport() {
  return {
    rulesVersion: RULES_VERSION,
    generatedAt: new Date().toISOString(),
    description: '情绪反馈 · MUST-03 标准化「情绪→图形→色彩→动态」映射规则（4 大类基础形态 + 兴奋扩展态 + 平静兜底态 + 复合情绪融合；参数驱动渲染，禁止随机生成）',
    nlpRule: {
      type: 'deterministic-keyword-rules v1.2',
      seedRule: 'djb2 文本哈希，仅用于相位偏移；同文本恒定',
      categoryKeywords: CATEGORY_KEYWORDS,
      intensityKeywords: INTENSITY_KEYWORDS,
      primaryTieBreak: PRIMARY_PRIORITY,
      unmatchedDefault: '平静松弛 · 轻度（兜底态）',
    },
    intensityRules: INTENSITY_RULES,
    categoryRules: CATEGORY_RULES,
    calmAccent: CALM_ACCENT,
    fusionRule: {
      principle: '主情绪作为主体几何体，次要情绪作为附属图层/包裹流体融合穿插',
      conflictPriority: '有冲突（尖角）时优先保留尖角特征',
      examples: [
        '反刍 + 弥散低落：螺旋主体，外围包裹一层下沉云雾；紫 + 灰蓝',
        '麻木 + 低落：灰色团块主体，底部缠绕一层稀薄云雾',
        '反刍 + 麻木：外圈螺旋向中心收拢，内核汇聚为密实灰色团块',
      ],
    },
    softModeRule: '柔和模式开启后：抹除全部尖角、关闭全部抖动动画',
    backgroundRule: `统一低饱和中性底色：暗色 ${STAGE_BG_DARK} / 亮色 ${STAGE_BG_LIGHT}，不抢图形`,
    timingRule: '单轮动画周期 3~6s，低帧率低刺激，拒绝快节奏与频闪',
    versioningRule: '每条图形记录绑定 rulesVersion 与完整渲染参数；规则迭代不回溯重绘历史图形',
    renderingRule: 'SVG 矢量参数驱动渲染，禁止 AI 绘画随机生成',
    crisisRule: `输入命中高危信号词（${CRISIS_KEYWORDS.join('、')}等）直接阻断图形生成，微调面板与交互全部不触发，仅提供支持信息`,
    manualOverrideRule: '识别结果先预览、可手动微调（主情绪/强度/次要情绪开关）；手动修改后图形绑定用户参数并标记来源=人工调整',
    metadataTagsRule: '触发类型与躯体感受为可选附加元数据，不参与形态判定；躯体感受仅在解读文案中温和引用',
    awarenessRule: '觉察引导问句与图形类型绑定，非说教、不给答案、不要求回答',
    interactionRule: '按住图形产生临时形变（呼吸调节体验），不修改记录的原始图形参数，松开恢复',
    transitionRule: '与上一条记录的对比只做中性形态描述，不做好坏评判',
    softModeDowngrade: '柔和模式：隐藏拉扯尖角形态（冲突降级为普通反刍螺旋）、形变幅度减半、动画锁定最慢档',
  };
}
