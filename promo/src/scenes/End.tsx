// I. もう一度、名前と一行。タブと、はじめ方（登録はいらない、記録は端末に残る：アプリのはじめの画面の言葉）。
import { fall } from "../anim";
import { T } from "../timeline";
import { C, FONT } from "../theme";
import { Icon, type IconName } from "../ui";
import { NameMark } from "./Mark";

const TABS: [IconName, string][] = [
  ["follow", "追いかける"],
  ["list", "会話"],
  ["user", "自分"],
];

export function End({ frame }: { frame: number }) {
  const e = T.end;
  return (
    <>
      <NameMark frame={frame} icon={e.icon} word={e.word} lead={e.lead} size={230} top={110} wordSize={88} leadSize={40} />
      <div style={{ position: "absolute", top: 650, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 48, ...fall(frame, e.lead + 8, 10, 16) }}>
        {TABS.map(([icon, name]) => (
          <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 28, color: C.ink2, fontFamily: FONT.ja }}>
            <Icon name={icon} size={30} stroke={1.7} />
            {name}
          </span>
        ))}
      </div>
      <p style={{ position: "absolute", top: 770, left: 0, right: 0, margin: 0, textAlign: "center", fontSize: 28, color: C.muted, fontFamily: FONT.ja, ...fall(frame, e.rest, 14, 18) }}>
        登録はいりません。記録はこの端末に残ります。
      </p>
    </>
  );
}
