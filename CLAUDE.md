@AGENTS.md

# ことのかげ

Read [CONCEPT.md](CONCEPT.md) before adding anything. A shadowing app for English conversation, a sister of ことのあめ
(`../kotono/polylinga`), ことのは (`../kotono/english`), ことのめ, ことのえだ, ことのね and ことのおと. One talk at a time goes
through 聞く → 気づく → 追いかける → 返す, and its chunks come back in other talks (また出会う). No scores, no accuracy,
no speed numbers, no streaks, no badges, no forced review, no pronunciation lessons, no katakana readings.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, plain CSS modules: the sisters' versions. `npm run dev` serves on
  port 3240.
- The learner's record (`State`, `src/lib/record.ts`) is on their device (`src/lib/store.ts`, localStorage key
  `shadowing:v1`, every access guarded). Signing in with ことのあめ's account (and a copy in its Supabase under this
  app's own table prefix) is not built yet; `onSave` is where that copy would follow.
- The prepared English is TypeScript data in `src/content/` (checked by `tests/content.test.mjs`); its audio is static
  MP3 in `public/audio`, named by key and a hash of voicing, voice, pace and text, listed with each clip's length and
  each subtitle word's time in `src/content/audio.json`.
- Voices (`src/content/cast.ts`, `src/lib/tts.ts`, as ことのは): Mia and Sam in OpenAI's voices, Leo and Nora in
  Google's (`google:Puck`, `google:Kore`, Gemini 3.1 Flash TTS on Vertex, ことのあめ's project). わたしの声 (the
  learner's corrected answers and the samples) is OpenAI `coral` or `verse`, chosen in 設定. Both providers' PCM is
  tidied the same way (`src/lib/pcm.ts`).
- AI is OpenAI, server-side only, limited per address and per server instance (`src/lib/limits.ts`):
  - `/api/hear`: the machine's ear (gpt-4o-transcribe). Never given the line, or it writes words the learner did not
    say. Up to 90 s of 16 kHz WAV (a whole talk followed once). The recording is not kept.
  - `/api/turn`: 返す（自分で）. One call (gpt-5.5, low effort, as ことのは) corrects the answer as little as possible,
    keeping the learner's meaning and adding nothing they did not say, and answers as the friend
    (`src/lib/turn-core.ts`: prompt and checks; `src/lib/ai.ts`). The English is signed for `/api/say`.
  - `/api/say`: voices only signed text (`src/lib/sign.ts`). Prepared clips never come here.

## The core (`src/lib`, pure, tested in `tests/`)

- `text.ts`: spoken English against the subtitle. Words carry canonical tokens (contractions and casual spellings
  undone: I've = I have, wanna = want to, 2 = two), so `heardWords` lines up what the machine's ear wrote with the
  line by LCS over the whole talk at once (a learner a beat behind still lines up). `alignTimes` puts the transcriber's
  word times on the subtitle's words (generate-audio).
- `record.ts`: talks (each `Round` keeps, per line, the indexes of words not heard; `only` marks a single line
  followed again; `quiet` a round without a voice), chunk events (`met`, `shadowed`, `role`, `own`, `ai`: what the
  correction put in, never counted as the learner's), replies. `pickNext` (the talk under way, else the first not
  done), `metBefore` (violet), `caughtLines` (a line not heard one day, all heard on a later day: できたこと),
  `grownChunks`, `daysOf`.
- `turn-core.ts`: see above.

## The app

- `/` intro (static). `/app` 追いかける (`_flow/Today.tsx`): the talk under way, steps on top, one way on below.
  - 聞く (`Listen`): the talk plays with no subtitle; each line falls in as the shadow of its words (bars).
  - 気づく (`Notice`): subtitle, 訳 on demand, chunks lit (violet when met in another talk before this one began) and
    pressed to hear on their own (word times), what the words sound like under them (`as`: wanna) and arcs where they
    run together (`link`).
  - 追いかける (`Follow`): the whole talk plays while `mic.ts` records on the same clock; the round's recording goes to
    `/api/hear` once and each line comes back with the words heard dark and the others pale. Subtitles fade by round
    (見る → うすく → なし; can be chosen), five rounds is where it pauses. この行だけ follows one line again;
    手本 → 自分 plays the model line and then the learner's own take (kept in memory only).
  - 返す (`Answer`): 役で (the friend's lines play as voice, the learner's line shows only its first word; the mic
    stays open and `turn` tells when they finished), 自分で (the friend's line and the learner's situation, never a
    finished answer; by voice or written, Japanese mixed in is fine; the corrected answer plays in わたしの声 and can be
    followed too; samples only when opened). 次の会話へ finishes the talk.
- `_flow/LineText.tsx` draws every line: full, faint, none (each word as a bar its length) or hint (first word only),
  with chunks, sounds and heard/missed words.
- `_parts/ChunkHost.tsx`: one sheet for a chunk anywhere: what it does, itself slow or at pace, the talks it is in.
- `/app/talks` 会話 (any talk can be taken up), `/app/me` 自分 (counts in one row, できたこと, まとまり by how far each
  came, 日ごと), `/app/me/settings` 設定 (speed, わたしの声, without a voice, 訳, clear the record).
- `src/components/player.ts`: one `<audio>` element, pitch kept when slowed, clips fetched once into memory, parts of
  a clip by time, AI text through `/api/say`, the browser's voice when nothing else plays. `mic.ts`: the microphone
  kept open without stopping playback (echo cancellation on; earphones advised), `indexAt` maps the page's clock to
  samples, `turn` finds the end of what the learner said; on iOS the audio session is play-and-record while it is open.

## Content (`src/content`)

- `talks.ts` (12, easy first: two `clear`, the rest `natural`), `chunks.ts` (37, each with a `core` pattern that also
  finds it in what the learner says), `cast.ts`. Marks name a chunk and its exact words in a line; sounds name words
  heard differently (`as` is what the voice says: the subtitle keeps "want to", the clip says "wanna"). Every chunk is
  in two talks or more; chunks in a line never overlap.
- Scene photos (CONCEPT.md, デザイン): made by the maker in ChatGPT (`design/scenes/prompts.md`; the four friends'
  reference is `design/casting.png`, what was actually sent is `design/scenes/prompts-used.md`), kept as
  `design/scenes/<talk id>.png`. `python design/make-scenes.py` writes `public/scenes/<talk id>.<hash>.webp` (named by
  content, so a new photo is never hidden behind a cached old one) and `src/content/scenes.json`. Shown by
  `_flow/Scene.tsx` in 聞く (whole, then a strip at the faces once the talk plays), 返す's card and 会話's list; never
  in 気づく or 追いかける. No readable text in a photo (it would give the words away before 聞く).
- After changing lines, samples or voices: `node --env-file=.env.local scripts/generate-audio.mjs` (only new or changed
  clips are voiced, each heard again by whisper-1, made again up to three times when it is not heard as its line or is
  off pace; it lists the ones to listen to), then `npm test`.

## Commands

- `npm run dev` / `npm run build` / `npm run lint` / `npm test` (node:test, `tests/*.test.mjs`)
- `npx tsc --noEmit` (run `npx next typegen` first after adding routes)
- `node --env-file=.env.local scripts/generate-audio.mjs [--dry-run] [--only <key>]`
- `python design/make-icons.py`: the stand-in icon (a wave and its shadow) until the maker chooses a picture.

## Conventions

- UI copy in `src/lib/i18n/ja.ts`, plain, from the learner's side. Never overclaim what shadowing does.
- The sisters' look (`src/app/globals.css`): paper, ink, one accent, `--again` violet for what comes back. No
  gradients, emoji or shadows inside the app (the name's 影 is the learner's line a little behind the model's, never
  a drop shadow); hairlines separate.
- Pure modules imported by tests and scripts use `.ts` extensions in their imports (Node strips types).
- Phone first; from 720 px the tabs become a column on the left (BottomNav, the sisters' CSS).
