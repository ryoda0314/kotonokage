// 名前：アプリのアイコン（声の波と、少し遅れたその影）を描き起こし、明朝の ことのかげ が一字ずつ降ってくる。下に一行
// （アプリのはじめの画面の言葉）。波は墨で左から描かれ、影はそのすぐあとを追いかける（シャドーイングのように）。
import { fall, prog, SOFT } from "../anim";
import { C, FONT } from "../theme";

export const TAGLINE = "読めば分かる英語を、電話で使える英語に。";

// アイコンの形（../design/make-icons.py：512 の升、余白 0.18）。声の波は 1.5 周期、影は右下に少しずれる。
const S = 512;
const L = S * 0.18;
const R = S * 0.82;
const SPAN = R - L;
type WaveShape = { x0: number; x1: number; y: number; width: number; color: string; alpha: number };
const WAVES: Record<"shadow" | "ink", WaveShape> = {
  shadow: { x0: L + SPAN * 0.1, x1: R, y: S * 0.6, width: S * 0.065, color: C.accent, alpha: 150 / 255 },
  ink: { x0: L, x1: R - SPAN * 0.1, y: S * 0.43, width: S * 0.07, color: C.ink, alpha: 1 },
};
const AMP = SPAN * 0.11;

function wavePath({ x0, x1, y }: { x0: number; x1: number; y: number }): string {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    pts.push(`${(x0 + (x1 - x0) * t).toFixed(2)} ${(y - AMP * Math.sin(2 * Math.PI * 1.5 * t)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")}`;
}

/** 描かれていく波。`p`：描けた長さ（0〜1）。 */
function Wave({ w, p }: { w: WaveShape; p: number }) {
  if (p <= 0) return null;
  return (
    <path
      d={wavePath(w)}
      pathLength={1}
      fill="none"
      stroke={w.color}
      strokeOpacity={w.alpha}
      strokeWidth={w.width}
      strokeLinecap="round"
      strokeDasharray="1 1"
      strokeDashoffset={1 - p}
    />
  );
}

/** アイコン：墨の波が描かれ、その影が `lag` コマ遅れて追いかける。 */
export function DrawnIcon({ frame, at, size, lag = 9, dur = 26 }: { frame: number; at: number; size: number; lag?: number; dur?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${S} ${S}`} style={{ display: "block", overflow: "visible" }}>
      <Wave w={WAVES.shadow} p={prog(frame, at + lag, dur, SOFT)} />
      <Wave w={WAVES.ink} p={prog(frame, at, dur, SOFT)} />
    </svg>
  );
}

export function NameMark({
  frame,
  icon,
  word,
  lead,
  size,
  top,
  wordSize,
  leadSize,
}: {
  frame: number;
  icon: number;
  word: number;
  lead: number;
  size: number;
  top: number;
  wordSize: number;
  leadSize: number;
}) {
  return (
    <>
      <div style={{ position: "absolute", left: 960 - size / 2, top, width: size, height: size }}>
        <DrawnIcon frame={frame} at={icon} size={size} />
      </div>
      <p
        style={{
          position: "absolute",
          top: top + size + wordSize * 0.2,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontFamily: FONT.mincho,
          fontWeight: 700,
          fontSize: wordSize,
          letterSpacing: "0.06em",
          lineHeight: 1.2,
          color: C.ink,
        }}
      >
        {[..."ことのかげ"].map((ch, i) => (
          <span key={i} style={{ display: "inline-block", ...fall(frame, word + i * 3, wordSize * 0.18, 16) }}>
            {ch}
          </span>
        ))}
      </p>
      <p
        style={{
          position: "absolute",
          top: top + size + wordSize * 1.75,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontFamily: FONT.ja,
          fontWeight: 600,
          fontSize: leadSize,
          lineHeight: 1.45,
          color: C.ink,
          ...fall(frame, lead, 14, 18),
        }}
      >
        {TAGLINE}
      </p>
    </>
  );
}
