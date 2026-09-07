import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createEmptyApplicationProfile } from "@/features/application-profile/schema";
import ApplicationProfileClient from "./profile-client";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/features/applications/client-request", () => ({
  applicationRequest: mocks.request,
}));
vi.mock("sonner", () => ({ toast: mocks }));

const syncPath = "/next-api/application-profile/sync";
let loaded = createEmptyApplicationProfile();
let synced = createEmptyApplicationProfile();
beforeEach(() => {
  vi.resetAllMocks();
  loaded = createEmptyApplicationProfile();
  synced = createEmptyApplicationProfile();
  synced.personal.fullName = "合成测试姓名";
  mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.includes("authorizations")) return [];
    if (path === syncPath)
      return { profile: synced, defaultResumeId: "resume-b" };
    if (init?.method === "PUT") return { updatedAt: new Date().toISOString() };
    return {
      profile: loaded,
      defaultResumeId: "resume-a",
      resumes: [
        { id: "resume-a", title: "合成简历甲" },
        { id: "resume-b", title: "合成简历乙" },
      ],
    };
  });
});
afterEach(cleanup);
async function mount() {
  render(<ApplicationProfileClient />);
  await screen.findByRole("combobox", { name: "默认简历" });
}
function selectResume(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "默认简历" }), {
    target: { value },
  });
}
function nameInput() {
  return document.getElementById("基本信息-fullName")!;
}
function syncButton() {
  return screen.getByRole("button", { name: "从简历补充空缺" });
}
const dirtyMessage = "有未保存的修改，插件暂时无法读取这些修改。";

it("selecting a resume can sync immediately without saving an empty profile first", async () => {
  await mount();
  selectResume("resume-b");
  fireEvent.click(syncButton());
  await waitFor(() => expect(nameInput()).toHaveValue("合成测试姓名"));
  expect(mocks.request).toHaveBeenCalledWith(
    syncPath,
    expect.objectContaining({ body: JSON.stringify({ resumeId: "resume-b" }) }),
  );
  expect(
    mocks.request.mock.calls.some(([, init]) => init?.method === "PUT"),
  ).toBe(false);
  expect(screen.queryByText(dirtyMessage)).not.toBeInTheDocument();
});

it("manual profile edits still block synchronization and preserve input", async () => {
  await mount();
  selectResume("resume-b");
  fireEvent.change(nameInput(), { target: { value: "手动输入" } });
  fireEvent.click(syncButton());
  expect(mocks.warning).toHaveBeenCalledWith(
    "请先保存当前修改，再从简历补充空缺。",
  );
  expect(mocks.request.mock.calls.some(([path]) => path === syncPath)).toBe(
    false,
  );
  expect(nameInput()).toHaveValue("手动输入");
});

it("reverting the selection clears the unsaved state", async () => {
  await mount();
  selectResume("resume-b");
  expect(screen.getByText(dirtyMessage)).toBeInTheDocument();
  selectResume("resume-a");
  expect(screen.queryByText(dirtyMessage)).not.toBeInTheDocument();
});

it("reverting a manual edit allows synchronization again", async () => {
  await mount();
  selectResume("resume-b");
  fireEvent.change(nameInput(), { target: { value: "临时输入" } });
  fireEvent.change(nameInput(), { target: { value: "" } });
  fireEvent.click(syncButton());
  await waitFor(() => expect(nameInput()).toHaveValue("合成测试姓名"));
});

it("failed sync preserves the selected resume and allows an explicit retry", async () => {
  await mount();
  selectResume("resume-b");
  mocks.request.mockRejectedValueOnce(new Error("合成网络故障"));
  fireEvent.click(syncButton());
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(screen.getByRole("combobox", { name: "默认简历" })).toHaveValue(
    "resume-b",
  );
  expect(screen.getByText(dirtyMessage)).toBeInTheDocument();
  fireEvent.click(syncButton());
  await waitFor(() => expect(nameInput()).toHaveValue("合成测试姓名"));
});

it("blocks double sync and disables form controls until synchronization settles", async () => {
  await mount();
  selectResume("resume-b");
  let finish!: (value: unknown) => void;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const button = syncButton();
  fireEvent.click(button);
  fireEvent.click(button);
  expect(
    mocks.request.mock.calls.filter(([path]) => path === syncPath),
  ).toHaveLength(1);
  expect(nameInput()).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "默认简历" })).toBeDisabled();
  await act(async () =>
    finish({ profile: synced, defaultResumeId: "resume-b" }),
  );
  expect(nameInput()).toBeEnabled();
  expect(screen.queryByText(dirtyMessage)).not.toBeInTheDocument();
});

it("save acknowledgement does not clear edits made while saving", async () => {
  await mount();
  fireEvent.change(nameInput(), { target: { value: "已发送版本" } });
  let finish!: (value: unknown) => void;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "保存资料" }));
  fireEvent.change(nameInput(), { target: { value: "后续新编辑" } });
  await act(async () => finish({ updatedAt: new Date().toISOString() }));
  expect(nameInput()).toHaveValue("后续新编辑");
  expect(screen.getByText(dirtyMessage)).toBeInTheDocument();
  fireEvent.click(syncButton());
  expect(mocks.warning).toHaveBeenCalled();
});

it("save failure keeps edits dirty and synchronization blocked", async () => {
  await mount();
  fireEvent.change(nameInput(), { target: { value: "尚未保存" } });
  mocks.request.mockRejectedValueOnce(new Error("保存失败"));
  fireEvent.click(screen.getByRole("button", { name: "保存资料" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(nameInput()).toHaveValue("尚未保存");
  expect(screen.getByText(dirtyMessage)).toBeInTheDocument();
  fireEvent.click(syncButton());
  expect(mocks.warning).toHaveBeenCalled();
});

it("no selected resume prompts the user without a sync request", async () => {
  await mount();
  selectResume("");
  fireEvent.click(syncButton());
  expect(mocks.warning).toHaveBeenCalledWith("请先选择默认简历");
  expect(mocks.request.mock.calls.some(([path]) => path === syncPath)).toBe(
    false,
  );
});
