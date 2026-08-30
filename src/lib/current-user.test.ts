import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { upsert: mocks.upsert } },
}));

import { getCurrentUser, requireCurrentUser } from "./current-user";

describe("current user", () => {
  beforeEach(() => {
    mocks.cookies.mockReset();
    mocks.upsert.mockReset();
  });

  it("returns null when the auth cookie is missing", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("creates the local user when an authenticated cookie is new to the database", async () => {
    const user = {
      id: "user-1",
      wxId: "test-wx-id",
      name: null,
      email: null,
    };
    mocks.cookies.mockResolvedValue({
      get: (name: string) =>
        name === "auth_uid" ? { value: "test-wx-id" } : undefined,
    });
    mocks.upsert.mockResolvedValue(user);

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { wxId: "test-wx-id" },
      update: {},
      create: { wxId: "test-wx-id" },
      select: { id: true, wxId: true, name: true, email: true },
    });
  });

  it("still rejects requests without an authenticated cookie", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });

    await expect(requireCurrentUser()).rejects.toThrow("UNAUTHORIZED");
  });
});
