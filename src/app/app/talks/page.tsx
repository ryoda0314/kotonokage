import type { Metadata } from "next";
import { ja } from "@/lib/i18n/ja";
import { TalkList } from "./TalkList";

export const metadata: Metadata = { title: ja.talks.title };

export default function TalksPage() {
  return <TalkList />;
}
