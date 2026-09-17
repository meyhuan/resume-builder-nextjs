import { defineConfig } from "wxt";
import identity from "./release-identity.json";

const release = process.env.WXT_RELEASE_BUILD === "1";
const storeTarget = process.env.WXT_STORE_TARGET;
if (storeTarget && (!release || !["chrome", "edge"].includes(storeTarget))) {
  throw new Error("商店构建必须使用 release:chrome 或 release:edge");
}
if (release && process.env.WXT_API_BASE_URL !== "https://aijianli.cn") {
  throw new Error("发布构建必须显式连接 https://aijianli.cn，请运行 pnpm run release");
}

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  outDir: storeTarget ? `.output/store/${storeTarget}` : release ? ".output/release" : ".output",
  manifest: {
    name: "智简网申助手",
    description:
      "读取智简简历网申资料，快速填写公司招聘官网表单并记录投递进度。",
    version: "0.5.1",
    minimum_chrome_version: "116",
    // Store identity is assigned by each store; preserve the manual channel's key.
    ...(release && !storeTarget ? { key: identity.publicKey } : {}),
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    permissions: ["activeTab", "scripting", "storage", "identity", "sidePanel", "alarms"],
    host_permissions: release ? ["https://aijianli.cn/*"] : ["https://aijianli.cn/*", "http://localhost:3000/*"],
    optional_host_permissions: ["https://*/*", "http://*/*"],
    action: {
      default_title: "打开智简网申助手",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
    side_panel: { default_path: "sidepanel.html" },
  },
});
