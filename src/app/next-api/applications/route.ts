import { JobApplicationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import {
  createOrReuseApplication,
  listApplications,
} from "@/features/applications/service";
import { applicationStatusSchema } from "@/features/applications/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const rawStatus = request.nextUrl.searchParams.get("status");
    const status = rawStatus
      ? (applicationStatusSchema.parse(rawStatus) as JobApplicationStatus)
      : undefined;
    return NextResponse.json(await listApplications(user.id, status));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(
      await createOrReuseApplication(user.id, await request.json()),
    );
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "投递信息格式不正确", issues: error.issues },
      { status: 400 },
    );
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof Error && error.message === "RESUME_NOT_FOUND")
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  console.error("[applications]", error);
  return NextResponse.json({ error: "投递记录操作失败" }, { status: 500 });
}
