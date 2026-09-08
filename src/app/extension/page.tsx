import type { Metadata } from "next";
import ExtensionGuide from "./guide-client";

export const metadata: Metadata = {
  title: "网申助手下载与安装指南",
  description:
    "下载智简网申助手，在电脑浏览器安装插件，连接已保存的网申资料，辅助填写公司招聘官网并管理投递进度。",
  alternates: { canonical: "/extension" },
};

export default function ExtensionGuidePage() {
  return <ExtensionGuide />;
}
