import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createOrReuseApplication } from "@/features/applications/service";
import { requireExtensionUser } from "@/features/extension-auth/server";

export async function POST(request: Request) {
  try {
    const authorization = await requireExtensionUser(
      request,
      "applications:write",
    );
    return NextResponse.json(
      await createOrReuseApplication(
        authorization.userId,
        await request.json(),
      ),
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "职位信息不完整" }, { status: 400 });
    if (error instanceof Error && error.message === "EXTENSION_UNAUTHORIZED")
      return NextResponse.json({ error: "插件授权已失效" }, { status: 401 });
    console.error("[extension/applications]", error);
    return NextResponse.json({ error: "创建投递记录失败" }, { status: 500 });
  }
}
