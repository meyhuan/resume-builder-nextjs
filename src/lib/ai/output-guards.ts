import type { SectionModuleType } from '@/lib/ai/section-types';
import { MODULE_SPECS } from '@/lib/ai/writing-spec';
import type { MissingFact } from '@/lib/ai/unified/types';

export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|li|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

const UNIVERSAL_ALLOWED_TERMS = new Set([
  'ui',
  'ux',
  'app',
  'pc',
  'ios',
  'android',
  'web',
  'api',
  'sdk',
  'h5',
  'bug',
  'qa',
  'pm',
  'rd',
  'b端',
  'c端',
  'star',
  'x',
]);

/**
 * Extracts English/technology terms and domain acronyms that appear in result
 * but were not present in source.
 */
export function newTechTerms(source: string, result: string): string[] {
  const extractTerms = (text: string): string[] => {
    const cleaned = stripHtml(text).replace(/\[X\]/gi, '');
    const matches =
      cleaned.match(/[A-Za-z][A-Za-z0-9+#.-]{1,}|\b[56]S\b/g) || [];
    return matches.map((m) => m.trim());
  };

  const rawSourceTerms = extractTerms(source).map((t) => t.toLowerCase());
  const sourceTerms = new Set(rawSourceTerms);
  const sourceJoined = rawSourceTerms.join(' ');

  const candidateTerms = extractTerms(result);
  const additions = new Set<string>();

  for (const term of candidateTerms) {
    const lower = term.toLowerCase();
    if (UNIVERSAL_ALLOWED_TERMS.has(lower)) continue;
    if (sourceTerms.has(lower)) continue;
    // Allow if term is a direct prefix/substring of a source term (e.g. "Vue" when source has "Vue3")
    if (rawSourceTerms.some((st) => st.includes(lower) || lower.includes(st))) {
      // Only allow if not a compound with a new tool (like "Python+Pytest")
      if (!lower.includes('+')) continue;
    }
    if (!sourceJoined.includes(lower)) {
      additions.add(term);
    }
  }

  return Array.from(additions);
}

/**
 * Counts the number of [X] placeholders in HTML content.
 */
export function placeholderCount(html: string): number {
  const matches = stripHtml(html).match(/\[X\]/gi);
  return matches ? matches.length : 0;
}

export const GENERIC_ENDINGS =
  /(?:提升用户体验|提供技术支持|保障功能落地|助力业务发展)[。；!！]?$/;

/**
 * Extracts numbers present in the source text (including basic Chinese numerals).
 */
export function extractSourceNumbers(source: string): Set<string> {
  const text = stripHtml(source);
  const nums = new Set<string>();
  const matches = text.match(/\d+(?:\.\d+)?/g) || [];
  for (const m of matches) {
    nums.add(m);
  }
  const cnMap: Array<[RegExp, string]> = [
    [/一|壹/g, '1'],
    [/二|两|贰/g, '2'],
    [/三|叁/g, '3'],
    [/四|肆/g, '4'],
    [/五|伍/g, '5'],
    [/六|陆/g, '6'],
    [/七|柒/g, '7'],
    [/八|捌/g, '8'],
    [/九|玖/g, '9'],
    [/双十一/g, '11'],
    [/十/g, '10'],
    [/百/g, '100'],
  ];
  for (const [re, digit] of cnMap) {
    if (re.test(text)) nums.add(digit);
  }
  return nums;
}

/**
 * Detects concrete numbers in resultHtml that do not appear in source.
 */
export function ungroundedNumbers(source: string, resultHtml: string): string[] {
  const sourceNums = extractSourceNumbers(source);
  const text = stripHtml(resultHtml).replace(/\[X\]/gi, '');
  const found: string[] = [];

  const metricRegex =
    /\d+(?:\.\d+)?%|\d+(?:\s*[~～-]\s*\d+)?\s*\+?\s*(?:个|条|篇|场|次|人次|人|名|项|款|份|单|组|类|段|天|周|个月|小时|分钟|ms|毫秒|余项|余篇|余条|余份|余次)/gi;

  const matches = text.match(metricRegex) || [];
  for (const m of matches) {
    const digits = m.match(/\d+(?:\.\d+)?/g) || [];
    const allInSource = digits.every((d) => sourceNums.has(d));
    if (!allInSource) {
      found.push(m.trim());
    }
  }
  return found;
}

/**
 * Checks for style violations (length, excess placeholders, generic endings, banned phrases).
 * Non-blocking; used for diagnostics, eval scoring, and logging.
 */
export function styleIssues(
  html: string,
  moduleKind: SectionModuleType = 'experience',
): string[] {
  const issues: string[] = [];
  const spec = MODULE_SPECS[moduleKind] || MODULE_SPECS.experience;
  const count = placeholderCount(html);

  if (count > spec.maxPlaceholders) {
    issues.push(
      `占位符数量超标：当前 ${count} 个，上限 ${spec.maxPlaceholders} 个`,
    );
  }

  const text = stripHtml(html);
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (GENERIC_ENDINGS.test(line)) {
      issues.push(`包含万能套话结尾：${line.slice(-12)}`);
    }

    if (moduleKind === 'experience' || moduleKind === 'project') {
      if (line.length > 105) {
        issues.push(
          `单条经历过长（${line.length}字，建议55~95字）：${line.slice(0, 20)}...`,
        );
      }
    }
  }

  if (spec.bannedPhrases) {
    for (const phrase of spec.bannedPhrases) {
      if (text.includes(phrase)) {
        issues.push(`包含禁用套话：“${phrase}”`);
      }
    }
  }

  return issues;
}

/**
 * Softens a single [X] metric expression into a qualitative phrase when placeholders exceed the cap.
 */
function softenPlaceholderPhrase(text: string): string {
  return text
    .replace(
      /，?[^，。；<]*?(?:达|保持在?|稳定在|高于|不低于)\s*(?:≥\s*)?\[X\]%\s*(?:以上)?/g,
      '，符合质量规范要求',
    )
    .replace(
      /，?[^，。；<]*?(?:低于|小于|控制在|不超过)\s*(?:≤\s*)?\[X\]%/g,
      '，保障运行稳定可控',
    )
    .replace(
      /，?(?:助力|支撑|实现|推动)?[^，。；<]*?提升\s*(?:约\s*)?\[X\]%/g,
      '，有效提升整体执行效率',
    )
    .replace(
      /，?[^，。；<]*?(?:率|度|占比)\s*\[X\]%\s*(?:以上)?/g,
      '，保障交付质量达标',
    )
    .replace(/位列(?:班级|专业|课程)?(?:前|Top)\s*\[X\]%/gi, '表现良好')
    .replace(
      /，?[^，。；<]*?(?:小于|低于|缩短至|控制在)\s*(?:≤\s*)?\[X\]\s*(?:小时|分钟|天|ms|毫秒)/gi,
      '，保障高效响应闭环',
    )
    .replace(/（?每页\s*\[X\]\s*条）?/g, '')
    .replace(/每周\s*\[X\]\s*篇/g, '每周定期')
    .replace(/提前\s*\[X\]\s*(?:小时|天)/g, '按期保质')
    .replace(/计划在?\s*\[X\]\s*个月内/g, '计划稳步')
    .replace(
      /\[X\]\+?\s*(?:余)?\s*(个|条|篇|场|次|人次|人|名|项|款|份|单|组|类|期|批次|周次)/g,
      '多项',
    )
    .replace(/\[X\]\+?\s*%?/g, '');
}

/**
 * Deterministically cleans and normalizes polished HTML output:
 * 1. Normalizes structure into a single clean `<ul><li>...</li></ul>` without header `<p>` lines.
 * 2. Removes invented proper names in `「...」` and `XX大学` that do not exist in source.
 * 3. Replaces unmentioned English jargon/acronyms (Jira, Pytest, Axios, RESTful, WMS, 6S, FIFO, CET-4, etc.).
 * 4. Prevents role escalation ("帮忙/协助" -> "独立负责/主导") and ungrounded "零差错/零遗漏".
 * 5. Converts any ungrounded concrete numbers into `[X]` (up to module's `maxPlaceholders`),
 *    and softens any excess `[X]` beyond the cap.
 */
export function sanitizePolishedHtml(
  source: string,
  rawHtml: string,
  moduleKind: SectionModuleType = 'experience',
  realisticMode: boolean = false,
): string {
  const sourcePlain = stripHtml(source);
  const sourceLower = sourcePlain.toLowerCase();
  const sourceNums = extractSourceNumbers(sourcePlain);
  const spec = MODULE_SPECS[moduleKind] || MODULE_SPECS.experience;
  const maxP = realisticMode ? 0 : spec.maxPlaceholders;

  let html = rawHtml
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 1. Clean invented proper names in 「...」
  html = html.replace(/「([^」]+)」/g, (full, inner: string) => {
    const cleanInner = inner.trim();
    if (sourcePlain.includes(cleanInner)) return full;
    for (let i = 0; i <= cleanInner.length - 2; i++) {
      const sub = cleanInner.slice(i, i + 2);
      if (/[\u4e00-\u9fa5]{2}/.test(sub) && sourcePlain.includes(sub)) {
        return cleanInner;
      }
    }
    return '';
  });
  html = html
    .replace(/[｜|]\s*XX大学/g, '')
    .replace(/XX大学/g, '')
    .replace(/[｜|]\s*某[^<，。；\s]{2,6}公司/g, '')
    .replace(/完成\s*模块/g, '完成相关模块');

  // 2. Clean unmentioned tech terms & acronyms
  const jargonReplacements: Array<[string, RegExp, string]> = [
    ['restful', /RESTful\s*(?:风格)?\s*/gi, ''],
    ['axios', /基于\s*Axios\s*封装请求逻辑，?/gi, '封装数据请求逻辑，'],
    ['axios', /Axios/gi, '接口请求'],
    ['composition', /\s*\+\s*Composition\s*API/gi, ''],
    ['组合式', /组合式\s*API\s*与?/gi, ''],
    ['mock', /通过\s*Mock\s*数据与真实接口双模式验证，?/gi, '配合完成接口数据验证，'],
    ['mock', /Mock\s*数据/gi, '模拟数据'],
    ['jira', /Jira/gi, sourcePlain.includes('禅道') ? '禅道' : '缺陷管理平台'],
    ['pytest', /与?\s*Python\s*\+\s*Pytest\s*自动化框架/gi, '与自动化测试技术'],
    ['pytest', /Pytest/gi, '自动化测试'],
    ['wms', /WMS\s*系统/gi, '库存系统'],
    ['wms', /WMS\s*基础模块/gi, '库存系统基础模块'],
    ['wms', /WMS/gi, '库存系统'],
    ['fifo', /[（(]\s*FIFO\s*[）)]/gi, ''],
    ['fifo', /FIFO/gi, '先进先出'],
    ['abc', /[、，]?\s*ABC\s*分类法/gi, ''],
    ['6s', /[56]S\s*管理(?:标准|规范)/gi, '现场管理规范'],
    ['5s', /及作业区\s*[56]S\s*整理/gi, '及作业区现场整理'],
    ['5s', /[56]S/gi, '现场规范'],
    ['sop', /SOP/gi, '标准作业流程'],
    ['sku', /SKU\s*信息/gi, '货品信息'],
    ['sku', /按\s*SKU\s*分类/gi, '按品类'],
    ['sku', /SKU/gi, '货品品类'],
    ['cet-4', /CET-4/gi, '大学英语四级考试'],
    ['cet-6', /CET-6/gi, '大学英语六级考试'],
    ['select', /编写\s*SELECT\s*语句/gi, '编写查询语句'],
    ['grep', /[（(]如\s*ls\/cd\/grep\/tail[）)]/gi, ''],
    ['console', /[（(]Console[^）)]*[）)]/gi, ''],
    ['dom', /与\s*DOM\s*操作/gi, ''],
    ['135', /135\s*编辑器等工具/g, '排版工具'],
    ['135', /135\s*编辑器/g, '排版工具'],
    ['ms', /(\[X\]|\d+)\s*ms\b/gi, '$1 毫秒'],
  ];

  for (const [key, pattern, replacement] of jargonReplacements) {
    if (!sourceLower.includes(key)) {
      html = html.replace(pattern, replacement);
    }
  }

  // Clean ungrounded absolute "零差错/零遗漏/零失误" claims unless source mentions them
  if (!/零|无差错|没出错/.test(sourcePlain)) {
    html = html
      .replace(/确保(?:发布|播报内容|内容)?零差错/g, '保障内容准确无误')
      .replace(/零差错/g, '准确无误')
      .replace(/零遗漏/g, '完整落实')
      .replace(/零失误/g, '规范准确');
  }

  // 3. Role escalation guard
  const hasAssistMarker = /帮忙|协助|跟着|见习|学徒|干事|志愿者/.test(sourcePlain);
  if (!sourcePlain.includes('独立')) {
    if (hasAssistMarker && !sourcePlain.includes('负责')) {
      html = html.replace(/独立负责/g, '协助完成').replace(/独立完成/g, '参与完成');
    } else {
      html = html.replace(/独立负责/g, '负责').replace(/独立完成/g, '完成');
    }
  }
  if (!sourcePlain.includes('主导')) {
    html = html.replace(/主导/g, sourcePlain.includes('负责') ? '负责' : '参与');
  }

  // 4. Normalize standalone X placeholders (e.g. "X%", "X个") into "[X]"
  html = html.replace(
    /(?<![A-Za-z[])X(?![A-Za-z\]])\s*(%|个|条|篇|场|次|人次|人|名|项|款|份|单|组|期|批次|周次|小时|天|个月|毫秒)/g,
    '[X]$1',
  );

  // 5. Convert ungrounded concrete numbers into [X]
  html = html.replace(
    /(\d+(?:\s*[~～-]\s*\d+)?)\s*(\+?\s*(?:%|个|条|篇|场|次|人次|人|名|项|款|份|单|组|类|段|期|批次|周次|天|周|个月|小时|分钟|ms|毫秒|余项|余篇|余条|余份|余次))/gi,
    (full, numPart: string, unitPart: string) => {
      const digits = numPart.match(/\d+/g) || [];
      if (digits.every((d) => sourceNums.has(d))) {
        return full;
      }
      const cleanUnit = unitPart.replace(/^余/, '');
      return `[X]${cleanUnit}`;
    },
  );
  if (!/两周|2周|二周/.test(sourcePlain)) {
    html = html.replace(/两周内/g, '快速');
  }

  // 6. Normalize HTML structure into a single <ul><li>...</li></ul>
  const liMatches = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map(
    (m) => m[1].trim(),
  );
  const pMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map(
    (m) => m[1].trim(),
  );

  const finalItems: string[] = [];
  for (const pContent of pMatches) {
    if (/^<strong>[^<]+<\/strong>/.test(pContent)) {
      finalItems.push(pContent);
    } else if (liMatches.length === 0) {
      const parts = pContent
        .split(/<br\s*\/?>/i)
        .map((s) => s.trim())
        .filter(Boolean);
      finalItems.push(...parts);
    }
  }
  finalItems.push(...liMatches);

  if (finalItems.length > 0) {
    html = `<ul>\n${finalItems.map((item) => `<li>${item}</li>`).join('\n')}\n</ul>`;
  }

  // 7. Enforce maxPlaceholders cap
  const currentCount = placeholderCount(html);
  if (currentCount > maxP) {
    let seen = 0;
    const items = Array.from(html.matchAll(/<li>([\s\S]*?)<\/li>/gi)).map(
      (m) => m[1],
    );
    const processedItems = items.map((item) => {
      const itemCount = (item.match(/\[X\]/gi) || []).length;
      if (itemCount === 0) return item;
      if (seen + itemCount <= maxP) {
        seen += itemCount;
        return item;
      }
      const canKeep = Math.max(0, maxP - seen);
      seen += canKeep;
      if (canKeep === 0) {
        return softenPlaceholderPhrase(item);
      }
      let kept = 0;
      const masked = item.replace(/\[X\]/gi, () => {
        kept++;
        return kept <= canKeep ? '__KEEP_X__' : '[X]';
      });
      return softenPlaceholderPhrase(masked).replace(/__KEEP_X__/g, '[X]');
    });
    if (processedItems.length > 0) {
      html = `<ul>\n${processedItems.map((i) => `<li>${i}</li>`).join('\n')}\n</ul>`;
    }
  }

  return html;
}

export interface DataConfirmationItem {
  readonly index: number;
  readonly label: string;
  readonly metricName: string;
  readonly unit: string;
  readonly hint: string;
}

/**
 * Scans polished HTML for every `[X]` placeholder and extracts contextual
 * confirmation items for the interactive "待确认数据" chips UI.
 */
export function extractDataConfirmationItems(
  html: string,
): DataConfirmationItem[] {
  const text = stripHtml(html);
  const items: DataConfirmationItem[] = [];
  // Match clauses containing [X] without crossing into another [X]
  const clauseRegex =
    /([^，。；\n<>[\]]{0,16}?)\[X\](\+?\s*(?:%|个|条|篇|场|次|人次|人|名|项|款|份|单|组|类|期|批次|周次|小时|天|个月|ms|毫秒)?)([^，。；\n<>[\]]{0,6})/gi;

  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = clauseRegex.exec(text)) !== null) {
    const prefix = (match[1] || '').replace(/^[^：:]*[：:]\s*/, '').trim();
    const unitRaw = (match[2] || '').trim();
    const suffix = (match[3] || '').replace(/[及与和、].*$/, '').trim();
    const fullClause = `${prefix}[X]${unitRaw}${suffix}`.trim();
    const metricName =
      prefix
        .replace(/^(?:确保|保障|实现|累计|平均|助力|支撑|达到|覆盖|完成)/, '')
        .replace(/(?:达|低于|高于|超|约|为|保持在|稳定在|位列|[≥≤])+$/, '')
        .trim() || fullClause;

    const unit = unitRaw.replace(/^\+/, '').trim();
    const hint = unit.includes('%')
      ? '输入真实百分比数值（如 95）'
      : `输入真实数值${unit ? `（单位：${unit}）` : ''}`;

    items.push({
      index,
      label: fullClause,
      metricName,
      unit: unitRaw,
      hint,
    });
    index++;
  }

  return items;
}

/**
 * Converts DataConfirmationItems to MissingFact[] for API/types compatibility.
 */
export function toMissingFacts(html: string): MissingFact[] {
  return extractDataConfirmationItems(html).map((item) => ({
    label: item.label.slice(0, 40),
    hint: item.hint.slice(0, 120),
  }));
}

/**
 * Replaces the N-th (0-based) `[X]` placeholder in HTML with the user's confirmed value.
 */
export function fillPlaceholderAt(
  html: string,
  targetIndex: number,
  value: string,
): string {
  const cleanVal = value.trim().replace(/%$/, '');
  if (!cleanVal) return html;
  let current = 0;
  return html.replace(/\[X\]/gi, (match) => {
    if (current === targetIndex) {
      current++;
      return cleanVal;
    }
    current++;
    return match;
  });
}

/**
 * Removes or softens the N-th (0-based) `[X]` placeholder in HTML when the user
 * chooses "不写此数据".
 */
export function removePlaceholderAt(
  html: string,
  targetIndex: number,
): string {
  let current = 0;
  const masked = html.replace(/\[X\]/gi, () => {
    const isTarget = current === targetIndex;
    current++;
    return isTarget ? '[X]' : '__KEEP_X__';
  });
  return softenPlaceholderPhrase(masked).replace(/__KEEP_X__/g, '[X]');
}
