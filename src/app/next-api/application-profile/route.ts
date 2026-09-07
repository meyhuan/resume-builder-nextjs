import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { applicationProfilePayloadSchema } from "@/features/application-profile/schema";
import {
  readApplicationProfile,
  saveApplicationProfile,
} from "@/features/application-profile/service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(await readApplicationProfile(user.id));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const result = await saveApplicationProfile({
      userId: user.id,
      defaultResumeId:
        typeof body.defaultResumeId === "string" ? body.defaultResumeId : null,
      profile: applicationProfilePayloadSchema.parse(body.profile),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "网申资料格式不正确", issues: error.issues },
      { status: 400 },
    );
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof Error && error.message === "RESUME_NOT_FOUND")
    return NextResponse.json({ error: "默认简历不存在" }, { status: 404 });
  console.error("[application-profile]", error);
  return NextResponse.json({ error: "网申资料操作失败" }, { status: 500 });
}
