import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EXTENSION_SCOPES,
  hashCredential,
  randomCredential,
  verifyPkce,
} from "@/features/extension-auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: unknown;
      codeVerifier?: unknown;
      redirectUri?: unknown;
      deviceName?: unknown;
    };
    const code = typeof body.code === "string" ? body.code : "";
    const verifier =
      typeof body.codeVerifier === "string" ? body.codeVerifier : "";
    const redirectUri =
      typeof body.redirectUri === "string" ? body.redirectUri : "";
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
    await prisma.$transaction([
      prisma.extensionAuthCode.update({
        where: { id: authCode.id },
        data: { usedAt: new Date() },
      }),
      prisma.extensionAuthorization.create({
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
      }),
    ]);
    return NextResponse.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresAt: expiresAt.toISOString(),
      scopes: EXTENSION_SCOPES,
    });
  } catch (error) {
    console.error("[extension/token]", error);
    return NextResponse.json({ error: "插件授权失败" }, { status: 500 });
  }
}
