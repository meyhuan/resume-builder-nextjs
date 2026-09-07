import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateApplication } from "@/features/applications/service";
import { requireExtensionUser } from "@/features/extension-auth/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const authorization = await requireExtensionUser(
      request,
      "applications:write",
    );
    const { id } = await params;
    return NextResponse.json(
      await updateApplication(authorization.userId, id, await request.json()),
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "投递状态无效" }, { status: 400 });
    if (error instanceof Error && error.message === "EXTENSION_UNAUTHORIZED")
      return NextResponse.json({ error: "插件授权已失效" }, { status: 401 });
    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND")
      return NextResponse.json({ error: "投递记录不存在" }, { status: 404 });
    console.error("[extension/applications/id]", error);
    return NextResponse.json({ error: "更新投递状态失败" }, { status: 500 });
  }
}
