import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import type { ResumeData } from "@/entities/resume/resume-data";
import { getDefaultModel, resolveApiKey } from "@/lib/ai/ai-runtime-config";
import { analyzeJdMatch } from "@/lib/seo/jd-match";
import {
  applyPatches,
  buildChanges,
  extractOptimizableFields,
  resumeToPlainText,
  sanitizeResumeHtml,
} from "./resume-content";
import { calculateJobFitScoring } from "./scoring";
import { validateJobFitPatch } from "./fact-guard";
import type {
  JobFitChangeCategory,
  JobFitFocusArea,
  JobFitGenerationResult,
  JobFitPatch,
  JobFitRequirement,
} from "./types";

const PatchSchema = z.object({
  sectionId: z.string().min(1),
  blockId: z.string().min(1),
  field: z.enum(["contentHtml", "courseHtml", "html"]),
  itemId: z.string().optional(),
  optimizedHtml: z.string().min(1),
  category: z.enum(["KEYWORD", "CAPABILITY", "EXPERIENCE"]),
  reason: z.string().min(1).max(240),
  requirementId: z.string().optional(),
  evidence: z.string().min(1).max(500),
});

const ModelResultSchema = z.object({
  patches: z.array(PatchSchema).max(30),
  suggestions: z.array(z.string().min(1).max(300)).max(8).default([]),
});

const MODEL_OUTPUT_INSTRUCTIONS = `必须只输出一个 JSON 对象，不要输出 Markdown 或解释文字。字段名和枚举值必须严格保持如下格式：
{
  "patches": [
    {
      "sectionId": "从输入 fields 原样复制",
      "blockId": "从输入 fields 原样复制",
      "field": "contentHtml | courseHtml | html 三者之一",
      "itemId": "仅当输入字段存在 itemId 时原样复制，否则省略",
      "optimizedHtml": "该字段优化后的完整 HTML 字符串",
      "category": "KEYWORD | CAPABILITY | EXPERIENCE 三者之一，必须大写",
      "reason": "本次修改原因，只写一句，80 字以内",
      "requirementId": "关联的 req-*，无法关联时省略",
      "evidence": "原简历中可以逐字找到的证据字符串"
    }
  ],
  "suggestions": ["无法安全自动写入的建议"]
}
patches 可以为空数组，但每个 patch 都必须包含 sectionId、blockId、field、optimizedHtml、category、reason、evidence。optimizedHtml 必须是完整替换内容，不是 diff、说明或字段别名。`;

class JobFitModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobFitModelOutputError";
  }
}

interface GenerateInput {
  readonly resume: ResumeData;
  readonly jobTitle: string;
  readonly companyName?: string;
  readonly jobDescription: string;
  readonly focusAreas: readonly JobFitFocusArea[];
}

export async function generateJobFit(
  input: GenerateInput,
): Promise<JobFitGenerationResult> {
  const model = getDefaultModel();
  const fields = extractOptimizableFields(input.resume);
  const requirements = buildRequirements(
    input.jobDescription,
    input.jobTitle,
    input.resume,
  );
  const sourceText = resumeToPlainText(input.resume);
  let rawPatches: JobFitPatch[] = [];
  let modelSuggestions: string[] = [];

  if (
    process.env.JOB_FIT_FAKE_AI === "true" ||
    (!process.env[model.apiKeyEnv] && process.env.NODE_ENV !== "production")
  ) {
    rawPatches = createSafeFallbackPatches(fields, requirements);
  } else {
    const client = new OpenAI({
      apiKey: resolveApiKey(model),
      baseURL: model.baseUrl,
    });
    const payload = JSON.stringify({
      target: { role: input.jobTitle, company: input.companyName ?? "" },
      focusAreas: input.focusAreas,
      requirements,
      fields: fields.map((field) => ({
        ...field,
        html: field.html.slice(0, 6000),
      })),
    });
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `你是严谨的中文简历岗位定制助手。你的目标是让招聘方更快看见“原简历已经具备”的岗位证据，而不是把 JD 词汇写进简历。

工作规则（优先级从高到低）：
1. 只优化传入 fields 的表达，保持该字段原有语言；不得翻译整份简历，也不得修改定位字段。
2. 每个 patch 先选择该 field 中可逐字找到的一段完整 evidence，再围绕这段 evidence 重排、精简或前置重点。evidence 不能是空泛单词，英文至少包含 3 个单词，中文至少 8 个字。
3. optimizedHtml 不得新增原简历中没有出现过的公司、学校、职位、数字、日期、工具、平台、方法论、行业或技术术语。JD 中出现、但来源没有证据的内容，必须放进 suggestions，绝不能写入 optimizedHtml。
4. 只提交能明确提升可读性或岗位关联度的改写；宁可返回空 patches，也不要为了凑数量改写。每个 field 最多一个 patch，总数建议 2-6 个。
5. 保留所有可验证事实；可以改变句序、合并重复表述、把已有成果或职责放在 bullet 前部，并只对来源已有的关键词加 strong。
6. category 按真正目的选择：KEYWORD=突出已有岗位术语；CAPABILITY=说明已有方法或协作能力；EXPERIENCE=突出已有职责、成果或影响。requirementId 必须关联输入中的 req-*。

严禁编造经历、技能、数字、日期、公司、学校、职位、联系方式。仅允许 p、br、strong、em、ul、ol、li 标签。无法安全写入的内容放 suggestions。\n\n${MODEL_OUTPUT_INSTRUCTIONS}`,
      },
      {
        role: "user",
        content: `目标岗位描述：\n${input.jobDescription.slice(0, 10000)}\n\n可优化内容：\n${payload}`,
      },
    ];
    let parsed: z.infer<typeof ModelResultSchema> | null = null;
    let lastError: unknown;
    let previousOutput = "";
    let previousValidation = "";
    for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
      try {
        const attemptMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          attempt === 0
            ? messages
            : [
                ...messages,
                {
                  role: "assistant",
                  content: previousOutput.slice(0, 12_000) || "{}",
                },
                {
                  role: "system",
                  content: `上一次结果未通过 JSON 结构或事实守卫校验。具体错误：\n${previousValidation}\n\n请删除或重写不合格 patch；任何不在原简历中的职位、方法论、工具、技能或数字只能放 suggestions，不能用近似表述绕过。${MODEL_OUTPUT_INSTRUCTIONS}`,
                },
              ];
        const response = await client.chat.completions.create({
          model: model.name,
          messages: attemptMessages,
          response_format: { type: "json_object" },
          temperature: attempt === 0 ? 0.2 : 0,
          max_tokens: 8192,
        });
        previousOutput = response.choices[0]?.message?.content ?? "{}";
        const candidate = parseJobFitModelResult(previousOutput);
        const rejected = candidate.patches.flatMap((patch, index) => {
          const result = validateJobFitPatch(patch, fields, sourceText);
          return result.ok ? [] : [{ index, reason: result.reason }];
        });
        if (rejected.length > 0 && attempt === 0) {
          previousValidation = rejected
            .slice(0, 8)
            .map((item) => `patches.${item.index}: ${item.reason}`)
            .join('；');
          continue;
        }
        parsed = candidate;
      } catch (error) {
        lastError = error;
        previousValidation = formatModelOutputError(error);
      }
    }
    if (!parsed) {
      throw new JobFitModelOutputError(
        `AI 返回的优化结果结构不符合要求：${formatModelOutputError(lastError)}`,
      );
    }
    rawPatches = parsed.patches;
    modelSuggestions = parsed.suggestions;
  }

  const accepted: JobFitPatch[] = [];
  const rejectedSuggestions: string[] = [];
  for (const patch of rawPatches) {
    const result = validateJobFitPatch(patch, fields, sourceText);
    if (result.ok)
      accepted.push({
        ...patch,
        optimizedHtml: sanitizeResumeHtml(patch.optimizedHtml),
      });
    else rejectedSuggestions.push(result.reason);
  }
  // If the model cannot produce a fact-safe rewrite, retain a useful and fully
  // deterministic result: highlight source terms that already satisfy the JD.
  // This never adds text or changes the score; it only makes existing evidence
  // easier for the user and recruiter to find in the Diff view.
  if (accepted.length === 0) {
    for (const patch of createSafeFallbackPatches(fields, requirements)) {
      const result = validateJobFitPatch(patch, fields, sourceText);
      if (result.ok) accepted.push(patch);
    }
  }
  const optimizedResume = applyPatches(input.resume, accepted);
  if (input.jobTitle.trim()) {
    optimizedResume.jobIntention = {
      ...optimizedResume.jobIntention,
      position: input.jobTitle.trim(),
    };
  }
  const changes = buildChanges(input.resume, accepted);
  const scoring = calculateJobFitScoring(
    input.resume,
    optimizedResume,
    input.jobDescription,
    input.jobTitle,
    changes,
  );
  const completed = [
    changes.some((change) => change.category === "KEYWORD")
      ? "已对齐岗位关键词与原简历证据"
      : "",
    changes.some((change) => change.category === "CAPABILITY")
      ? "已明确岗位能力与已有职责的联系"
      : "",
    changes.some((change) => change.category === "EXPERIENCE")
      ? "已强化已有经历和成果表达"
      : "",
  ].filter(Boolean);
  const suggestions = [
    ...new Set([
      ...modelSuggestions,
      ...rejectedSuggestions,
      ...defaultSuggestions(requirements, input.resume),
    ]),
  ].slice(0, 6);
  return {
    optimizedResume,
    scoring,
    changes,
    summary: { completed, suggestions, requirements },
    modelName:
      process.env.JOB_FIT_FAKE_AI === "true" ? "job-fit-fake-v1" : model.name,
    factGuardRejectCount: rawPatches.length - accepted.length,
  };
}

function buildRequirements(
  jobDescription: string,
  jobTitle: string,
  resume: ResumeData,
): JobFitRequirement[] {
  const match = analyzeJdMatch({
    jobDescription,
    resumeText: resumeToPlainText(resume),
    targetRole: jobTitle,
  });
  const keywords = [...match.matchedKeywords, ...match.missingKeywords].slice(
    0,
    18,
  );
  return keywords.map((keyword, index) => ({
    id: `req-${index + 1}`,
    label: keyword,
    category: categoryForRequirement(keyword),
    keywords: [keyword],
    weight: index < 6 ? 3 : index < 12 ? 2 : 1,
  }));
}

function categoryForRequirement(keyword: string): JobFitChangeCategory {
  const normalized = keyword.toLowerCase()
  if (/(api|pipeline|schema|data quality|analytics|jira|confluence|技术|数据|接口|工具|技能)/.test(normalized)) {
    return "CAPABILITY"
  }
  if (/(roadmap|backlog|sprint|release|stakeholder|metrics|product manager|product owner|项目|交付|成果|协作|规划)/.test(normalized)) {
    return "EXPERIENCE"
  }
  return "KEYWORD"
}

function createSafeFallbackPatches(
  fields: ReturnType<typeof extractOptimizableFields>,
  requirements: readonly JobFitRequirement[],
): JobFitPatch[] {
  const patches: JobFitPatch[] = [];
  for (const field of fields) {
    const requirement = requirements.find((item) =>
      item.keywords.some((keyword) =>
        field.text.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
    if (!requirement) continue;
    const keyword = requirement.keywords[0];
    const optimizedHtml = field.html.replace(
      new RegExp(escapeRegExp(keyword), "i"),
      `<strong>${keyword}</strong>`,
    );
    if (optimizedHtml === field.html) continue;
    patches.push({
      sectionId: field.sectionId,
      blockId: field.blockId,
      field: field.field,
      itemId: field.itemId,
      optimizedHtml,
      category: requirement.category,
      reason: `突出与岗位要求“${requirement.label}”直接相关的已有证据。`,
      requirementId: requirement.id,
      evidence: keyword,
    });
    if (patches.length >= 6) break;
  }
  return patches;
}

function defaultSuggestions(
  requirements: readonly JobFitRequirement[],
  resume: ResumeData,
): string[] {
  const text = normalize(resumeToPlainText(resume));
  return requirements
    .filter(
      (requirement) =>
        !requirement.keywords.some((keyword) =>
          text.includes(normalize(keyword)),
        ),
    )
    .slice(0, 3)
    .map(
      (requirement) =>
        `如果你确实具备“${requirement.label}”相关经验，可在编辑器中补充可验证案例（未自动修改）。`,
    );
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function cleanJson(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

export function parseJobFitModelResult(
  value: string,
): z.infer<typeof ModelResultSchema> {
  let json: unknown;
  try {
    json = JSON.parse(cleanJson(value));
  } catch (error) {
    throw new JobFitModelOutputError(
      `不是有效 JSON：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const result = ModelResultSchema.safeParse(trimModelDisplayText(json));
  if (!result.success) {
    throw new JobFitModelOutputError(formatZodIssues(result.error));
  }
  return result.data;
}

function trimModelDisplayText(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const result = value as Record<string, unknown>
  return {
    ...result,
    patches: Array.isArray(result.patches)
      ? result.patches.map((patch) => {
          if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch
          const item = patch as Record<string, unknown>
          return {
            ...item,
            reason: trimText(item.reason, 240),
            evidence: trimText(item.evidence, 500),
          }
        })
      : result.patches,
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions.map((suggestion) => trimText(suggestion, 300))
      : result.suggestions,
  }
}

function trimText(value: unknown, maxLength: number): unknown {
  return typeof value === "string" ? value.slice(0, maxLength) : value
}

function formatModelOutputError(error: unknown): string {
  if (error instanceof JobFitModelOutputError) return error.message;
  if (error instanceof z.ZodError) return formatZodIssues(error);
  if (error instanceof Error) return error.message;
  return String(error ?? "未知结构错误");
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("；");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
