import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const store = await cookies();
  const wxId = store.get("auth_uid")?.value;
  if (!wxId) return null;
  return prisma.user.findUnique({
    where: { wxId },
    select: { id: true, wxId: true, name: true, email: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
