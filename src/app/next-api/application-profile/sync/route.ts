import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { syncApplicationProfile } from "@/features/application-profile/service";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      resumeId?: unknown;
    };
    const result = await syncApplicationProfile(
      user.id,
      typeof body.resumeId === "string" ? body.resumeId : null,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof Error && error.message === "DEFAULT_RESUME_REQUIRED")
      return NextResponse.json({ error: "请先选择默认简历" }, { status: 400 });
    if (error instanceof Error && error.message === "RESUME_NOT_FOUND")
      return NextResponse.json({ error: "默认简历不存在" }, { status: 404 });
    console.error("[application-profile/sync]", error);
    return NextResponse.json({ error: "同步简历失败" }, { status: 500 });
  }
}
