import type { Talk } from "./types.ts";

// The talks, in the order they come: the first two a little slower and carefully said, then an everyday pace
// (CONCEPT.md, 会話). Each is short enough to follow five times in a few minutes, has something going on, and brings
// two or three chunks new to it; the rest come back from earlier talks. Marks name a chunk and its exact words in the
// line; sounds name words heard differently from how they are written. A line id names its clip and never changes.
export const TALKS: Talk[] = [
  {
    id: "weekend",
    title: "週末どうだった？",
    lead: "月曜の朝。ミアがサムに、週末のことを聞く。",
    pace: "clear",
    lines: [
      { id: "weekend.1", who: "mia", text: "Hey, Sam. How was your weekend?", ja: "おはよう、サム。週末どうだった？", marks: [{ chunk: "how-was", text: "How was" }], sounds: [{ text: "was your", link: true }] },
      { id: "weekend.2", who: "sam", text: "Pretty good. I went hiking with Leo.", ja: "よかったよ。レオと山歩きに行った。" },
      { id: "weekend.3", who: "mia", text: "Oh, nice. Where did you go?", ja: "いいね。どこに行ったの？", marks: [{ chunk: "oh-nice", text: "Oh, nice" }], sounds: [{ text: "did you", link: true }] },
      {
        id: "weekend.4",
        who: "sam",
        text: "Mount Takao. It was kind of crowded, though.",
        ja: "高尾山。ちょっと混んでたけどね。",
        marks: [
          { chunk: "kind-of", text: "kind of" },
          { chunk: "though", text: "though" },
        ],
        sounds: [{ text: "kind of", as: "kinda" }],
      },
      { id: "weekend.5", who: "mia", text: "Yeah, it gets busy on weekends.", ja: "うん、週末は混むよね。" },
      { id: "weekend.6", who: "sam", text: "Next time, I want to go early in the morning.", ja: "次は朝早く行きたいな。", sounds: [{ text: "want to", as: "wanna" }] },
    ],
    answer: {
      line: "weekend.1",
      mine: "週末はずっとバイトだった。でも日曜の夜に映画を見た。",
      samples: [
        { id: "weekend.a1", text: "Kind of busy. I worked all weekend, but I saw a movie on Sunday night.", note: "忙しかったと先に言って、そのあと映画のこと" },
        { id: "weekend.a2", text: "Not bad. I had work, but I watched a movie on Sunday.", note: "まあまあ、と軽く返す" },
      ],
    },
  },
  {
    id: "ramen",
    title: "授業のあと",
    lead: "サムが、駅の近くにできたラーメン屋にミアを誘う。",
    pace: "clear",
    lines: [
      { id: "ramen.1", who: "sam", text: "Hey, what are you up to after class?", ja: "ねえ、授業のあと何するの？", marks: [{ chunk: "what-up-to", text: "what are you up to" }], sounds: [{ text: "what are you", link: true }] },
      { id: "ramen.2", who: "mia", text: "Nothing much. Why?", ja: "特に何も。なんで？" },
      {
        id: "ramen.3",
        who: "sam",
        text: "Want to check out that new ramen place by the station?",
        ja: "駅の近くにできたラーメン屋、行ってみない？",
        marks: [{ chunk: "want-to", text: "Want to" }],
        sounds: [
          { text: "Want to", as: "Wanna" },
          { text: "check out", link: true },
        ],
      },
      {
        id: "ramen.4",
        who: "mia",
        text: "Ooh, I've been meaning to try it. Can we go a bit later, though? I've got to send an email first.",
        ja: "お、ずっと行ってみたかったんだ。でも、ちょっとあとでもいい？先にメール送らなきゃ。",
        marks: [
          { chunk: "ive-been-meaning-to", text: "I've been meaning to" },
          { chunk: "can-we", text: "Can we" },
          { chunk: "though", text: "though" },
          { chunk: "ive-got-to", text: "I've got to" },
        ],
        sounds: [{ text: "got to", as: "gotta" }],
      },
      {
        id: "ramen.5",
        who: "sam",
        text: "Sure, no rush. Just text me when you're done.",
        ja: "いいよ、急がなくて。終わったら連絡して。",
        marks: [
          { chunk: "no-rush", text: "no rush" },
          { chunk: "text-me", text: "text me" },
        ],
      },
      { id: "ramen.6", who: "mia", text: "Will do.", ja: "そうする。", marks: [{ chunk: "will-do", text: "Will do" }] },
    ],
    answer: {
      line: "ramen.3",
      mine: "今日はバイトで行けない。でも土曜なら空いている。",
      samples: [
        { id: "ramen.a1", text: "I can't today. I've got work. How about Saturday?", note: "行けないと言って、土曜を出す" },
        { id: "ramen.a2", text: "I'd love to, but I have work today. Are you free on Saturday?", note: "行きたい気持ちを先に" },
      ],
    },
  },
  {
    id: "late",
    title: "止まった電車",
    lead: "レオがノラとの待ち合わせに遅れそう。電話をかける。",
    pace: "natural",
    lines: [
      { id: "late.1", who: "leo", text: "Hey, sorry. I'm running about ten minutes late.", ja: "ごめん、10分くらい遅れてる。", marks: [{ chunk: "running-late", text: "running about ten minutes late" }] },
      { id: "late.2", who: "nora", text: "No worries. What happened?", ja: "大丈夫。どうしたの？", marks: [{ chunk: "no-worries", text: "No worries" }], sounds: [{ text: "What happened", link: true }] },
      { id: "late.3", who: "leo", text: "My train stopped between stations. Should I just meet you at the cafe?", ja: "電車が駅の間で止まっちゃって。カフェで直接会う？", sounds: [{ text: "meet you at", link: true }] },
      { id: "late.4", who: "nora", text: "Sounds good. I'll grab us a table.", ja: "いいね。席とっておくよ。", marks: [{ chunk: "sounds-good", text: "Sounds good" }], sounds: [{ text: "grab us a", link: true }] },
      { id: "late.5", who: "leo", text: "Thanks. Let me know if you want me to grab anything.", ja: "ありがとう。何か買ってきてほしかったら言って。", marks: [{ chunk: "let-me-know", text: "Let me know" }], sounds: [{ text: "Let me", as: "Lemme" }] },
      { id: "late.6", who: "nora", text: "Nah, I'm good. See you soon.", ja: "ううん、大丈夫。またあとでね。", marks: [{ chunk: "im-good", text: "I'm good" }] },
    ],
    answer: {
      line: "late.1",
      mine: "大丈夫。こっちも今着いたところ。カフェの中で待っている。",
      samples: [
        { id: "late.a1", text: "No worries. I just got here too. I'll wait inside the cafe.", note: "自分も今着いたと伝える" },
        { id: "late.a2", text: "That's okay! I'm inside the cafe, so no rush.", note: "急がなくていいと足す" },
      ],
    },
  },
  {
    id: "report",
    title: "金曜のレポート",
    lead: "レオとミアは同じ授業。レポートの締め切りが近い。",
    pace: "natural",
    lines: [
      { id: "report.1", who: "leo", text: "Did you finish the report for Professor Tanaka's class?", ja: "田中先生の授業のレポート、終わった？", sounds: [{ text: "Did you", link: true }] },
      {
        id: "report.2",
        who: "mia",
        text: "Not yet. To be honest, I'm kind of stuck on the last part.",
        ja: "まだ。正直、最後のところでちょっと詰まってる。",
        marks: [
          { chunk: "honestly", text: "To be honest" },
          { chunk: "kind-of", text: "kind of" },
        ],
        sounds: [
          { text: "kind of", as: "kinda" },
          { text: "stuck on", link: true },
        ],
      },
      { id: "report.3", who: "leo", text: "Same here. I was wondering if we could work on it together.", ja: "ぼくも。一緒にやれないかなと思って。", marks: [{ chunk: "i-was-wondering", text: "I was wondering if" }], sounds: [{ text: "work on it", link: true }] },
      { id: "report.4", who: "mia", text: "That'd be great. Are you free tomorrow afternoon?", ja: "それいいね。明日の午後、空いてる？", marks: [{ chunk: "are-you-free", text: "Are you free" }] },
      {
        id: "report.5",
        who: "leo",
        text: "Tomorrow works for me. How about the library at two?",
        ja: "明日なら大丈夫。2時に図書館はどう？",
        marks: [
          { chunk: "works-for-me", text: "works for me" },
          { chunk: "how-about", text: "How about" },
        ],
      },
      {
        id: "report.6",
        who: "mia",
        text: "Sounds good. Do you mind if I bring Sam? He's stuck too.",
        ja: "いいね。サムも連れてっていい？サムも詰まってるの。",
        marks: [
          { chunk: "sounds-good", text: "Sounds good" },
          { chunk: "do-you-mind-if", text: "Do you mind if" },
        ],
        sounds: [{ text: "mind if I", link: true }],
      },
    ],
    answer: {
      line: "report.3",
      mine: "いいけど、明日はゼミがある。あさってなら一日空いている。",
      samples: [
        { id: "report.a1", text: "Sure, but I have a seminar tomorrow. How about the day after?", note: "明日はだめと言って、別の日を出す" },
        { id: "report.a2", text: "That'd be great. I'm busy tomorrow, but I'm free all day on Thursday.", note: "曜日で言う" },
      ],
    },
  },
  {
    id: "hungry",
    title: "おなかすいた",
    lead: "授業が終わったノラとサム。まだお昼を食べていない。",
    pace: "natural",
    lines: [
      { id: "hungry.1", who: "nora", text: "I'm starving. Want to grab something to eat?", ja: "おなかぺこぺこ。何か食べに行かない？", marks: [{ chunk: "want-to", text: "Want to" }], sounds: [{ text: "Want to", as: "Wanna" }] },
      { id: "hungry.2", who: "sam", text: "Sure. What are you in the mood for?", ja: "いいよ。何の気分？", sounds: [{ text: "What are you", link: true }] },
      { id: "hungry.3", who: "nora", text: "I can't decide between curry and pasta.", ja: "カレーかパスタかで迷ってる。", marks: [{ chunk: "cant-decide", text: "I can't decide between" }] },
      {
        id: "hungry.4",
        who: "sam",
        text: "I'd rather have curry. How about the place across the street?",
        ja: "ぼくはカレーがいいな。向かいの店はどう？",
        marks: [
          { chunk: "id-rather", text: "I'd rather" },
          { chunk: "how-about", text: "How about" },
        ],
        sounds: [{ text: "place across", link: true }],
      },
      { id: "hungry.5", who: "nora", text: "Works for me. Let's go.", ja: "それでいい。行こう。", marks: [{ chunk: "works-for-me", text: "Works for me" }] },
    ],
    answer: {
      line: "hungry.3",
      mine: "パスタがいい。カレーは昨日食べたから。",
      samples: [
        { id: "hungry.a1", text: "I'd rather have pasta. I had curry yesterday.", note: "どっちがいいかを先に" },
        { id: "hungry.a2", text: "Pasta, for sure. I just had curry last night.", note: "短く言い切る" },
      ],
    },
  },
  {
    id: "kyoto",
    title: "京都の写真",
    lead: "ノラが、旅行の写真をミアに見せる。",
    pace: "natural",
    lines: [
      { id: "kyoto.1", who: "nora", text: "Look, this is from my trip to Kyoto.", ja: "見て、京都旅行の写真。", sounds: [{ text: "this is", link: true }] },
      {
        id: "kyoto.2",
        who: "mia",
        text: "No way. I've been meaning to go there. How was it?",
        ja: "うそ。ずっと行きたかったんだ。どうだった？",
        marks: [
          { chunk: "no-way", text: "No way" },
          { chunk: "ive-been-meaning-to", text: "I've been meaning to" },
          { chunk: "how-was", text: "How was" },
        ],
        sounds: [{ text: "How was it", link: true }],
      },
      {
        id: "kyoto.3",
        who: "nora",
        text: "Really nice. It was kind of rainy, though.",
        ja: "すごくよかった。ちょっと雨だったけどね。",
        marks: [
          { chunk: "kind-of", text: "kind of" },
          { chunk: "though", text: "though" },
        ],
        sounds: [{ text: "kind of", as: "kinda" }],
      },
      { id: "kyoto.4", who: "mia", text: "Oh no. Did you still get to see the temples?", ja: "あらら。それでもお寺は見られた？", marks: [{ chunk: "oh-no", text: "Oh no" }], sounds: [{ text: "Did you", link: true }] },
      { id: "kyoto.5", who: "nora", text: "Yeah, most of them. Honestly, the rain made it even prettier.", ja: "うん、ほとんど。正直、雨でもっときれいだった。", marks: [{ chunk: "honestly", text: "Honestly" }] },
      { id: "kyoto.6", who: "mia", text: "That makes sense. I'd love to see it in the rain.", ja: "なるほどね。雨の京都、見てみたいな。", marks: [{ chunk: "makes-sense", text: "That makes sense" }], sounds: [{ text: "see it in", link: true }] },
    ],
    answer: {
      line: "kyoto.1",
      mine: "京都にはまだ行ったことがない。どこがいちばんよかったか聞きたい。",
      samples: [
        { id: "kyoto.a1", text: "Oh, nice. I've never been. What was your favorite place?", note: "行ったことがないと言って、聞く" },
        { id: "kyoto.a2", text: "No way, it looks great. Which place did you like the most?", note: "写真の感想を先に" },
      ],
    },
  },
  {
    id: "app",
    title: "バスのアプリ",
    lead: "サムが、何かを作っているレオに声をかける。",
    pace: "natural",
    lines: [
      { id: "app.1", who: "sam", text: "Hey, what are you up to?", ja: "ねえ、何してるの？", marks: [{ chunk: "what-up-to", text: "what are you up to" }], sounds: [{ text: "what are you", link: true }] },
      { id: "app.2", who: "leo", text: "I'm making a little app. Want to see?", ja: "小さいアプリを作ってるんだ。見る？", marks: [{ chunk: "want-to", text: "Want to" }], sounds: [{ text: "Want to", as: "Wanna" }] },
      { id: "app.3", who: "sam", text: "Oh, nice. What does it do?", ja: "いいじゃん。何ができるの？", marks: [{ chunk: "oh-nice", text: "Oh, nice" }], sounds: [{ text: "What does it", link: true }] },
      { id: "app.4", who: "leo", text: "It tells you when the next bus is coming. What do you think?", ja: "次のバスがいつ来るか教えてくれる。どう思う？", marks: [{ chunk: "what-do-you-think", text: "What do you think" }], sounds: [{ text: "What do you", link: true }] },
      {
        id: "app.5",
        who: "sam",
        text: "I like it. The text is kind of small, though.",
        ja: "いいね。でも字がちょっと小さいかな。",
        marks: [
          { chunk: "kind-of", text: "kind of" },
          { chunk: "though", text: "though" },
        ],
        sounds: [{ text: "kind of", as: "kinda" }],
      },
      {
        id: "app.6",
        who: "leo",
        text: "Yeah, that makes sense. I'm going to make it bigger.",
        ja: "たしかに。大きくしてみる。",
        marks: [
          { chunk: "makes-sense", text: "that makes sense" },
          { chunk: "im-going-to", text: "I'm going to" },
        ],
        sounds: [{ text: "going to", as: "gonna" }],
      },
      {
        id: "app.7",
        who: "sam",
        text: "Cool. Let me know when it's done. No rush.",
        ja: "いいね。できたら教えて。急がなくていいから。",
        marks: [
          { chunk: "let-me-know", text: "Let me know" },
          { chunk: "no-rush", text: "No rush" },
        ],
        sounds: [{ text: "Let me", as: "Lemme" }],
      },
    ],
    answer: {
      line: "app.4",
      mine: "いいと思う。でも、電車の時間も分かったらもっと便利。",
      samples: [
        { id: "app.a1", text: "I like it. It'd be even better if it showed trains, too.", note: "いいと言ってから、足してほしいこと" },
        { id: "app.a2", text: "That's really useful. Could you add trains, too?", note: "頼む形で" },
      ],
    },
  },
  {
    id: "shift",
    title: "金曜のシフト",
    lead: "ミアは本屋でバイトをしている。金曜に用事ができた。",
    pace: "natural",
    lines: [
      { id: "shift.1", who: "mia", text: "Sam, are you free on Friday?", ja: "サム、金曜空いてる？", marks: [{ chunk: "are-you-free", text: "are you free" }] },
      { id: "shift.2", who: "sam", text: "It depends on the time. What's up?", ja: "時間によるかな。どうしたの？", marks: [{ chunk: "it-depends", text: "It depends" }], sounds: [{ text: "What's up", link: true }] },
      { id: "shift.3", who: "mia", text: "I was wondering if you could cover my shift at the bookstore.", ja: "本屋のシフト、代わってもらえないかなと思って。", marks: [{ chunk: "i-was-wondering", text: "I was wondering if" }], sounds: [{ text: "shift at the", link: true }] },
      {
        id: "shift.4",
        who: "sam",
        text: "Let me check... Yeah, that works for me.",
        ja: "ちょっと確かめる…うん、大丈夫。",
        marks: [
          { chunk: "let-me-check", text: "Let me check" },
          { chunk: "works-for-me", text: "works for me" },
        ],
        sounds: [{ text: "Let me", as: "Lemme" }],
      },
      {
        id: "shift.5",
        who: "mia",
        text: "Wait, really? Thanks so much. I owe you one.",
        ja: "え、ほんと？ありがとう。借りができたね。",
        marks: [
          { chunk: "wait-really", text: "Wait, really" },
          { chunk: "i-owe-you-one", text: "I owe you one" },
        ],
        sounds: [{ text: "owe you one", link: true }],
      },
      { id: "shift.6", who: "sam", text: "No worries.", ja: "気にしないで。", marks: [{ chunk: "no-worries", text: "No worries" }] },
    ],
    answer: {
      line: "shift.3",
      mine: "金曜はむり。でも土曜なら代われる。",
      samples: [
        { id: "shift.a1", text: "Sorry, Friday doesn't work for me. I could do Saturday, though.", note: "だめな日と、できる日" },
        { id: "shift.a2", text: "I can't on Friday, but I'm free on Saturday. Would that help?", note: "役に立つか聞く" },
      ],
    },
  },
  {
    id: "speakers",
    title: "土曜の準備",
    lead: "サークルのイベントの準備。ノラがレオに頼みごとをする。",
    pace: "natural",
    lines: [
      { id: "speakers.1", who: "nora", text: "So for Saturday, can we use your speakers?", ja: "それで土曜なんだけど、レオのスピーカー使える？", marks: [{ chunk: "can-we", text: "can we" }], sounds: [{ text: "use your", link: true }] },
      {
        id: "speakers.2",
        who: "leo",
        text: "Let me check... Yeah, should be fine. They're kind of heavy, though.",
        ja: "ちょっと確かめる…うん、大丈夫そう。ちょっと重いけどね。",
        marks: [
          { chunk: "let-me-check", text: "Let me check" },
          { chunk: "kind-of", text: "kind of" },
          { chunk: "though", text: "though" },
        ],
        sounds: [
          { text: "Let me", as: "Lemme" },
          { text: "kind of", as: "kinda" },
        ],
      },
      { id: "speakers.3", who: "nora", text: "Do you mind if I ask Sam to help you carry them?", ja: "サムに、運ぶのを手伝ってって頼んでもいい？", marks: [{ chunk: "do-you-mind-if", text: "Do you mind if" }], sounds: [{ text: "carry them", as: "carry 'em" }] },
      { id: "speakers.4", who: "leo", text: "Not at all. What time should we be there?", ja: "もちろん。何時に行けばいい？", sounds: [{ text: "Not at all", link: true }] },
      {
        id: "speakers.5",
        who: "nora",
        text: "Around nine. Text me if you're running late.",
        ja: "9時ごろ。遅れそうなら連絡して。",
        marks: [
          { chunk: "text-me", text: "Text me" },
          { chunk: "running-late", text: "running late" },
        ],
      },
      { id: "speakers.6", who: "leo", text: "Will do.", ja: "そうする。", marks: [{ chunk: "will-do", text: "Will do" }] },
      { id: "speakers.7", who: "nora", text: "Thanks, Leo. I owe you one.", ja: "ありがとう、レオ。借りができたね。", marks: [{ chunk: "i-owe-you-one", text: "I owe you one" }], sounds: [{ text: "owe you one", link: true }] },
    ],
    answer: {
      line: "speakers.5",
      mine: "9時は少し早い。10時でもいいか聞きたい。",
      samples: [
        { id: "speakers.a1", text: "Nine is kind of early for me. Is ten okay?", note: "早いと言ってから聞く" },
        { id: "speakers.a2", text: "Do you mind if I come at ten instead?", note: "頼む形で" },
      ],
    },
  },
  {
    id: "cold",
    title: "かぜ",
    lead: "授業の前に、ミアがサムに電話をかける。サムの声がいつもと違う。",
    pace: "natural",
    lines: [
      { id: "cold.1", who: "mia", text: "You okay? You sound kind of sick.", ja: "大丈夫？ちょっと具合悪そうな声だよ。", marks: [{ chunk: "kind-of", text: "kind of" }], sounds: [{ text: "kind of", as: "kinda" }] },
      {
        id: "cold.2",
        who: "sam",
        text: "Yeah, I caught a cold. It's not a big deal, but I've got to stay home today.",
        ja: "うん、かぜひいた。大したことないけど、今日は家にいなきゃ。",
        marks: [
          { chunk: "not-a-big-deal", text: "It's not a big deal" },
          { chunk: "ive-got-to", text: "I've got to" },
        ],
        sounds: [
          { text: "caught a cold", link: true },
          { text: "got to", as: "gotta" },
        ],
      },
      { id: "cold.3", who: "mia", text: "Oh no. Do you need anything?", ja: "あらら。何か要る？", marks: [{ chunk: "oh-no", text: "Oh no" }], sounds: [{ text: "need anything", link: true }] },
      {
        id: "cold.4",
        who: "sam",
        text: "I'm good, thanks. Could you send me the notes from class, though?",
        ja: "大丈夫、ありがとう。でも授業のノート、送ってもらえる？",
        marks: [
          { chunk: "im-good", text: "I'm good" },
          { chunk: "though", text: "though" },
        ],
        sounds: [{ text: "Could you", link: true }],
      },
      {
        id: "cold.5",
        who: "mia",
        text: "Got it. I'll send them tonight. Get some rest.",
        ja: "了解。今夜送るね。ゆっくり休んで。",
        marks: [{ chunk: "got-it", text: "Got it" }],
        sounds: [
          { text: "Got it", link: true },
          { text: "send them", as: "send 'em" },
        ],
      },
    ],
    answer: {
      line: "cold.4",
      mine: "いいよ。でも今日はノートをあまりとっていない。レオにも聞いてみる。",
      samples: [
        { id: "cold.a1", text: "Sure, but I didn't take many notes today. I'll ask Leo, too.", note: "そのまま事情を言う" },
        { id: "cold.a2", text: "No problem. Mine are kind of messy, though. I'll check with Leo.", note: "ノートが雑だと笑って言う" },
      ],
    },
  },
  {
    id: "moving",
    title: "引っ越し",
    lead: "レオが、大学の近くに引っ越そうとしている。",
    pace: "natural",
    lines: [
      { id: "moving.1", who: "leo", text: "I'm thinking about moving closer to campus.", ja: "大学の近くに引っ越そうかと思ってて。", sounds: [{ text: "thinking about", link: true }] },
      { id: "moving.2", who: "mia", text: "No way. Have you found a place yet?", ja: "うそ。もう部屋は見つけたの？", marks: [{ chunk: "no-way", text: "No way" }], sounds: [{ text: "found a", link: true }] },
      {
        id: "moving.3",
        who: "leo",
        text: "I can't decide between two. One's cheaper, but the other one's way bigger. What do you think?",
        ja: "二つで迷ってる。一つは安くて、もう一つはずっと広い。どう思う？",
        marks: [
          { chunk: "cant-decide", text: "I can't decide between" },
          { chunk: "what-do-you-think", text: "What do you think" },
        ],
      },
      {
        id: "moving.4",
        who: "mia",
        text: "I mean, it depends on what you need. Do you work from home a lot?",
        ja: "というか、何が要るかによるよね。家で作業すること多い？",
        marks: [
          { chunk: "i-mean", text: "I mean" },
          { chunk: "it-depends", text: "it depends" },
        ],
        sounds: [{ text: "depends on", link: true }],
      },
      {
        id: "moving.5",
        who: "leo",
        text: "Yeah, a lot. Honestly, I'd rather have more space.",
        ja: "うん、かなり。正直、もっと広いほうがいい。",
        marks: [
          { chunk: "honestly", text: "Honestly" },
          { chunk: "id-rather", text: "I'd rather" },
        ],
      },
      { id: "moving.6", who: "mia", text: "Got it. Then go with the bigger one.", ja: "了解。じゃあ広いほうにしなよ。", marks: [{ chunk: "got-it", text: "Got it" }], sounds: [{ text: "Got it", link: true }] },
    ],
    answer: {
      line: "moving.3",
      mine: "安いほうがいいと思う。浮いたお金で家具が買えるから。",
      samples: [
        { id: "moving.a1", text: "I'd go with the cheaper one. You could spend the money on furniture.", note: "選んで、理由を足す" },
        { id: "moving.a2", text: "Honestly, I'd rather save money. You could buy a nice desk.", note: "自分ならどうするか" },
      ],
    },
  },
  {
    id: "presentation",
    title: "発表のあと",
    lead: "ノラがゼミで発表をした。その日の夜、サムがたずねる。",
    pace: "natural",
    lines: [
      { id: "presentation.1", who: "sam", text: "How was your presentation?", ja: "発表どうだった？", marks: [{ chunk: "how-was", text: "How was" }], sounds: [{ text: "was your", link: true }] },
      { id: "presentation.2", who: "nora", text: "Honestly? Not great. I forgot what to say in the middle.", ja: "正直？いまいち。途中で何を言うか忘れちゃった。", marks: [{ chunk: "honestly", text: "Honestly" }], sounds: [{ text: "what to say", link: true }] },
      {
        id: "presentation.3",
        who: "sam",
        text: "Oh no. I bet nobody noticed, though.",
        ja: "あらら。でも、だれも気づいてないと思うよ。",
        marks: [
          { chunk: "oh-no", text: "Oh no" },
          { chunk: "though", text: "though" },
        ],
      },
      { id: "presentation.4", who: "nora", text: "Wait, really?", ja: "え、ほんと？", marks: [{ chunk: "wait-really", text: "Wait, really" }] },
      { id: "presentation.5", who: "sam", text: "Totally. It's not a big deal. Everyone forgets stuff.", ja: "うん、絶対。大したことじゃないよ。だれでも忘れるし。", marks: [{ chunk: "not-a-big-deal", text: "It's not a big deal" }], sounds: [{ text: "not a", link: true }] },
      {
        id: "presentation.6",
        who: "nora",
        text: "Thanks. I mean, I'm going to practice more next time.",
        ja: "ありがとう。まあ、次はもっと練習するつもり。",
        marks: [
          { chunk: "i-mean", text: "I mean" },
          { chunk: "im-going-to", text: "I'm going to" },
        ],
        sounds: [{ text: "going to", as: "gonna" }],
      },
    ],
    answer: {
      line: "presentation.1",
      mine: "うまくいった。でも質問に一つ答えられなかった。",
      samples: [
        { id: "presentation.a1", text: "Pretty good! I couldn't answer one question, though.", note: "よかったと言って、一つだけ" },
        { id: "presentation.a2", text: "It went well. I got stuck on one question, but the rest was fine.", note: "詰まったと言う" },
      ],
    },
  },
];
