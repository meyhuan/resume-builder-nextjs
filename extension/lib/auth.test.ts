import { describe, expect, it } from "vitest";
import { ExtensionAuthError, parseAuthCallback } from "./auth";

describe("parseAuthCallback", () => {
  it("returns a valid authorization code", () => {
    expect(
      parseAuthCallback(
        "https://example.chromiumapp.org/oauth2?state=expected&code=code-1",
        "expected",
      ),
    ).toBe("code-1");
  });

  it("classifies an absent website session", () => {
    expect(() =>
      parseAuthCallback(
        "https://example.chromiumapp.org/oauth2?state=expected&error=login_required",
        "expected",
      ),
    ).toThrowError(
      expect.objectContaining<Partial<ExtensionAuthError>>({
        code: "login_required",
      }),
    );
  });

  it("rejects a callback with a mismatched state", () => {
    expect(() =>
      parseAuthCallback(
        "https://example.chromiumapp.org/oauth2?state=other&code=code-1",
        "expected",
      ),
    ).toThrowError(
      expect.objectContaining<Partial<ExtensionAuthError>>({
        code: "state_mismatch",
      }),
    );
  });
});
