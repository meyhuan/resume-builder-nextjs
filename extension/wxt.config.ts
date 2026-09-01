import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "智简网申助手",
    description:
      "读取智简简历网申资料，快速填写公司招聘官网表单并记录投递进度。",
    version: "0.2.1",
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    permissions: ["activeTab", "scripting", "storage", "identity", "sidePanel"],
    host_permissions: ["https://aijianli.cn/*", "http://localhost:3000/*"],
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
