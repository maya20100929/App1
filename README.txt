学習記録アプリ

Expo Router と Firebase を使用した学習記録アプリです。学習時間・学習内容・科目・テスト結果などを記録し、カレンダーやグラフで確認できます。

必要な環境

- Node.js（LTS 推奨）
- npm
- iOS シミュレーター、Android エミュレーター、または Expo Go（スマートフォンで確認する場合）

セットアップ

プロジェクトのルートディレクトリで実行します。

```bash
npm install
```

Firebase の認証・Firestore を利用します。接続先は lib/firebase.ts に設定されています。別の Firebase プロジェクトを使用する場合は、Firebase コンソールで Authentication と Firestore を有効にし、同ファイルの設定を変更してください。

起動方法

開発サーバーを起動する

```bash
npm start
```

起動後に表示される Expo のメニューから、利用する環境を選択します。

Web で起動する

```bash
npm run web
```

iOS シミュレーターで起動する

```bash
npm run ios
```

Android エミュレーターで起動する

```bash
npm run android
```

Web 用ビルド

Web 用の静的ファイルを dist ディレクトリへ出力します。

```bash
npm run build:web
```

Netlify では netlify.toml の設定により、`npx expo export -p web` を実行して dist を公開します。

主な機能

- Firebase Authentication によるメールアドレス・パスワードログイン
- Google アカウントによるログイン（Web）
- 学習記録の登録・編集・削除
- 科目ごとの学習内容と学習時間の管理
- カレンダーでの学習記録確認
- テスト結果の記録
- 学習状況のグラフ表示
- お知らせ、ヘルプ、設定画面

画面とルーティングは app ディレクトリで管理しています。

テストアカウント

動作確認に使用するアカウントを記入してください。パスワードはリポジトリに公開しないでください。

| 項目 | 内容 |
| --- | --- |
| メールアドレス |  |
| パスワード |  |
| 備考 |  |

開発用コマンド

ESLint を実行

```bash
npm run lint
```

アイコンを生成

```bash
npm run generate-icons
```

ディレクトリ構成

text
app/          Expo Router の画面とルートレイアウト
lib/          Firebase、型定義、データストア
components/   共通コンポーネント
constants/    テーマなどの定数
assets/       画像・フォント
scripts/      ビルド・開発用スクリプト
web/          Web 用の静的ファイル
