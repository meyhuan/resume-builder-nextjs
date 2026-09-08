"use client";

/* Hallmark · macrostructure: Narrative Workflow · genre: modern-minimal
 * theme: existing violet system · nav: N9 · footer: Ft2 · enrichment: none
 * audience: first-time extension users · goal: first autofill · tone: utilitarian
 * pre-emit critique: P4 H4 E4 S5 R5 V4
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { track, type AnalyticsEventName } from "@/lib/analytics";
import release from "@/features/extension-guide/release.json";
import { GuideScreenshot } from "@/components/extension/guide-screenshot";

const button =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80`;
const link =
  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function guideTrack(
  event: AnalyticsEventName,
  properties: Record<string, string> = {},
) {
  try {
    track(event, { ...properties, version: release.version });
  } catch {
    /* A blocked storage/analytics endpoint must never break setup. */
  }
}

export default function ExtensionGuide() {
  const [browser, setBrowser] = useState<"chrome" | "edge">("chrome");
  const [copyState, setCopyState] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const [downloadState, setDownloadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const downloading = useRef(false);
  const copySequence = useRef(0);
  const copyReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const address = `${browser}://extensions/`;

  useEffect(() => {
    guideTrack("extension_guide_view");
    return () => {
      if (copyReset.current) clearTimeout(copyReset.current);
    };
  }, []);

  async function copyAddress() {
    const sequence = ++copySequence.current;
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(address);
      if (sequence !== copySequence.current) return;
      setCopyState("copied");
      guideTrack("extension_guide_action", {
        action: "copy_extensions_address",
        browser,
      });
      copyReset.current = setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      if (sequence === copySequence.current) setCopyState("error");
    }
  }

  async function download() {
    if (downloading.current) return;
    downloading.current = true;
    setDownloadState("loading");
    guideTrack("extension_download_start", { browser });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(release.href, { signal: controller.signal });
      if (!response.ok) throw new Error("download_unavailable");
      const bytes = await response.arrayBuffer();
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      ]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== release.sha256) throw new Error("download_integrity");
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/zip" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = release.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setDownloadState("ready");
      guideTrack("extension_download_ready", { browser });
    } catch {
      setDownloadState("error");
      guideTrack("extension_download_failed", { browser });
    } finally {
      clearTimeout(timeout);
      downloading.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link
          href="/"
          aria-label="智简简历首页"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Image
            src="/logo-aijianli.png"
            alt="智简简历"
            width={136}
            height={38}
            priority
            className="h-auto w-32"
          />
        </Link>
        <Link href="/dashboard" className={link}>
          进入工作台 <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <main
        id="extension-guide"
        className="mx-auto max-w-6xl px-5 pb-16 pt-7 sm:px-8 sm:pt-12"
      >
        <section
          className="grid min-w-0 gap-8 border-b border-border pb-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16"
          aria-labelledby="guide-title"
        >
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-primary">
              智简网申助手 · 浏览器插件
            </p>
            <h1
              id="guide-title"
              className="min-w-0 text-3xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl"
            >
              换一个招聘官网，
              <br />
              不用再从头填简历。
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              把已保存的网申资料带到公司招聘官网，辅助填写个人信息、教育和工作经历。填写后核对结果，再由你决定是否投递。
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              适用于电脑端 Chrome 116+；Edge
              可按同样方式尝试安装。暂不支持手机浏览器、Safari 和 Firefox。
            </p>
          </div>
          <aside
            className="min-w-0 self-start rounded-2xl bg-muted p-6"
            aria-label="下载安装包"
          >
            <h2 className="text-lg font-bold">先安装，再开始填写</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              目前采用 ZIP
              手动安装，无需等待应用商店。下载不需要登录，读取资料时才需要连接账号。
            </p>
            <button
              onClick={() => void download()}
              disabled={downloadState === "loading"}
              className={`${primary} mt-5 w-full`}
              aria-busy={downloadState === "loading"}
            >
              {downloadState === "ready" ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {downloadState === "loading"
                ? "正在准备安装包…"
                : downloadState === "error"
                  ? "重新下载安装包"
                  : downloadState === "ready"
                    ? "重新下载安装包"
                    : "下载安装包"}
            </button>
            <p className="mt-3 text-sm tabular-nums text-muted-foreground">
              版本 {release.version} · ZIP · {Math.ceil(release.size / 1024)} KB
            </p>
            <p
              role={downloadState === "error" ? "alert" : "status"}
              className="mt-3 text-sm leading-6"
            >
              {downloadState === "error"
                ? "安装包未能下载或校验未通过，请刷新重试；仍失败可在页面底部反馈。"
                : downloadState === "ready"
                  ? "安装包已准备，请在浏览器下载列表查看。接下来解压并安装；下载不代表已安装或已连接。"
                  : "解压到固定文件夹，安装后不要删除或移动这个文件夹。"}
            </p>
            <a href="#install" className={`${link} mt-2`}>
              查看安装步骤 <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </aside>
        </section>

        <section
          id="install"
          className="scroll-mt-6 pt-10"
          aria-labelledby="install-title"
        >
          <h2 id="install-title" className="text-2xl font-bold">
            第一次使用，按这个顺序来
          </h2>
          <div
            className="mt-5 flex flex-wrap gap-2"
            role="group"
            aria-label="选择浏览器"
          >
            {(["chrome", "edge"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={browser === value}
                onClick={() => {
                  copySequence.current++;
                  if (copyReset.current) clearTimeout(copyReset.current);
                  setBrowser(value);
                  setCopyState("idle");
                  guideTrack("extension_guide_action", {
                    action: "select_browser",
                    browser: value,
                  });
                }}
                className={browser === value ? primary : button}
              >
                {value === "chrome" ? "Chrome 浏览器" : "Edge 浏览器"}
              </button>
            ))}
          </div>
          <ol className="mt-6 divide-y divide-border">
            <li className="py-6">
              <h3 className="text-lg font-bold">1. 解压安装包，加载到浏览器</h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                将下载的 ZIP 解压到固定文件夹。复制下面的地址，粘贴到
                {browser === "chrome" ? " Chrome " : " Edge "}地址栏并打开。
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <code className="min-w-0 select-all rounded-lg bg-muted px-3 py-3 text-sm [overflow-wrap:anywhere]">
                  {address}
                </code>
                <button
                  onClick={() => void copyAddress()}
                  disabled={copyState === "copying"}
                  className={button}
                >
                  {copyState === "copied" ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copyState === "copied"
                    ? "已复制"
                    : copyState === "copying"
                      ? "正在复制…"
                      : "复制管理页地址"}
                </button>
              </div>
              {copyState === "error" && (
                <p role="alert" className="mt-2 text-sm">
                  浏览器未允许复制，请选中上方地址手动复制。
                </p>
              )}
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                浏览器限制普通网页直接打开扩展管理页，因此这里提供复制地址。
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7">
                开启“开发者模式”，点击“加载已解压的扩展程序”，选择
                <strong>包含 manifest.json 的文件夹</strong>。不要选择 ZIP
                文件，也不要选它的上一层目录。
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                如果公司电脑禁用了开发者模式，请联系管理员，不要绕过限制。安装完成后，可在浏览器拼图图标中固定「智简网申助手」。
              </p>
              <GuideScreenshot
                id="chrome-install"
                title="找到安装入口"
                description={
                  browser === "chrome"
                    ? "Chrome 中文界面实拍。开关在右上角，开启后左侧出现加载按钮；浏览器版本不同，外观可能略有差异。"
                    : "下图为 Chrome 操作参考，不是 Edge 截图。请在 Edge 扩展管理页找到开发人员模式及加载解压缩扩展的入口，以浏览器内实际按钮名称和位置为准。"
                }
              />
              <div className="mt-4 rounded-xl bg-muted p-4 text-sm leading-6">
                <p className="font-semibold">
                  弹出文件夹选择窗口后，选哪一层？
                </p>
                <p className="mt-1 text-muted-foreground">
                  先用文件管理器打开解压目录，确认里面直接有
                  manifest.json，再选中这一层文件夹。文件夹选择窗口可能只显示文件夹、不显示文件，这是正常的。
                </p>
                <pre
                  className="mt-3 overflow-x-auto text-xs leading-6"
                  aria-label="解压目录结构示意"
                >
                  {
                    "解压后的插件文件夹  ← 选择这一层\n├─ manifest.json\n├─ sidepanel.html\n├─ chunks/\n└─ icon/"
                  }
                </pre>
              </div>
            </li>
            <li className="py-6">
              <h3 className="text-lg font-bold">
                2. 登录智简简历，保存网申资料
              </h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                在同一个浏览器、同一个用户配置中登录。选择一份简历，点击“从简历补充空缺”，再补充简历里没有的信息。手动修改后记得点“保存资料”，插件只读取已保存版本。
              </p>
              <a
                href="https://aijianli.cn/dashboard/application-profile"
                target="_blank"
                rel="noopener noreferrer"
                className={`${link} mt-2`}
                onClick={() =>
                  guideTrack("extension_guide_action", {
                    action: "open_profile",
                  })
                }
              >
                维护网申资料{" "}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">（新窗口）</span>
              </a>
              <p className="text-sm leading-6 text-muted-foreground">
                安装包连接正式站
                aijianli.cn；本地测试站的登录状态和资料不会自动传到正式站。
              </p>
              <GuideScreenshot
                id="profile-setup"
                title="选择简历，补充并保存资料"
                description="真实资料页截图，使用虚构的演示资料。先选简历，再补充空缺；后续手动修改需要点右上角保存。"
              />
            </li>
            <li className="py-6">
              <h3 className="text-lg font-bold">3. 打开招聘官网，用插件填写</h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                进入公司官网的简历编辑或职位申请页面，从浏览器工具栏打开「智简网申助手」。阅读并同意首次使用说明；网站登录仍有效时，插件会尝试自动连接，无需复制
                Token。
              </p>
              <p className="mt-3 max-w-3xl text-base leading-7">
                看到“已连接智简简历”后，点击“一键填写此页面”，按浏览器提示授权网页访问。核对已填写内容，并手动补充未识别的字段、附件和验证码。
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                各网站的字段和控件不同，无法保证全部填写。插件不会替你点击保存或提交，但招聘网站自身可能自动保存草稿。
              </p>
              <GuideScreenshot
                id="plugin-fill"
                title="在插件侧栏开始填写"
                description="真实插件界面截图，连接状态为隔离环境中的演示状态，不代表你的浏览器已连接。请以自己插件中的提示为准。"
              />
            </li>
            <li className="py-6">
              <h3 className="text-lg font-bold">4. 自行提交，再确认投递状态</h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                使用插件填写会尝试创建“待投递”记录。只有在招聘官网完成提交后，再回插件确认“我已完成投递”。你也可以在投递管理里手动添加和更新记录。
              </p>
              <a
                href="https://aijianli.cn/dashboard/applications"
                target="_blank"
                rel="noopener noreferrer"
                className={`${link} mt-2`}
                onClick={() =>
                  guideTrack("extension_guide_action", {
                    action: "open_applications",
                  })
                }
              >
                打开投递管理{" "}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">（新窗口）</span>
              </a>
            </li>
          </ol>
        </section>

        <section
          className="mt-8 border-t border-border pt-8"
          aria-labelledby="help-title"
        >
          <h2 id="help-title" className="text-2xl font-bold">
            遇到问题，先看这里
          </h2>
          <div className="mt-5 divide-y divide-border">
            {[
              [
                "已经登录，插件还是连不上？",
                "确认登录的是 aijianli.cn，且网站与插件处于同一个浏览器用户配置。打开插件重新检测登录状态；登录过期时重新登录。仍无法连接，请在反馈中提供插件版本和错误提示，不要附 Token 或简历正文。",
              ],
              [
                "填写按钮灰色怎么办？",
                "先确认插件版本为 0.5.1 或更新版本，查看按钮下方的具体原因。若提示无法读取页面地址，在招聘表单页点击“授权并重新检测”，允许后再点击填写；页面加载中则稍等。旧版没有原因提示，请先更新插件并重新加载。网站显示已登录或插件显示已连接，不代表已获得招聘网站访问权限。",
              ],
              [
                "插件打不开怎么办？",
                "通常是解压文件夹被移动或删除。恢复原文件夹，或在扩展管理中重新选择包含 manifest.json 的目录。若同时安装了多个版本，请核对版本号，避免打开旧插件。",
              ],
              [
                "新版本如何更新？",
                "手动安装版不会自动升级。先备份原插件目录，把新版解压后的全部文件完整替换到原目录，再在扩展管理页点击“重新加载”。不要混用新旧文件；已打开的招聘页面可能需要刷新，刷新前请处理未保存的内容。",
              ],
              [
                "下载就是安装成功了吗？",
                "不能仅凭下载判断安装。网站上的连接授权也可能属于另一台设备。请以当前浏览器插件内“已连接智简简历”的提示为准。",
              ],
            ].map(([question, answer]) => (
              <details key={question} className="py-1">
                <summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-ring">
                  {question}
                </summary>
                <p className="max-w-3xl pb-4 text-base leading-7 text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        <aside
          className="mt-8 flex items-start gap-3 rounded-xl bg-muted p-5 text-sm leading-6"
          aria-label="隐私与使用边界"
        >
          <ShieldCheck
            className="mt-1 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            只在你操作时填写；不代为提交，不处理验证码。填写效果统计用于改进兼容性，不上传简历正文。首次使用前请阅读插件中的说明和隐私政策。
          </p>
        </aside>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-6 text-sm text-muted-foreground sm:px-8">
        <span>智简简历 · 网申助手</span>
        <div className="flex flex-wrap gap-6">
          <Link href="/privacy" className={link}>
            隐私说明
          </Link>
          <Link href="/dashboard/feedback" className={link}>
            反馈问题
          </Link>
        </div>
      </footer>
    </div>
  );
}
