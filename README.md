# Make Silver Week 〜9連休ブロック崩し〜

2026年9月のシルバーウィークを題材にした、縦型スマホ向けブロック崩しです。

- パドルを左右に動かして赤いボールを跳ね返します。
- 日付ブロックは命中のたびに反転します。
- 平日・日曜・祝日は赤と黒、土曜は青と黒を行き来します。
- 黒いブロックをすべて休日色（赤または青）にして、9連休を完成させるとクリアです。
- 開始後にチップチューン風BGMが流れ、反射・ブロック破壊・日付反転・クリア／ゲームオーバーに効果音が鳴ります。

外部依存はありません。`index.html` をブラウザで開いて遊べます。

## Cloudflare Workersへの公開

```bash
npm install
npm run deploy
```

`make-silver-week` の名前で、ビルド済みの静的アセットをCloudflare Workersへ公開します。公開先は `https://game.chozo.net/make-silver-week/` です。

## ライセンス

[MIT License](./LICENSE)（Copyright (c) 2026 chozo）です。改変・再配布・商用利用ができます。利用するときは、著作権表示とライセンス文を残してください。
