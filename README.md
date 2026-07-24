# 会話補助ノート・そよぎ (web公開用)

見せて・さして・つたえる、日常の会話をたすけるノート。
話す言葉に頼らず、はい/いいえ・体調・写真・数字・文字で気持ちや用事を伝えます（失語症などの方の会話補助）。

- この repo は **Vercel 公開 + Farcaster Mini App 用(public)**
- 開発の正本は private の `kaiwa_hojo_note` (Play/Capacitor側)。変更はまず本体側で行い、共通ファイル(style.css / app.js / i18n.js / screens / tap.js / audio.js / manifest.json / sw.js / privacy.html / icons)をこちらへ手動同期する
- 🔴 **index.html だけは同期しない**。こちらの index.html には fc:miniapp / fc:frame メタと esm.sh の SDK 読み込みがあり、Play側(www)には絶対に入れない（審査対策）。本体側で index.html を変えたら、こちらへは差分を手で移す

## ドメイン・Farcaster

- 想定ドメイン: https://kaiwa-hojo-note-web.vercel.app/ を仮置き。Vercelのプロジェクト名確定後、index.html と .well-known/farcaster.json のURLを一括置換
- `.well-known/farcaster.json` の **accountAssociation は未署名(TODOプレースホルダ)**。Vercel公開後にヒロさんが Farcaster Manifest ツールで署名して追記（既存アプリと同手順・fid 3339315）

## 開発

```
node serve.js   … http://localhost:3098
node _smoke.js  … 疑似DOMスモーク
node _check.js  … 禁句・整合チェック
```

## TODO

- Vercel へデプロイ（プロジェクト名 kaiwa-hojo-note-web 推奨）
- accountAssociation 署名（ヒロさん）→ Farcaster Manifest ツールで Reverify → Submit
- URL がドメイン確定で変わる場合、index.html と farcaster.json のURLを一括置換
