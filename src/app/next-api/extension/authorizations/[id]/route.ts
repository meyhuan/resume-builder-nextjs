import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const result = await prisma.extensionAuthorization.updateMany({
      where: { id, userId: user.id },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      return NextResponse.json({ error: "授权不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "撤销授权失败" }, { status: 500 });
  }
}
