import { expect, it } from "vitest";
import { classifyActiveTab } from "./page-context";

it("distinguishes an unpermitted URL from a missing tab", () => {
  expect(classifyActiveTab({ id: 7 })).toEqual({ page: null, pageIssue: "site_access_required" });
  expect(classifyActiveTab()).toEqual({ page: null, pageIssue: "no_active_tab" });
});
it.each(["chrome://settings", "edge://extensions", "about:blank", "file:///resume.html", "chrome-extension://example/sidepanel.html", "https://chromewebstore.google.com/detail/example", "https://microsoftedge.microsoft.com/addons/detail/example", "invalid"])("explains restricted page %s", url => {
  expect(classifyActiveTab({ id: 1, url }).pageIssue).toBe("unsupported_page");
});
it("waits for loading then recognizes arbitrary recruiting hosts, not only a site allowlist", () => {
  const tab = { id: 1, url: "https://talent.taotian.com/personal/social-resume" };
  expect(classifyActiveTab({ ...tab, status: "loading" }).pageIssue).toBe("page_loading");
  expect(classifyActiveTab({ ...tab, status: "complete" })).toEqual({ page: {tabId:1,url:tab.url}, pageIssue:null });
  expect(classifyActiveTab({id:0,url:"https://new-employer.example/apply"}).page).not.toBeNull();
});
