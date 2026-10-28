# 場面写真 12枚

4人のキャスティング写真を参照して、ChatGPTの画像生成で作成した素材セットです。

- `design/casting.png`: 4人の基準写真。左から Mia / Leo / Sam / Nora。
- `design/scenes/<id>.png`: 12場面のPNG原本。
- `public/scenes/<id>.webp`: アプリ向けの3:2画像（1536 × 1024）。
- `src/content/scenes.json`: 場面IDと画像URLの対応。
- `design/make-scenes.py`: PNGをWebPに変換し、存在する画像だけで対応表を作成。
- `design/prompts.md`: 使用した共通指定と各場面のプロンプト。

## 使い方

既存アプリの `design/scenes/` にPNGをコピーし、そのアプリに既存の `design/make-scenes.py` がある場合は、既存スクリプトを優先して実行してください。

既存スクリプトがない場合は、このセットのスクリプトを使用できます。

```sh
python -m pip install Pillow
python design/make-scenes.py
```

このセットの `scenes.json` は次の形式です。既存アプリの読込形式とは未照合です。

```json
{"weekend": "/scenes/weekend.webp"}
```

写真は「聞く」と「自分で返す」の事情カードに表示する想定です。「気づく」「追いかける」には表示しません。アプリ本体が提供されていないため、表示ロジックの変更・動作確認はこのセットには含みません。

## 場面

| ID | 場面 | 人物 |
| --- | --- | --- |
| weekend | 週末どうだった？ | ミア・サム |
| ramen | 授業のあと | サム・ミア |
| late | 止まった電車 | レオ・ノラ |
| report | 金曜のレポート | レオ・ミア |
| hungry | おなかすいた | ノラ・サム |
| kyoto | 京都の写真 | ノラ・ミア |
| app | バスのアプリ | サム・レオ |
| shift | 金曜のシフト | ミア・サム |
| speakers | 土曜の準備 | ノラ・レオ |
| cold | かぜ | ミア・サム |
| moving | 引っ越し | レオ・ミア |
| presentation | 発表のあと | サム・ノラ |
