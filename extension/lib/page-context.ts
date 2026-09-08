import type { PageIdentity } from "./page-session";

export type PageIssue = "site_access_required" | "no_active_tab" | "unsupported_page" | "page_loading" | "page_unavailable";
export interface PageContext { page: PageIdentity | null; pageIssue: PageIssue | null }

// A tab ID is available without URL access. Do not conflate a redacted URL with no tab.
export function classifyActiveTab(tab?: { id?: number; url?: string; status?: string }): PageContext {
  if (tab?.id === undefined || tab.id < 0) return { page: null, pageIssue: "no_active_tab" };
  if (!tab.url) return { page: null, pageIssue: "site_access_required" };
  try {
    const url = new URL(tab.url);
    if (!["https:", "http:"].includes(url.protocol) ||
      url.hostname === "chromewebstore.google.com" ||
      (url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore")) ||
      (url.hostname === "microsoftedge.microsoft.com" && url.pathname.startsWith("/addons"))) {
      return { page: null, pageIssue: "unsupported_page" };
    }
  } catch { return { page: null, pageIssue: "unsupported_page" }; }
  if (tab.status === "loading") return { page: null, pageIssue: "page_loading" };
  return { page: { tabId: tab.id, url: tab.url }, pageIssue: null };
}

export const PAGE_ISSUE_MESSAGES: Record<PageIssue, string> = {
  site_access_required: "尚无法读取当前页面地址，可能还未获得网站访问权限。请在招聘表单页面点击下方授权按钮；允许后再点击填写。",
  no_active_tab: "没有找到当前标签页。请先打开招聘官网的简历编辑页面，再重新检测。",
  unsupported_page: "当前是浏览器设置、扩展商店或其他受限制页面，不能填写。请切换到招聘官网的简历编辑页面。",
  page_loading: "当前页面正在加载，请等待加载完成。插件会自动重新检测。",
  page_unavailable: "暂时无法检测当前页面，请重新检测；仍失败时，请关闭插件侧栏后重新打开。",
};
