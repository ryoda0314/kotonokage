import type { Metadata } from "next";
import { ja } from "@/lib/i18n/ja";
import { Today } from "./_flow/Today";

export const metadata: Metadata = { title: ja.nav.today };

export default function TodayPage() {
  return <Today />;
}
