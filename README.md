# 露店居酒屋 POS

Vite + React製のPOSアプリ。Supabaseでデータを共有保存し、AI機能（領収書スキャン・経営レポート生成）はVercelのサーバーレス関数経由でAnthropic APIを呼び出します。

## 全体構成

```
ブラウザ（各スタッフの端末）
   │
   ├─ 卓管理・注文・売上などのデータ  →  Supabase（Postgres）
   │
   └─ 領収書スキャン / AIレポート生成  →  /api/claude（Vercel Serverless Function）
                                              │
                                              └─ Anthropic API（APIキーはサーバー側のみで保持）
```

- 元のコードにあった `window.storage` はブラウザ標準機能ではなく、Claudeのアーティファクト環境専用のAPIでした。このプロジェクトでは `src/lib/storage.js` がSupabaseを使って同じインターフェースを再現しているので、`App.jsx` 自体はほぼ無変更で動きます。
- 同様に、元のコードは `fetch("https://api.anthropic.com/v1/messages")` をAPIキーなしで直接呼んでいましたが、これも同じくClaude環境専用の仕組みです。ここでは `/api/claude` という自前のサーバーレス関数を経由させ、APIキーをサーバー側だけに置くようにしています。

---

## セットアップ手順

### 1. Supabaseの準備

1. [supabase.com](https://supabase.com) でプロジェクトを作成（既にお持ちのものでも可）
2. 左メニューの **SQL Editor** で以下を実行し、キーバリュー保存用のテーブルを作成:

```sql
create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

-- ⚠️ 認証機能がないアプリのため、匿名キーからの読み書きを全許可します。
-- 店舗内・関係者のみが使う前提のツールとして扱ってください。
create policy "Allow anon full access"
on kv_store
for all
using (true)
with check (true);
```

3. **Project Settings > API** から以下をメモ:
   - `Project URL`
   - `anon public` キー

### 2. Anthropic APIキーの準備

1. [console.anthropic.com](https://console.anthropic.com) でAPIキーを発行
2. 課金設定（クレジット追加）をしておく

> **重要**: 元のコードにあった `model: "claude-sonnet-4-6"` は、Claudeのアーティファクト環境専用のモデル名で、通常のAnthropic APIキーでは使えません。このプロジェクトのサーバーレス関数（`api/claude.js`）は自動的に `claude-sonnet-5` を使うようにしてあります（`CLAUDE_MODEL` 環境変数で変更可）。

### 3. ローカルで動作確認（任意）

```bash
npm install
cp .env.example .env
# .env を編集して VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を入力

npm run dev
```

ローカルではAI機能（領収書スキャン・AIレポート）は動きません（`/api/claude` はVercel上でのみ動作するため）。UIの見た目や卓管理・経理などの動作確認用です。

### 4. GitHubにアップロード

このプロジェクト一式をご自身のGitHubリポジトリにプッシュしてください（Claudeから直接プッシュすることはできないため、ご自身の端末またはGitHub Desktop等で行ってください）。

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <あなたのリポジトリURL>
git push -u origin main
```

### 5. Vercelにデプロイ

1. [vercel.com](https://vercel.com) にログインし、「Add New... > Project」から今プッシュしたGitHubリポジトリを選択
2. Framework Presetは自動的に `Vite` が検出されるはず
3. **Environment Variables** に以下を設定:

| 変数名 | 値 | 用途 |
|---|---|---|
| `VITE_SUPABASE_URL` | SupabaseのProject URL | フロントエンド用（ビルド時に埋め込まれる） |
| `VITE_SUPABASE_ANON_KEY` | Supabaseのanon public key | フロントエンド用 |
| `ANTHROPIC_API_KEY` | AnthropicのAPIキー | サーバー側のみ（`/api/claude`が使用、絶対に`VITE_`を付けない） |
| `CLAUDE_MODEL` | `claude-sonnet-5`（任意） | サーバー側のみ、使用モデルの変更用 |

4. 「Deploy」をクリック

デプロイが完了すると `https://xxxxx.vercel.app` のようなURLが発行されます。このURLをスタッフ間で共有すれば、複数端末から同時にPOSを使えます（Supabase経由でリアルタイムに近い形でデータが同期されます。3秒ごとにポーリングする実装のため、若干のタイムラグがあります）。

---

## セキュリティ・運用上の注意

- **認証機能はありません。** URLとSupabaseのanon keyを知っていれば誰でもデータの閲覧・書き換えができます。信頼できる関係者だけで使う社内ツールとして運用してください。
- 本格的に複数店舗・不特定多数での利用を想定する場合は、Supabase Authでのログイン機能や、Row Level Securityのポリシーをユーザー単位に絞る改修が必要です。
- Anthropic APIの利用量に応じて課金が発生します。領収書スキャンやAIレポート生成のご利用頻度に応じて費用が変わりますので、Anthropic Consoleで使用量をご確認ください。

## ファイル構成

```
pos-webapp/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── api/
│   └── claude.js          ← Anthropic APIへの中継（Vercel Serverless Function）
└── src/
    ├── main.jsx            ← window.storageをSupabase実装で差し込むエントリポイント
    ├── App.jsx             ← アプリ本体（元のコードとほぼ同一）
    └── lib/
        ├── supabaseClient.js
        └── storage.js      ← window.storage互換のSupabase実装
```
