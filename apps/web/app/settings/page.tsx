import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings - Hope",
};

export default async function SettingsPage() {
  redirect("/settings/profile");
}
