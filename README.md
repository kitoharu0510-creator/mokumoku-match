# MOKUMOKU MATCH

シーシャバー特化カルチャーマッチング求人サイト

---

## ローカル プレビュー起動（MongoDB不要）

```bash
~/.nvm/versions/node/v24.13.1/bin/node server-preview.js
# → http://localhost:3002
# 管理画面: http://localhost:3002/admin/login
# 管理者PW: preview
```

---

## 本番デプロイ手順（Render + MongoDB Atlas）

### 1. GitHubにpush

```bash
cd /Users/onigashirayuuka/mokumoku-match
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mokumoku-match.git
git push -u origin main
```

### 2. MongoDB Atlas セットアップ

1. https://cloud.mongodb.com にアクセス → 無料アカウント作成
2. **Create a Cluster** → Free M0 → AWS → 東京（ap-northeast-1）
3. **Database Access** → Add New Database User → ID/PW を設定
4. **Network Access** → Add IP Address → **0.0.0.0/0**（Renderからの接続を許可）
5. **Connect** → Drivers → Connection String をコピー
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/mokumoku-match?retryWrites=true&w=majority
   ```

### 3. Resend セットアップ

1. https://resend.com → アカウント作成
2. **Domains** → Add Domain → お名前.comで取得したドメインを入力
3. 表示されたDNSレコード（TXT・MX）をお名前.comに設定
4. **API Keys** → Create API Key → コピー

### 4. Renderでデプロイ

1. https://render.com → **New → Web Service**
2. GitHubリポジトリを接続
3. 以下を設定：

   | 項目 | 値 |
   |------|-----|
   | Name | mokumoku-match |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Instance Type | Starter（$7/月）以上 |

4. **Environment Variables** に以下を追加：

   | キー | 値 |
   |------|-----|
   | `MONGODB_URI` | MongoDBのConnection String |
   | `JWT_SECRET` | ランダムな長い文字列（例: 64文字以上） |
   | `RESEND_API_KEY` | re_xxxxx |
   | `ADMIN_EMAIL` | 管理者メールアドレス |
   | `ADMIN_PASSWORD` | 管理者パスワード（強いもの） |
   | `FROM_EMAIL` | noreply@your-domain.com |
   | `UPLOAD_DIR` | `/var/data/uploads` |
   | `NODE_ENV` | `production` |

5. **Disks** タブ → **Add Disk**：

   | 項目 | 値 |
   |------|-----|
   | Name | uploads |
   | Mount Path | `/var/data` |
   | Size | 1 GB |

6. **Create Web Service** → デプロイ完了を待つ
7. 発行された `.onrender.com` URLでサイトが表示されればOK

### 5. カスタムドメイン設定

**Renderで操作：**
1. Web Service → **Settings → Custom Domains → Add Custom Domain**
2. `your-domain.com` と `www.your-domain.com` を追加
3. 表示される **CNAMEレコード** と **Aレコード** をメモ

**お名前.comで操作：**
1. ログイン → **DNS設定** → 対象ドメインを選択
2. CNAMEレコードを追加：
   ```
   種別: CNAME
   ホスト名: www
   VALUE: xxxx.onrender.com
   ```
3. Aレコードを追加（ルートドメイン用）：
   ```
   種別: A
   ホスト名: @（空欄）
   VALUE: RenderのIPアドレス
   ```
4. SSL証明書はRenderが自動発行（数分〜数時間かかる場合あり）

### 6. 初期データ投入

1. `https://your-domain.com/admin/login` にアクセス
2. 設定した `ADMIN_EMAIL` / `ADMIN_PASSWORD` でログイン
3. 管理画面から店舗・求人情報を登録

---

## 技術スタック

- **Backend**: Node.js + Express + multer + jsonwebtoken + bcryptjs
- **DB**: MongoDB + Mongoose（本番） / インメモリ（プレビュー）
- **Frontend**: Vanilla JS + HTML/CSS（レスポンシブ）
- **メール**: Resend（本番）/ console.log（プレビュー）
- **ホスティング**: Render
- **ストレージ**: Render Disk（/var/data/uploads）
- **ドメイン**: お名前.com

## ページ構成

| URL | 説明 |
|-----|------|
| `/` | トップ |
| `/jobs` | 求人一覧（フィルター・マッチスコア） |
| `/job?id=xxx` | 求人詳細 |
| `/apply?id=xxx` | 応募フォーム |
| `/thanks` | 応募完了 |
| `/listing` | 店舗掲載案内 |
| `/inquiry` | 掲載問い合わせ |
| `/admin/login` | 管理者ログイン |
| `/admin` | 管理画面（5タブ） |
