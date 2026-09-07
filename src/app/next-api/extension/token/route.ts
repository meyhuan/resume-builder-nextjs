import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EXTENSION_SCOPES,
  hashCredential,
  randomCredential,
  isAllowedExtensionRedirect,
  verifyPkce,
} from "@/features/extension-auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: unknown;
      codeVerifier?: unknown;
      redirectUri?: unknown;
      deviceName?: unknown;
    };
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({error: "无效的授权请求"}, {status:400});
    const code = typeof body.code === "string" ? body.code : "";
    const verifier =
      typeof body.codeVerifier === "string" ? body.codeVerifier : "";
    const redirectUri =
      typeof body.redirectUri === "string" ? body.redirectUri : "";
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(code) || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier) || !isAllowedExtensionRedirect(redirectUri)) {
      return NextResponse.json({error: "无效的授权请求"}, {status: 400});
    }
    const authCode = await prisma.extensionAuthCode.findUnique({
      where: { codeHash: hashCredential(code) },
    });
    if (
      !authCode ||
      authCode.usedAt ||
      authCode.expiresAt <= new Date() ||
      authCode.redirectUri !== redirectUri ||
      !verifyPkce(verifier, authCode.codeChallenge)
    ) {
      return NextResponse.json(
        { error: "授权码无效或已过期" },
        { status: 400 },
      );
    }
    const token = randomCredential(48);
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async transaction => {
      const claimed = await transaction.extensionAuthCode.updateMany({
        where: { id: authCode.id, usedAt: null, expiresAt: {gt: new Date()} },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("AUTH_CODE_USED");
      await transaction.extensionAuthorization.create({
        data: {
          userId: authCode.userId,
          tokenHash: hashCredential(token),
          deviceName:
            typeof body.deviceName === "string"
              ? body.deviceName.slice(0, 100)
              : "Chrome 扩展",
          scopes: EXTENSION_SCOPES,
          expiresAt,
        },
      });
    });
    return NextResponse.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresAt: expiresAt.toISOString(),
      scopes: EXTENSION_SCOPES,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CODE_USED") return NextResponse.json({error: "授权码已使用或过期"}, {status:400});
    console.error("[extension/token]", error);
    return NextResponse.json({ error: "插件授权失败" }, { status: 500 });
  }
}
