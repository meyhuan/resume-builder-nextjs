import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { updateApplication } from "@/features/applications/service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const item = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
      include: {
        resume: { select: { id: true, title: true } },
        events: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!item)
      return NextResponse.json({ error: "投递记录不存在" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    return NextResponse.json(
      await updateApplication(user.id, id, await request.json()),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const result = await prisma.jobApplication.deleteMany({
      where: { id, userId: user.id },
    });
    if (!result.count)
      return NextResponse.json({ error: "投递记录不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
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
  if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND")
    return NextResponse.json({ error: "投递记录不存在" }, { status: 404 });
  if (error instanceof Error && error.message === "RESUME_NOT_FOUND")
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  console.error("[applications/id]", error);
  return NextResponse.json({ error: "投递记录操作失败" }, { status: 500 });
}
