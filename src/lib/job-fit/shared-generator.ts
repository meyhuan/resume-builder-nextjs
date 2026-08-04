import "server-only";

import {
  createJobFitEngine,
  createOpenAICompatibleProvider,
  type JobFitModelProvider,
  type StructuredGenerationRequest,
} from "@meyhuan/job-fit-engine/server";
import type {
  CanonicalResume,
  FocusArea,
  JobFitPatch,
  OptimizationMode,
} from "@meyhuan/job-fit-engine/contracts";
import type { ResumeData } from "@/entities/resume/resume-data";
import { getDefaultModel, resolveApiKey } from "@/lib/ai/ai-runtime-config";
import type { JobFitFocusArea, JobFitGenerationResult } from "./types";
import { toCanonicalResume, toLegacyJobFitResult } from "./shared-adapter";

interface SharedGenerateInput {
  readonly resume: ResumeData;
  readonly jobTitle: string;
  readonly companyName?: string;
  readonly jobDescription: string;
  readonly focusAreas: readonly JobFitFocusArea[];
  readonly optimizationMode: OptimizationMode;
  readonly signal?: AbortSignal;
}

export async function generateSharedJobFit(input: SharedGenerateInput): Promise<JobFitGenerationResult> {
  const canonical = toCanonicalResume(input.resume);
  const engine = createJobFitEngine({ provider: getProvider(canonical) });
  const result = await engine.tailor({
    resume: canonical,
    job: {
      title: input.jobTitle,
      company: input.companyName ?? "",
      description: input.jobDescription,
      url: "",
    },
    mode: input.optimizationMode,
    focusAreas: input.focusAreas.map(mapFocusArea),
  }, { signal: input.signal });
  return toLegacyJobFitResult(input.resume, result, input.jobTitle);
}

function getProvider(resume: CanonicalResume): JobFitModelProvider {
  const model = getDefaultModel();
  if (
    process.env.JOB_FIT_FAKE_AI === "true" ||
    (!process.env[model.apiKeyEnv] && process.env.NODE_ENV !== "production")
  ) {
    return createFakeProvider(resume);
  }
  return createOpenAICompatibleProvider({
    apiKey: resolveApiKey(model),
    baseUrl: model.baseUrl,
    model: model.name,
    name: "dashscope",
    timeoutMs: 90_000,
    extraBody: { enable_thinking: false },
  });
}

function mapFocusArea(value: JobFitFocusArea): FocusArea {
  return ({
    keywords: "KEYWORDS",
    achievements: "ACHIEVEMENTS",
    concise: "CONCISE",
    structure: "STRUCTURE",
  } as const)[value];
}

function createFakeProvider(resume: CanonicalResume): JobFitModelProvider {
  return {
    name: "job-fit-fake",
    model: "deterministic-local",
    async generate<T>(request: StructuredGenerationRequest<T>) {
      let output: unknown;
      if (request.operation === "ANALYZE_JOB") {
        const job = JSON.parse(request.user) as { description?: string };
        const keywords = [...new Set((job.description ?? "").match(/[\p{Script=Han}]{2,6}|[A-Za-z][A-Za-z+#.]{2,}/gu) ?? [])].slice(0, 8);
        output = {
          requirements: (keywords.length ? keywords : ["岗位要求"]).map((keyword, index) => ({
            id: `req-${index + 1}`,
            type: index % 3 === 0 ? "KEYWORD" : index % 3 === 1 ? "CAPABILITY" : "EXPERIENCE",
            label: keyword,
            keywords: [keyword],
            weight: Math.max(1, 8 - index),
            reason: "岗位描述中的重点要求",
          })),
        };
      } else if (request.operation === "TAILOR") {
        const bullet = resume.sections.flatMap((section) => section.items).flatMap((item) => item.bullets)[0];
        const item = resume.sections.flatMap((section) => section.items).find((entry) => entry.bullets.some((entryBullet) => entryBullet.id === bullet?.id));
        const section = resume.sections.find((entry) => entry.items.some((entryItem) => entryItem.id === item?.id));
        const sprint = request.system.includes("冲刺增强模式");
        const patch: JobFitPatch | null = bullet && item && section ? {
          id: "fake-patch-1",
          kind: "REPLACE_BULLET",
          locator: { sectionId: section.id, itemId: item.id, bulletId: bullet.id },
          text: sprint
            ? `${bullet.text.replace(/[。.]$/, "")}，并结合数据复盘持续优化执行效率。`
            : `${bullet.text.replace(/[。.]$/, "")}，确保工作准确、高效交付。`,
          skill: "",
          orderedIds: [],
          category: "EXPERIENCE",
          reason: "突出与目标岗位相关的职责和执行结果",
          requirementIds: ["req-1"],
          evidenceIds: [`evidence-bullet-${bullet.id}`],
          claimStatus: sprint ? "AI_INFERRED" : "SOURCE_BACKED",
        } : null;
        output = {
          patches: patch ? [patch] : [],
          completed: patch ? ["增强岗位相关经历表达"] : [],
          suggestions: patch ? [] : ["当前简历内容较少，建议补充一段与岗位相关的项目或经历。"],
        };
      } else if (request.operation === "VERIFY") {
        const payload = JSON.parse(request.user) as { patches?: JobFitPatch[] };
        output = {
          decisions: (payload.patches ?? []).map((patch) => ({
            patchId: patch.id,
            approved: true,
            code: "OK",
            reason: "本地测试适配器确认",
            confidence: 0.85,
          })),
        };
      } else {
        output = { resume };
      }
      return { output: request.schema.parse(output) };
    },
  };
}
