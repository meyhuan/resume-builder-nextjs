/**
 * Prompt builder for whole-resume AI optimization.
 *
 * Unlike polish-section (single block), this builder gives the AI
 * a global view of the entire resume so it can:
 * - Distribute JD keywords strategically across modules
 * - Keep action-verb levels consistent with the user's identity
 * - Unify data-scale descriptions across entries from the same company
 */
import type { SectionIdentity } from '@/lib/ai/section-types';
import {
  ACTION_VERB_WHITELIST,
  ACTION_VERB_BLACKLIST,
} from '@/lib/ai/section-types';

/** Minimum contentHtml length (chars) to include a block in optimization. */
export const MIN_OPTIMIZE_CONTENT_LENGTH = 20;

/** Maximum JD length accepted by the endpoint. */
export const MAX_OPTIMIZE_JD_LENGTH = 500;

/** A single optimizable block sent to the AI. */
export interface OptimizeResumeBlock {
  readonly blockId: string;
  readonly type: 'experience' | 'project' | 'campus' | 'text';
  readonly label: string;
  readonly contentHtml: string;
}

/** Request body for POST /next-api/ai/optimize-resume */
export interface OptimizeResumeRequest {
  readonly blocks: OptimizeResumeBlock[];
  readonly identity: SectionIdentity;
  readonly jobDescription?: string;
  readonly realisticMode?: boolean;
  readonly model?: string;
}

const IDENTITY_CONTEXT: Record<SectionIdentity, string> = {
  student:
    '求职者是一名在校大学生，主要经历为校园社团、课程项目、实习。' +
    '表达层级须匹配「参与/协助/执行」，禁止使用「主导/统筹」等管理词汇。',
  graduate:
    '求职者是一名应届毕业生，有少量实习或校园项目经验。' +
    '表达层级须体现「独立负责模块/落地推进」，不宜夸大至「战略决策」层级。',
  professional:
    '求职者拥有1-3年职场经验，正在寻求进阶或跨岗跳槽。' +
    '表达层级须体现「主导/搭建/优化核心链路」，要与应届生形成差异化竞争力。',
};

const STRICT_COMPLIANCE =
  '## 写实模式（已开启）\n' +
  '1. 所有内容100%基于用户原文事实，禁止新增用户未提及的任何动作、数据、成果。\n' +
  '2. 禁止虚构量化数据（营收、增长率等）。\n' +
  '3. 禁止夸大身份：用户为「协助」时不得改写为「主导」。\n' +
  '4. 仅做专业转译和语句优化。\n';

const PACKAGING_STRATEGY =
  '## 包装策略\n' +
  '【核心原则】：在保证核心事实准确的基础上，基于用户的岗位角色和行业常识，合理推断并补充具有高确定性的过程细节与基础成果，让经历符合 STAR 法则（情境、任务、行动、结果）。\n' +
  '1. 行业术语转译：将口语化表达转化为对应行业的专业术语。\n' +
  '   - 技术/产品例：「做了个页面」→「负责前端页面构建与交互实现」\n' +
  '   - 销售/运营例：「卖了很多货」→「拓展销售渠道，达成预期营收目标」\n' +
  '2. 补全隐藏的必然动作：基于结果倒推并补全该岗位实现此结果的常规必备动作。\n' +
  '   - 例：用户写了「办了一场线下活动，来了500人」，可合理补充动作「统筹活动物料采购、现场布置与人员分工调度」。\n' +
  '   - 例：用户写了「用Vue做了后台管理系统」，可合理补充动作「对接后端API接口完成数据渲染，实现权限路由控制」。\n' +
  '3. 补全定性的基础成果：若用户完全没写成果，可根据任务性质补充符合逻辑的定性收益（不可编造具体数字）。\n' +
  '   - 例：优化了数据库查询 → 「有效降低系统延迟，提升系统吞吐量与用户体验」。\n' +
  '   - 例：重构了旧代码 → 「提升代码可维护性与团队协作开发效率」。\n' +
  '4. 结构重组（STAR 法则）：将散乱的描述重组为【任务背景/目标 + 核心行动/方法 + 产出结果】的结构，让条理更加清晰。\n' +
  '5. 关键词前置 / 成果前置格式（必须）：每条 bullet 点必须采用「加粗关键词/成果概括 + 冒号 + 详细展开」的格式。\n' +
  '   - 加粗部分（小标题）应是该条目的核心职责领域或最亮眼的成果（如「负责核心业务链路开发」「优化前端性能与体验」「主导数据库架构重构」）。\n' +
  '   - 冒号后的详细描述应展开具体动作、技术方法和定性/定量收益，用分号或逗号连接多个并列动作。\n' +
  '   - 此格式让HR在3秒内抓住重点，同时保留细节供深入阅读。\n' +
  '6. 提炼与精简（去冗余）：若原文存在大量流水账、口语化废话或重复描述，请大刀阔斧地进行删减与提炼。剔除无信息量的修饰词，保留高密度的业务动作。简历寸土寸金，务必精言简语，拒绝长篇大论。\n' +
  '【严格禁止（全行业适用）】：\n' +
  '- 绝对禁止编造【具体的量化数据】（如「销售额提升30%」「DAU达到50万」「节省成本100万」），除非原文已有确切数字。\n' +
  '- 绝对禁止编造【里程碑式奖项/独家荣誉】（如「获得年度优秀员工」「输出文档被全公司推广」）。\n' +
  '- 绝对禁止跨行业/跨岗位瞎编（如给行政文员编造"提升产品留存率"的成果）。\n';

const INCOMPLETE_RULES =
  '## 内容不完整处理规则\n' +
  '- 若某模块 contentHtml 为空或极短（已在发送前过滤，你不会收到）：跳过，不输出该 blockId。\n' +
  '- 若只有标题信息（公司名/职位），正文极少：生成占位提示 `<p>[建议补充：请描述你的主要工作职责和成果]</p>`。\n' +
  '- 若内容较短但有实质信息：基于现有信息做最大化专业包装，不虚构新成果。\n';

const GLOBAL_CONSISTENCY =
  '## 全局一致性要求\n' +
  '1. JD关键词匹配：提取目标JD中的核心要求（如：大客户拓展、数据分析、高并发、活动策划等），在不同经历中自然穿插，避免在单一模块生硬堆砌。\n' +
  '2. 经历类型差异化处理：\n' +
  '   - 针对个人练习/学术研究（如课程作业、模拟项目）：重点展示专业技能的掌握程度与实施过程，绝不要编造商业落地价值或企业级协作成果。\n' +
  '   - 针对真实商业工作/实战：重点展示业务执行落地过程、解决实际问题的能力。\n' +
  '3. 动作词层级一致：整份简历使用的动作词（如 主导/统筹 vs 参与/协助）必须始终与用户所处的发展阶段（学生/应届/职场）相符，避免层级矛盾。\n' +
  '4. 语境统一：保持整份简历在数据口径、时间线、以及所属行业语境上的高度一致。\n';

const OUTPUT_FORMAT =
  '## 输出格式要求\n' +
  '- 直接输出合法JSON字符串，可被 JSON.parse() 直接解析。\n' +
  '- 格式：`{ "blockId": "优化后HTML", ... }`\n' +
  '- key 为 blockId，value 为优化后的HTML（使用 <p>/<ul>/<li> 标签）。\n' +
  '- 只输出有实质改动的 blockId，跳过的模块不出现在输出中。\n' +
  '- 不要输出任何 JSON 以外的文字、解释、markdown代码块标记。\n' +
  '- 【内容呈现格式 - 关键词前置/成果前置】：每条经历必须采用「**加粗小标题概括** + 冒号 + 详细描述」的格式，使用<ul><li>包裹。例：\n' +
  '   <li><strong>负责核心业务链路开发：</strong>完成店铺首页展示、菜品分类加载、购物车状态同步、下单表单校验与本地缓存持久化，保障用户离线场景基础可用性；</li>\n' +
  '   <li><strong>优化前端性能与体验：</strong>采用WXML模板复用与WXSS样式抽离策略，降低包体积18%；通过setData节流与页面生命周期钩子管理，减少渲染卡顿...</li>\n' +
  '- 【防重复规则】：项目名/公司名通常已在简历的标题行显示，优化后的正文内容**严禁再次重复**该名称。直接从具体职责或技术动作开始描述。\n';

/**
 * Build the system prompt for whole-resume optimization.
 */
export function buildOptimizeSystemPrompt(
  identity: SectionIdentity,
  realisticMode: boolean,
): string {
  const allowed = ACTION_VERB_WHITELIST[identity].join('、');
  const forbidden = ACTION_VERB_BLACKLIST[identity].join('、');

  return [
    '你是一位拥有10年经验的资深简历优化顾问，擅长从整体视角对简历进行系统性优化。',
    '你的优势在于：能在全局把握用户背景的前提下，策略性地将目标岗位JD关键词分布在不同模块，而不是每个模块简单堆砌。',
    '',
    `## 用户身份\n${IDENTITY_CONTEXT[identity]}`,
    '',
    `## 动作词约束\n- 推荐使用：${allowed}\n- 禁止使用：${forbidden}`,
    '',
    realisticMode ? STRICT_COMPLIANCE : PACKAGING_STRATEGY,
    GLOBAL_CONSISTENCY,
    INCOMPLETE_RULES,
    OUTPUT_FORMAT,
  ].join('\n');
}

/**
 * Build the user prompt containing all blocks and optional JD.
 */
export function buildOptimizeUserPrompt(
  blocks: OptimizeResumeBlock[],
  jobDescription?: string,
): string {
  const parts: string[] = [
    '请对以下简历模块进行整体优化：',
    '',
  ];

  if (jobDescription?.trim()) {
    parts.push('目标岗位JD：');
    parts.push('---');
    parts.push(jobDescription.trim());
    parts.push('---');
    parts.push('');
  }

  parts.push('简历模块内容（JSON数组）：');
  parts.push(JSON.stringify(blocks, null, 2));
  parts.push('');
  parts.push('请输出优化后的JSON，格式为 { "blockId": "优化后HTML", ... }');

  return parts.join('\n');
}
