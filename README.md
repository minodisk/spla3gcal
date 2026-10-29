# spla3gcal
Splatoon 3 schedules as subscribable Google Calendars

スプラトゥーン3 のスケジュールを、誰でも購読できる公開 Google カレンダーとして配っています。

## 購読リンク

リンクを開くと、自分の Google カレンダーに追加する確認画面が出ます。

<!-- calendars:start -->
| カレンダー | 購読リンク |
| --- | --- |
| オープン エリア | [購読する](https://calendar.google.com/calendar/u/0?cid=c519a262aa2c7bc17ff44ba7257a3e811c5dd3cac12fa45ce7c693f1908bb925%40group.calendar.google.com) |
| オープン ヤグラ | [購読する](https://calendar.google.com/calendar/u/0?cid=4e3d3bd8466304740bb1236bae539715df3c922de7c0b855033b8d489f867d29%40group.calendar.google.com) |
| オープン ホコ | [購読する](https://calendar.google.com/calendar/u/0?cid=773bab902425283611d272049a911a28088ad3c410c287166bbb3c3c684b4870%40group.calendar.google.com) |
| オープン アサリ | [購読する](https://calendar.google.com/calendar/u/0?cid=49803d93f9e702f0ace4a2a031c9b1f9ae264988fb163ebc3e43bdd4c8556c9a%40group.calendar.google.com) |
| チャレンジ エリア | [購読する](https://calendar.google.com/calendar/u/0?cid=693c94281ab1edfefbad6d37baf770731e355e879ff7c685ac41ae8fa35b6aca%40group.calendar.google.com) |
| チャレンジ ヤグラ | [購読する](https://calendar.google.com/calendar/u/0?cid=ee0c2d479d2637583847b51dbc7e4dcc3f0cba809eabe193019db7a554b09cfa%40group.calendar.google.com) |
| チャレンジ ホコ | [購読する](https://calendar.google.com/calendar/u/0?cid=5d7ac8a29ddeedeb30ffc9f031413dfabd9627c580ec6fe28645c4c3316858e1%40group.calendar.google.com) |
| チャレンジ アサリ | [購読する](https://calendar.google.com/calendar/u/0?cid=41243b83567209db15426df1ac3e8a1fab8d1707f860693168280cd2a2ed8936%40group.calendar.google.com) |
| X エリア | [購読する](https://calendar.google.com/calendar/u/0?cid=c61774a28fe3d10e7c450873bf55ae44a9399539ed720f5cf8b7fe794615129b%40group.calendar.google.com) |
| X ヤグラ | [購読する](https://calendar.google.com/calendar/u/0?cid=3f8c85d2b3cbbae1a266e14bff7cfa9b19bc2c5cdd451cce864f2bce27f055ce%40group.calendar.google.com) |
| X ホコ | [購読する](https://calendar.google.com/calendar/u/0?cid=6e535673d2a3308aef20fe97832bc9a4992c6825d2234f6b954a321337b809cf%40group.calendar.google.com) |
| X アサリ | [購読する](https://calendar.google.com/calendar/u/0?cid=ba9afe031a54ae1cc6e0ba04a5b31acdb448a70fa273cac27957086fcd10e8d6%40group.calendar.google.com) |
| サーモンラン | [購読する](https://calendar.google.com/calendar/u/0?cid=6be311703b43d72a47225af97dabd861a4a23ebed6269ac1dc369e3797b92bbb%40group.calendar.google.com) |
<!-- calendars:end -->

この表は `npm run links` で [src/calendars.js](src/calendars.js) から生成しています。手で書き換えないでください。

## 仕組み

- Google Apps Script（GAS）が 4 時間おきに [Spla3 API](https://spla3.yuu26.com) の `/api/schedule`（バトル）と `/api/coop-grouping/schedule`（サーモンラン）を 1 回ずつ取得し、[src/calendars.js](src/calendars.js) の `CALENDARS` に並んだカレンダーへ、該当する枠を予定として書き込みます。取得するのは `CALENDARS` の行が使う API だけです。
- API から取れるのは直近 1 日分ほどなので、定期実行で先の枠を足していきます。
- 各予定にはタグ `spla3gcal.slot` に枠の識別子（例: `bankara_open/LOFT/2026-10-29T15:00:00+09:00`、サーモンランは `coop/2026-10-29T09:00:00+09:00`）を入れています。書き込む前にカレンダー上の予定のタグを見て、登録済みの枠は飛ばします。
- フェス開催中はバンカラマッチなどの `rule` が `null` になるため、その間は予定を作りません。
- サーモンランの予定の説明欄には、ステージ・オカシラシャケ・支給ブキを書いています。ビッグランの枠はタイトルを「サーモンラン ビッグラン」にします。
- バイトチームコンテスト（`/api/coop-grouping-team-contest/schedule`）は入れていません。通常のサーモンランと同じ時間帯に並行して開かれるため、同じカレンダーに入れると予定が重なって見分けにくく、4 人でチームを組む前提の別イベントなので購読したい人も分かれます。開催していない間は API が空の配列を返すので、実レスポンスでテストできる時期に別カレンダーとして足すのがよいと考えています。
- ICS フィードではなく Google カレンダーそのものを公開しているのは、Google カレンダーが外部 ICS を半日〜1 日おきにしか再取得せず、枠が抜けるためです。

## セットアップ

カレンダーとスクリプトは個人の Google アカウントで作ります（Workspace アカウントは組織外への公開が制限されていることがあるため）。

### 1. GAS プロジェクトを作って push する

```sh
npm install
npx clasp login                     # 個人アカウントでログイン
```

初回は [Apps Script の設定](https://script.google.com/home/usersettings) で「Google Apps Script API」をオンにしておきます。

```sh
npx clasp create --type standalone --title spla3gcal --rootDir src
git restore src/appsscript.json     # create がリモートの初期マニフェストで上書きするので戻す
rm -f src/Code.js                   # create が持ってくる空のファイル
npm run push
```

`.clasp.json`（scriptId と rootDir が入る）はコミットしていません（[理由](#claspjson-をコミットしない理由)）。別の環境から push するときは、`npx clasp create` の代わりに次の内容で `.clasp.json` を作ります。scriptId はスクリプトエディタの「プロジェクトの設定」にあります。

```json
{ "scriptId": "<スクリプト ID>", "rootDir": "src" }
```

### 2. カレンダーを作って公開する

1. `npx clasp open-script` でスクリプトエディタを開く
2. 関数 `createCalendars` を選んで実行し、権限を承認する（「このアプリは Google で確認されていません」と出たら「詳細」→「spla3gcal（安全ではないページ）に移動」）
3. 実行ログに出たカレンダー ID（`…@group.calendar.google.com`）を、[src/calendars.js](src/calendars.js) の該当行の `calendarId` に書く
4. `npm run push`

`createCalendars` は `calendarId` が空の行について、同じ名前のカレンダーがなければ作り、一般公開（すべての予定の詳細を表示）にします。

### 3. トリガーを張る

1. スクリプトエディタで関数 `installTrigger` を実行し、権限を承認する
2. 続けて `sync` を一度実行し、カレンダーに予定が入ることを確かめる

`installTrigger` は `sync` のトリガーを消してから張り直すので、何度実行しても 1 つだけになります。

### 4. 購読リンクを README に出す

```sh
npm run links
```

## カレンダーを増やす

1. [src/calendars.js](src/calendars.js) の `CALENDARS` に `calendarId: ''` で 1 行足す（`mode` と `rule` の値はファイル冒頭のコメント参照）。`calendarId` が空の行は `sync` が飛ばすので、先に push してもエラーになりません
2. `npm test && npm run push` してから、スクリプトエディタで `createCalendars` を実行する
3. ログに出た ID を `calendarId` に書き、`npm run push && npm run links` してコミットする

権限は変わらないので、トリガーの張り直しは要りません。

## 開発

```sh
npm test
```

[test/fixtures/schedule.json](test/fixtures/schedule.json) と [test/fixtures/coop.json](test/fixtures/coop.json) は 2026-10-29 に取得した `/api/schedule` と `/api/coop-grouping/schedule` の実レスポンスです（期限付きのステージ・ブキ画像 URL だけ削除）。テストは [scripts/gas.mjs](scripts/gas.mjs) で `src/` を GAS と同じく 1 つのグローバルスコープに読み込み、`CalendarApp` と `UrlFetchApp` を差し替えて、ヤグラ枠とサーモンラン枠の抽出と、再実行時に重複登録しないことを確かめています。

## .clasp.json をコミットしない理由

- scriptId は個人アカウントのプロジェクトを指すだけの値で、秘密情報ではない。ただ、この repo を fork して自分のカレンダーを作る人は必ず自分のプロジェクトを `clasp create` することになり、コミットされた scriptId は使えない
- 使うのは scriptId と rootDir の 2 項目だけで、上の手順で手元に作り直せる

## GitHub Pages に移すとき

購読リンク集は [scripts/links.mjs](scripts/links.mjs) が `CALENDARS` から作っています。Pages に移すときは、同じスクリプトで `docs/index.html` などに HTML も書き出し、Pages の公開元を `docs/` にします。

## データ元

[Spla3 API](https://spla3.yuu26.com)（非公式）を利用規約に従って使っています。リクエストには連絡先として、この repo の URL を入れた User-Agent（`spla3gcal/1.0 (https://github.com/minodisk/spla3gcal)`）を付けています。API の仕様変更や停止で予定が入らなくなることがあります。
