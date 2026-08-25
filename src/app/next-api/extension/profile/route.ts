import { NextResponse } from "next/server";
import { getExtensionProfile } from "@/features/application-profile/service";
import { requireExtensionUser } from "@/features/extension-auth/server";

export async function GET(request: Request) {
  try {
    const authorization = await requireExtensionUser(
      request,
      "application-profile:read",
    );
    const result = await getExtensionProfile(authorization.userId);
    if (!result)
      return NextResponse.json(
        { error: "请先在智简简历维护网申资料" },
        { status: 404 },
      );
    const etag = `"${result.updatedAt}"`;
    if (request.headers.get("if-none-match") === etag)
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    return NextResponse.json(result, {
      headers: { ETag: etag, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EXTENSION_UNAUTHORIZED")
      return NextResponse.json({ error: "插件授权已失效" }, { status: 401 });
    console.error("[extension/profile]", error);
    return NextResponse.json({ error: "读取网申资料失败" }, { status: 500 });
  }
}
