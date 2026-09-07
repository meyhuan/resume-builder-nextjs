import type { Metadata } from "next";
import ApplicationsWorkbench from "./applications-workbench";
import "./applications-workbench.css";

export const metadata: Metadata = {
  title: "投递管理",
  robots: { index: false, follow: false },
};

export default function ApplicationsPage() {
  return <ApplicationsWorkbench />;
}
