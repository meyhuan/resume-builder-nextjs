import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import {
  issueExtensionAuthCode,
  isAllowedExtensionRedirect,
} from "@/features/extension-auth/server";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as {
      redirectUri?: unknown;
      codeChallenge?: unknown;
    };
    const redirectUri =
      typeof body.redirectUri === "string" ? body.redirectUri : "";
    const codeChallenge =
      typeof body.codeChallenge === "string" ? body.codeChallenge : "";
    if (
      !isAllowedExtensionRedirect(redirectUri) ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
    ) {
      return NextResponse.json(
        { error: "无效的插件授权请求" },
        { status: 400 },
      );
    }
    const code = await issueExtensionAuthCode({
      userId: user.id,
      codeChallenge,
      redirectUri,
    });
    return NextResponse.json({ code });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[extension/auth-code]", error);
    return NextResponse.json({ error: "创建插件授权失败" }, { status: 500 });
  }
}
