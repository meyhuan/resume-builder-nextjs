import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  isAllowedExtensionRedirect,
  issueExtensionAuthCode,
} from "@/features/extension-auth/server";

function callbackResponse(
  redirectUri: string,
  state: string,
  values: Record<string, string>,
): NextResponse {
  const callback = new URL(redirectUri);
  callback.searchParams.set("state", state);
  for (const [key, value] of Object.entries(values)) {
    callback.searchParams.set(key, value);
  }
  return NextResponse.redirect(callback);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri") || "";
  const state = url.searchParams.get("state") || "";
  const codeChallenge = url.searchParams.get("code_challenge") || "";

  if (
    !isAllowedExtensionRedirect(redirectUri) ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(state) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
  ) {
    return NextResponse.json(
      { error: "无效的插件静默授权请求" },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return callbackResponse(redirectUri, state, {
        error: "login_required",
      });
    }
    const code = await issueExtensionAuthCode({
      userId: user.id,
      redirectUri,
      codeChallenge,
    });
    return callbackResponse(redirectUri, state, { code });
  } catch (error) {
    console.error("[extension/silent-authorize]", error);
    return callbackResponse(redirectUri, state, { error: "server_error" });
  }
}
