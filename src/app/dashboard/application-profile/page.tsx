import type { Metadata } from "next";
import ApplicationProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "网申资料",
  robots: { index: false, follow: false },
};

export default function ApplicationProfilePage() {
  return <ApplicationProfileClient />;
}
