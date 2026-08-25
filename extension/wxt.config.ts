import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "智简网申助手",
    description:
      "读取智简简历网申资料，快速填写公司招聘官网表单并记录投递进度。",
    version: "0.1.0",
    permissions: ["activeTab", "scripting", "storage", "identity", "sidePanel"],
    host_permissions: ["https://aijianli.cn/*"],
    action: { default_title: "打开智简网申助手" },
    side_panel: { default_path: "sidepanel.html" },
  },
});
