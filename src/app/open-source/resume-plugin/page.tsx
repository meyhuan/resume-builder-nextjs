import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const repo = "https://github.com/meyhuan/zhijian-resume-plugin";
const prompt = "请用智简简历创建一份虚构的中文求职简历，并打开内嵌编辑器，让我修改内容、切换模板、调整行间距并导出分页 PDF。";

export const metadata: Metadata = {
  title: "开源简历插件：豆包本地编辑与分页 PDF 导出",
  description: "智简简历开源本地插件：豆包 Windows 电脑版上传 ZIP 安装，在内嵌编辑器修改简历、切换模板、调整行距并导出 A4 分页 PDF。查看安装步骤、实测记录与使用限制。",
  alternates: { canonical: "/open-source/resume-plugin" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "智简简历开源插件｜从 AI 初稿到排版好的简历",
    description: "在兼容的 AI 桌面客户端内编辑简历，支持模板、行距和分页 PDF。",
    images: ["/images/resume-plugin/editor.png"],
    url: "https://aijianli.cn/open-source/resume-plugin",
  },
};

const faqs = [
  ["插件和 aijianli.cn 是什么关系？", "插件由智简简历官网开发者维护，复用网站编辑器并独立开源。插件草稿保存在本机，不会自动同步到网站账号。"],
  ["需要安装 Node.js 或配置公网服务吗？", "豆包 Windows x64 便携 ZIP 已包含 Node.js，无需单独安装或手动配置路径。插件运行无需公网服务器或 ngrok；安装时豆包自身会上传、下载插件。"],
  ["能在所有 ChatGPT 和豆包账号里使用吗？", "不能。豆包需要支持上传插件的 Windows 电脑版及“本地电脑”任务。ChatGPT / Codex 需要支持本地插件和 MCP Apps 的桌面环境；普通 ChatGPT 网页远程连接器不适用。"],
  ["简历资料是否完全离线？", "插件本地保存草稿，并用本机 Edge 或 Chrome 渲染 PDF；向宿主模型发送的对话和资料仍可能联网处理。不要将本地插件理解为整个 AI 客户端完全离线。"],
  ["需要 Word 导出或不想安装怎么办？", "当前插件提供分页 PDF。需要可编辑 Word 或希望直接使用浏览器，可以选择智简简历网页版；网站导出按账号权益使用。"],
];

export default function ResumePluginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.review}>智简简历开源项目 · v0.4.0</div>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><Image src="/images/resume-plugin/icon.png" width={34} height={34} alt="" />智简简历<span>开源项目</span></Link>
        <a href={repo}>查看 GitHub ↗</a>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>OPEN SOURCE · WINDOWS · APACHE-2.0</div>
          <h1>AI 写好初稿，<br /><span>你把简历改到满意。</span></h1>
          <p>智简简历开源插件，让你在兼容的 AI 桌面客户端里直接编辑简历。修改内容、切换模板、调整行距，再导出分页 PDF。</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={`${repo}/releases/latest`}>下载豆包本地插件 ↗</a>
            <Link className={styles.secondary} href="/import?utm_source=plugin_landing&utm_medium=website&utm_campaign=resume_plugin">免安装，在线排版 →</Link>
          </div>
          <p className={styles.note}>豆包 Windows x64 ZIP 内置 Node.js · PDF 导出需要本机 Edge 或 Chrome</p>
          <figure className={styles.figure}>
            <div className={styles.figureBar}><span>在豆包中打开的智简简历</span><span>真实界面 · 虚构资料</span></div>
            <Image src="/images/resume-plugin/editor.png" width={1095} height={913} alt="豆包内嵌智简简历编辑器，已选择典雅模板，行距为 1.80，并提供导出分页 PDF 按钮" priority />
            <figcaption>同一份内容，自己调整模板与行距。截图中的人物、单位和经历均为虚构示例。</figcaption>
          </figure>
        </section>
        <section className={styles.section}>
          <div className={styles.eyebrow}>从内容到可投递文件</div><h2>最后的排版，由你决定</h2>
          <div className={styles.cards}>
            {[["01", "直接修改内容", "在简历上修改姓名和经历，草稿自动保存到本机。"], ["02", "调整模板与行距", "简约、典雅两套模板，配合行间距控制，让内容更易阅读。"], ["03", "检查分页再导出", "生成 A4 分页 PDF，预览后下载，投递前检查每页内容。"]].map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>
        <section className={styles.section} id="install">
          <div className={styles.eyebrow}>首次使用</div><h2>一个 ZIP，装进豆包电脑版</h2>
          <ol className={styles.steps}>
            <li><strong>下载正确的文件</strong><p>从 GitHub Release 下载名称以 <code>doubao-win-x64.zip</code> 结尾的包，无需解压。SHA256 校验文件在同一页面。</p></li>
            <li><strong>上传并启用插件</strong><p>进入豆包“插件 → 添加 → 上传插件”，拖入 ZIP。当前客户端列表可能显示英文名称 Zhijian Resume 和默认图标。</p></li>
            <li><strong>新建本地电脑任务</strong><p>使用下方提示打开示例简历。正式制作时换成你的真实资料，核实 AI 生成的经历和数据。</p></li>
          </ol>
          <div className={styles.prompt}><span>复制这句话开始</span><p>{prompt}</p></div>
          <a href={`${repo}/blob/main/docs/doubao.md`}>查看完整安装与排错说明 ↗</a>
        </section>
        <section className={styles.section}>
          <div className={styles.eyebrow}>选择适合你的方式</div><h2>本地插件，还是在线制作？</h2>
          <div className={styles.tableWrap}><table><thead><tr><th scope="col">你的需求</th><th scope="col">开源本地插件</th><th scope="col">aijianli.cn 网页版</th></tr></thead><tbody>
            <tr><th scope="row">使用入口</th><td>兼容的 AI 桌面客户端</td><td>浏览器打开即可使用</td></tr>
            <tr><th scope="row">模板与排版</th><td>简约、典雅；内容与行距调整</td><td>在线编辑与模板选择</td></tr>
            <tr><th scope="row">导出</th><td>本机生成分页 PDF</td><td>PDF、可编辑 Word 等，按账号权益</td></tr>
            <tr><th scope="row">草稿保存</th><td>本机保存，无跨机同步</td><td>网站账号内保存</td></tr>
            <tr><th scope="row">适合谁</th><td>想在 AI 桌面里编辑，或修改源码</td><td>不想安装，或需要 Word 文件</td></tr>
          </tbody></table></div>
          <p className={styles.note}>手机上可左右滑动表格查看完整对比。开源代码与网站服务的授权、权益分别适用。查看<Link href="/pricing">网站权益说明</Link>。</p>
        </section>
        <section className={styles.evidence}>
          <div><div className={styles.eyebrow}>有记录的实测</div><h2>编辑、保存、分页，逐项验证</h2><p>0.4.0 编辑器候选包在本机豆包中完成姓名修改、模板切换、行距 1.5 → 1.8，以及两页 A4 PDF 的预览与下载。所有示例资料均为虚构。</p><p>最终启动器的 UTF-8 修复通过包级回归与 Windows CI，未再次通过豆包界面安装。测试不代表所有客户端版本与账号均兼容。</p><a href={`${repo}/blob/main/TEST-REPORT.md`}>查看测试范围与已知限制 ↗</a></div>
        </section>
        <section className={styles.section}><div className={styles.eyebrow}>使用前你可能想知道</div><h2>常见问题</h2><div className={styles.faq}>{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
        <section className={styles.bottom}><h2>已有 AI 生成的简历内容？</h2><p>不想安装插件，可以直接粘贴到智简简历网页版继续排版。</p><Link className={styles.primary} href="/import?utm_source=plugin_landing&utm_medium=website&utm_campaign=resume_plugin">粘贴内容，在线制作 →</Link></section>
      </main>
      <footer className={styles.footer}>由 <Link href="/about">智简简历开发者</Link> 维护 · Apache-2.0 · 非豆包或 OpenAI 官方产品<br /><a href={`${repo}/blob/main/docs/privacy.md`}>插件数据与权限</a> · <a href={repo}>源码与贡献</a></footer>
    </div>
  );
}
