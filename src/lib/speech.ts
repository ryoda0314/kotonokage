// How English is voiced, the same for the prepared lines (scripts/generate-audio.mjs) and for what the app's AI writes
// (/api/say), so a friend sounds the same in a talk and in a reply. A voice is an OpenAI voice by its name ("marin")
// or a Google one as "google:<Gemini voice>" (src/lib/tts.ts), as in ことのは.
export const TTS_MODEL = "gpt-4o-mini-tts";

// Part of every clip's name. Clips are cached as immutable by name, so when the way lines are voiced changes, this
// changes, every name changes, and every line is voiced again instead of a new sound hiding behind an old name.
export const VOICING = "1";

// Two paces (CONCEPT.md, 会話): the first talks a little slower and carefully said, then an everyday pace with the
// words running together as friends say them. Asking for a pace "for learners" overshoots into slow speech; the
// learner can slow a clip down on the device instead.
export const TTS_INSTRUCTIONS = {
  clear:
    "Speak as a university student talking with a friend: relaxed and warm, a little slower than usual and clearly, but still natural. Read only the text.",
  natural:
    "Speak as a university student chatting with a friend: relaxed and warm, at a natural everyday pace, with words running together as in real conversation. Read only the text.",
} as const;

// Google voices: Gemini 3.1 Flash TTS on Vertex AI, in ことのあめ's project, the model ことのは uses (its quota is per
// model, so it is not the one ことのあめ's live voice draws on).
export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

export const GEMINI_INSTRUCTIONS = {
  clear: "Say this the way a friend would in a relaxed chat, a little slowly and clearly:\n",
  natural: "Say this the way a friend would in a relaxed chat, at a natural pace:\n",
} as const;

export type Pace = keyof typeof TTS_INSTRUCTIONS;

// Words per second of an everyday pace (ことのあめ's range for English). Gemini's pace changes from one take to the next:
// a take outside it is made again.
export const PACE_RANGE: [number, number] = [1.5, 3.8];

// The transcriber that times the words of a voiced clip and checks it says its line (scripts/generate-audio.mjs).
export const TIMING_MODEL = "whisper-1";
