// Line icons in the sisters' hand (24 px grid, 1.8 stroke, round ends). No emoji anywhere.
type IconName =
  | "speaker"
  | "mic"
  | "stop"
  | "back"
  | "close"
  | "arrow"
  | "check"
  | "replay"
  | "user"
  | "listen"
  | "notice"
  | "follow"
  | "answer"
  | "list"
  | "settings";

const PATHS: Record<IconName, React.ReactNode> = {
  speaker: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  back: <path d="M15 18l-6-6 6-6" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  // 聞く: headphones.
  listen: (
    <>
      <path d="M4 16v-4a8 8 0 0 1 16 0v4" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  // 気づく: an eye.
  notice: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  // 追いかける: a voice, and its shadow a little behind.
  follow: (
    <>
      <path d="M3 9c1.8-2.6 3.6-2.6 5.4 0s3.6 2.6 5.4 0 3.6-2.6 5.4 0" />
      <path d="M5.5 15c1.8-2.6 3.6-2.6 5.4 0s3.6 2.6 5.4 0 2.6-1.9 3.7-1.2" opacity="0.55" />
    </>
  ),
  // 返す: someone's line, and yours back.
  answer: (
    <>
      <path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3 2.5V12a2 2 0 0 1-2-2z" />
      <path d="M12 17h7" />
      <path d="M15 20h4" />
    </>
  ),
  // 会話: talks, one under another.
  list: (
    <>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h8" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <circle cx="15" cy="7" r="2" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
};

export type { IconName };

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
