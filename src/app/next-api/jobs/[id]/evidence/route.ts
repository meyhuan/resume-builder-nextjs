import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  analyzeJobWorkspace,
  FactsNotConfirmedError,
} from "@/lib/jobs/job-analysis";
import {
  JobEvidenceInvalidError,
  JobEvidenceNotFoundError,
  saveJobEvidenceAnswer,
} from "@/lib/jobs/job-evidence";

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

const inputSchema = z.object({
  requirementId: z.string().trim().min(1),
  answer: z.enum(["yes", "similar", "no"]),
  detail: z.string().trim().max(1200).optional(),
  sourceFactId: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { code: "AUTH_REQUIRED", error: "请先登录" },
      { status: 401 },
    );

  try {
    const { id } = await context.params;
    const input = inputSchema.parse(await request.json());
    const evidence = await saveJobEvidenceAnswer(user.id, id, input);
    const analysis = await analyzeJobWorkspace(user.id, id);
    return NextResponse.json({ evidence, analysis });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: "INVALID_INPUT",
          error: error.issues[0]?.message ?? "补充内容不正确",
        },
        { status: 400 },
      );
    }
    if (error instanceof JobEvidenceInvalidError) {
      return NextResponse.json(
        {
          code: "INVALID_EVIDENCE",
          error: "请选择关联经历，并至少填写 12 个字的真实细节",
        },
        { status: 400 },
      );
    }
    if (error instanceof FactsNotConfirmedError) {
      return NextResponse.json(
        { code: "FACTS_NOT_CONFIRMED", error: "请先确认可用于岗位的经历" },
        { status: 409 },
      );
    }
    if (error instanceof JobEvidenceNotFoundError) {
      return NextResponse.json(
        { code: "JOB_NOT_FOUND", error: "岗位不存在" },
        { status: 404 },
      );
    }
    console.error("[jobs:evidence] failed", error);
    return NextResponse.json(
      { code: "EVIDENCE_SAVE_FAILED", error: "补充经历保存失败，请稍后重试" },
      { status: 500 },
    );
  }
}
