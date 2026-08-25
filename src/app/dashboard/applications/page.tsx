import type { Metadata } from "next";
import ApplicationsClient from "./applications-client";

export const metadata: Metadata = {
  title: "投递管理",
  robots: { index: false, follow: false },
};

export default function ApplicationsPage() {
  return <ApplicationsClient />;
}
