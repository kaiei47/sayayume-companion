# Stripe決済セットアップガイド

## 1. Stripeダッシュボードで商品作成

### テスト環境（Test Mode）で作業すること！

1. https://dashboard.stripe.com/test/products にアクセス
2. 「+ Add product」をクリック

### Basic プラン
- Name: `さやゆめ Basic`
- Description: `無制限チャット + 画像生成（1日20枚）`
- Pricing: `¥1,980` / `Monthly` / `JPY`
- → 作成後、Price IDをコピー（`price_xxxxx`形式）

### Premium プラン
- Name: `さやゆめ Premium`
- Description: `無制限チャット + 画像生成（1日50枚）+ 音声メッセージ`
- Pricing: `¥4,980` / `Monthly` / `JPY`
- → 作成後、Price IDをコピー（`price_xxxxx`形式）

## 2. APIキー取得

1. https://dashboard.stripe.com/test/apikeys にアクセス
2. 以下をコピー:
   - `Publishable key` → `pk_test_...`
   - `Secret key` → `sk_test_...`

## 3. .env.local 更新

```
STRIPE_SECRET_KEY=sk_test_実際のキー
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_実際のキー
STRIPE_BASIC_PRICE_ID=price_BasicのID
STRIPE_PREMIUM_PRICE_ID=price_PremiumのID
```

## 4. Supabase Service Role Key

1. https://supabase.com/dashboard/project/uatweinivllqrianmmzn/settings/api にアクセス
2. `service_role` key（秘密鍵）をコピー
3. .env.local に追加:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...実際のキー
```

## 5. Webhook設定

### ローカルテスト
```bash
# Stripe CLIでログイン（初回のみ）
stripe login

# Webhookをローカルに転送
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 表示されるwebhook signing secretを.env.localに設定
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 本番（Vercel）
1. https://dashboard.stripe.com/test/webhooks にアクセス
2. 「+ Add endpoint」
3. URL: `https://sayayume-companion.vercel.app/api/stripe/webhook`
4. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. 作成後、Signing secretをコピー → Vercel環境変数に設定

## 6. Vercel環境変数

Vercelダッシュボード > Settings > Environment Variables に以下を追加:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BASIC_PRICE_ID`
- `STRIPE_PREMIUM_PRICE_ID`
- `SUPABASE_SERVICE_ROLE_KEY`

## 7. テスト

テストカード: `4242 4242 4242 4242`（有効期限: 未来の日付、CVC: 任意3桁）

1. http://localhost:3000/pricing にアクセス
2. Basicプランの「アップグレード」をクリック
3. Stripe Checkoutページでテストカードで決済
4. 成功ページにリダイレクト
5. DB確認: subscriptions テーブルの plan が 'basic' に変更されている
