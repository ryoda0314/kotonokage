# 場面の写真（ChatGPT で作る）

会話ごとに、その場面の写真を一枚。「聞く」で字幕の代わりに状況を見せ、「自分で返す」の事情のカードにも出す。
「気づく」「追いかける」には出さない（字と音に集中するため）。

## 作り方

1. ChatGPT で新しい会話を一つ開き、下の「1. 写真の調子」と「2. 4人」を順に送る。4人の顔と服が決まるまで直してよい。
2. 同じ会話のまま、「3. 場面」を一つずつ送る（同じ会話で作ると、4人がそろいやすい）。顔が別人になったら、
   `Keep the same four people as in the casting photo.` と足して作り直す。
3. できた写真を `design/scenes/<id>.png` で保存する（id は各場面の見出しの英字。例：`design/scenes/weekend.png`）。
4. `python design/make-scenes.py` を実行する。3:2 に切りそろえ、`public/scenes/<id>.webp` と `src/content/scenes.json` を作る。
   写真のある会話にだけ、アプリに写真が出る。

守ること：
- 読める文字を写さない（聞く前に答えを見せない。看板・画面・本の背はぼかすか、向こうを向けるか、写さない）。
- 吹き出し・字幕・ロゴは入れない。

最初の12枚（2026-10-28）は、この手順で作った。4人の基準は `design/casting.png`（左から ミア・レオ・サム・ノラ）。
実際に送った指定は [prompts-used.md](prompts-used.md)。会話を足すときは、`design/casting.png` を添えて、
prompts-used.md の「Shared style」と同じ指定で頼むと、4人がそろう。

## 1. 写真の調子（最初に一度）

```
In this conversation I will ask for several photos for a language-learning app, like stills from a quiet
slice-of-life film set in Tokyo. Use this style for every image: a candid, natural photograph (not posed, not glossy
advertising), shot at eye level on a 35mm lens, soft natural light, gentle muted colors with a warm, slightly airy
tone, shallow depth of field so the background falls softly out of focus. People look relaxed and caught mid-gesture.
Absolutely no readable text anywhere: keep signs, posters, screens and book spines out of focus, turned away or out of
frame; no logos, watermarks, captions or speech bubbles. Landscape, 3:2.
```

## 2. 4人（キャスティング。変えてよい）

```
First, a casting photo: four friends standing together on a university campus in Tokyo, waist-up, smiling at the
camera, natural daylight. They are international students who came from different countries. Keep exactly these
people (faces, hair, clothes) in every later photo:
- Mia: woman, early 20s, shoulder-length dark brown hair, round glasses, cream cardigan over a striped shirt, canvas
  tote bag. Organized and warm.
- Leo: man, early 20s, curly black hair, olive jacket, carries a small sketchbook. Curious, likes making things.
- Sam: man, early 20s, tall, short light-brown hair, navy hoodie, hiking backpack. Easygoing.
- Nora: woman, early-mid 20s, short auburn bob, denim jacket, often holds a clipboard. Direct, a planner.
```

## 3. 場面（同じ会話で、一つずつ）

それぞれの頭に `Same four people, same style:` を付けて送る。

### weekend — 週末どうだった？（ミアとサム）

```
Monday morning on a tree-lined campus walkway. Mia, holding a coffee cup and a few books, smiles and asks Sam about his
weekend. Sam, with his hiking backpack, holds up his phone to show her a picture (the screen faces her, away from the
camera). Morning light through the trees.
```

### ramen — 授業のあと（サムとミア）

```
After class in a bright university hallway by a large window. Sam, leaning casually against the wall, invites Mia out,
pointing outside. Mia holds her open laptop in one arm (screen away from the camera), interested but a little busy.
Late afternoon light.
```

### late — 止まった電車（レオとノラ、電話）

```
A split-screen image of a phone call, two photos side by side. Left: Leo standing in a stopped commuter train among a
few passengers, phone to his ear, apologetic. Right: Nora outside a small cafe, phone to her ear, relaxed. No readable
signs in either.
```

### report — 金曜のレポート（レオとミア）

```
A quiet corner of a university library. Leo and Mia sit at a table with laptops and printed pages (pages out of focus),
both a little stuck; Leo turns to Mia with an idea to work on it together. Soft window light, bookshelves blurred
behind.
```

### hungry — おなかすいた（ノラとサム）

```
Outside a university building after class. Nora, hungry, presses a hand to her stomach and laughs; Sam points across
the street toward a small curry restaurant, its front softly out of focus. Midday light.
```

### kyoto — 京都の写真（ノラとミア）

```
A campus cafe. Nora holds out her phone to show Mia a photo from her trip (the screen faces Mia, away from the camera).
Mia leans in, surprised and delighted. Warm indoor light.
```

### app — バスのアプリ（サムとレオ）

```
A university study space. Leo sits at a desk turning his laptop toward Sam to show him the app he is making (the
screen faces them, away from the camera). Sam leans in with interest, holding a snack. Afternoon light.
```

### shift — 金曜のシフト（ミアとサム）

```
A small, cozy bookstore. Mia, in a bookstore apron behind the counter, asks Sam a favor with a hopeful, slightly
apologetic face; Sam, on the customer side with his backpack, checks his phone's calendar (screen away from the
camera). Shelves softly out of focus.
```

### speakers — 土曜の準備（ノラとレオ）

```
A university club room being set up for an event. Nora, holding a clipboard, talks with Leo, who is lifting one of two
large speakers to feel how heavy it is. Folded chairs and paper decorations around. Bright daylight.
```

### cold — かぜ（ミアとサム、電話）

```
A split-screen image of a phone call, two photos side by side. Left: Mia walking on campus in the morning, phone to her
ear, concerned. Right: Sam at home in bed under a blanket with a box of tissues, phone to his ear, sniffling.
```

### moving — 引っ越し（レオとミア）

```
A cafe table. Leo shows Mia two apartments on his tablet (the screen faces her, away from the camera). Mia, chin on her
hand, thinks it over. Soft afternoon light.
```

### presentation — 発表のあと（サムとノラ）

```
Evening on campus, a bench near a lit building at dusk. Nora sits holding a folder from her presentation, looking a
little down; Sam sits beside her, turned toward her, encouraging her with a warm smile. Gentle evening light.
```
