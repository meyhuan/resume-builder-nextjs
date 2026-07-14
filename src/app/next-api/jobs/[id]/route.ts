import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import { mergeJobEvidence } from "@/lib/jobs/job-evidence";
import { updateJobSchema } from "@/lib/jobs/job-contracts";
import {
  deleteJobWorkspace,
  JobNotFoundError,
  updateJobWorkspace,
} from "@/lib/jobs/job-service";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { code: "AUTH_REQUIRED", error: "请先登录" },
      { status: 401 },
    );

  const { id } = await context.params;
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      baseResume: { select: { id: true, title: true, updatedAt: true } },
      tailoredResume: {
        select: {
          id: true,
          title: true,
          template: true,
          thumbnail: true,
          updatedAt: true,
        },
      },
      factSet: {
        select: {
          id: true,
          revision: true,
          confirmedAt: true,
          sourceContentHash: true,
          facts: true,
          confirmedFactIds: true,
        },
      },
    },
  });

  if (!job)
    return NextResponse.json(
      { code: "JOB_NOT_FOUND", error: "岗位不存在" },
      { status: 404 },
    );
  const confirmedIds = Array.isArray(job.factSet.confirmedFactIds)
    ? new Set(
        job.factSet.confirmedFactIds.filter(
          (value): value is string => typeof value === "string",
        ),
      )
    : new Set<string>();
  const baseEvidence = parseResumeFacts(job.factSet.facts).filter((fact) =>
    confirmedIds.has(fact.id),
  );
  const confirmedEvidence = mergeJobEvidence(
    baseEvidence,
    job.matchSnapshot,
  ).map((fact) => ({ blockId: fact.blockId, text: fact.text }));
  const safeFactSet = {
    id: job.factSet.id,
    revision: job.factSet.revision,
    confirmedAt: job.factSet.confirmedAt,
    sourceContentHash: job.factSet.sourceContentHash,
  };
  return NextResponse.json({
    job: { ...job, factSet: safeFactSet },
    confirmedEvidence,
  });
}

export async function PATCH(
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
    const input = updateJobSchema.parse(await request.json());
    const job = await updateJobWorkspace(user.id, id, input);
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: "INVALID_JOB_INPUT",
          error: error.issues[0]?.message ?? "岗位信息不正确",
        },
        { status: 400 },
      );
    }
    if (error instanceof JobNotFoundError) {
      return NextResponse.json(
        { code: "JOB_NOT_FOUND", error: "岗位不存在" },
        { status: 404 },
      );
    }
    console.error("[jobs:update] failed", error);
    return NextResponse.json(
      { code: "JOB_UPDATE_FAILED", error: "更新岗位失败，请稍后重试" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
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
    await deleteJobWorkspace(user.id, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      return NextResponse.json(
        { code: "JOB_NOT_FOUND", error: "岗位不存在" },
        { status: 404 },
      );
    }
    console.error("[jobs:delete] failed", error);
    return NextResponse.json(
      { code: "JOB_DELETE_FAILED", error: "删除岗位失败，请稍后重试" },
      { status: 500 },
    );
  }
}
