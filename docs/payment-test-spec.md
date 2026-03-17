# 決済テスト仕様書
> 作成日: 2026-03-17 | 対象: さやゆめ Stripe 本番モード

---

## テスト対象エンドポイント

| # | エンドポイント | 概要 |
|---|--------------|------|
| A | `POST /api/stripe/checkout` | Checkoutセッション作成 / プラン変更 |
| B | `POST /api/stripe/cancel` | 解約申請（期間終了時） |
| C | `DELETE /api/stripe/cancel` | 解約取り消し（再開） |
| D | `POST /api/stripe/portal` | Stripe Customer Portal |
| E | `POST /api/stripe/webhook` | Stripe Webhook受信 |
| F | `/pricing` UI | プラン選択ページ |
| G | `/settings` UI | 解約・ポータルUI |

---

## A. Checkout API テスト

### A-1: 未ログイン → 401
- **リクエスト**: `POST /api/stripe/checkout` (Cookie なし)
- **期待結果**: `401 { error: 'ログインが必要です' }`

### A-2: 無効プラン → 400
- **リクエスト**: `POST /api/stripe/checkout` body=`{ plan: 'invalid' }`
- **期待結果**: `400 { error: '無効なプランです' }`

### A-3: freeプラン → 400
- **リクエスト**: `POST /api/stripe/checkout` body=`{ plan: 'free' }`
- **期待結果**: `400 { error: '無効なプランです' }`

### A-4: 未ログイン + basicプラン → 401
- **期待結果**: `401`

### A-5: 有効ログイン + basicプラン (新規) → Stripe URL返却
- **期待結果**: `200 { url: 'https://checkout.stripe.com/...' }`
- **確認項目**: URLが `checkout.stripe.com` ドメインか

### A-6: 同一プランに変更 → 400
- **前提**: basicプラン有効ユーザー
- **リクエスト**: body=`{ plan: 'basic' }`
- **期待結果**: `400 { error: '既に同じプランです' }`

---

## B. Cancel API テスト

### B-1: 未ログイン → 401
- **リクエスト**: `POST /api/stripe/cancel` (Cookie なし)
- **期待結果**: `401 { error: 'ログインが必要です' }`

### B-2: Freeユーザー → 404
- **前提**: サブスクなしユーザー
- **期待結果**: `404 { error: 'アクティブなサブスクリプションが見つかりません' }`

---

## C. Reactivate API テスト

### C-1: 未ログイン → 401
- **リクエスト**: `DELETE /api/stripe/cancel` (Cookie なし)
- **期待結果**: `401 { error: 'ログインが必要です' }`

---

## D. Portal API テスト

### D-1: 未ログイン → 401
- **リクエスト**: `POST /api/stripe/portal` (Cookie なし)
- **期待結果**: `401 { error: 'ログインが必要です' }`

### D-2: Freeユーザー (サブスクなし) → 404
- **前提**: subscriptionsレコードなし
- **期待結果**: `404 { error: 'サブスクリプションが見つかりません' }`

---

## E. Webhook テスト

### E-1: 無効署名 → 400
- **リクエスト**: `POST /api/stripe/webhook` (Stripe-Signature ヘッダーなし/不正)
- **期待結果**: `400 { error: 'Invalid signature' }`

### E-2: Stripe Dashboard でのWebhook疎通確認
- **確認項目**: StripeダッシュボードのWebhookログで最近のイベントが届いているか

---

## F. Pricing UI テスト

### F-1: ページ表示（未ログイン）
- **URL**: `/pricing`
- **確認項目**:
  - [ ] 3プランカード (Free / Basic / Premium) 表示
  - [ ] 「初月無料」バッジ表示
  - [ ] Basicに「人気 No.1」バッジ
  - [ ] Freeに「無料で始める」ボタン
  - [ ] Basic/Premiumに「Basicを始める」「Premiumを始める」ボタン

### F-2: ページ表示（ログイン済み / Freeユーザー）
- **確認項目**:
  - [ ] Freeカードに「現在のプラン」バッジ
  - [ ] Basic/Premiumに「Basicを始める」ボタン

### F-3: Subscribeボタン押下（未ログイン）
- **確認項目**: `/login`にリダイレクトされる

### F-4: Success通知（?success=true）
- **URL**: `/pricing?success=true`
- **確認項目**: 緑色「プラン開始しました！」バナー表示（5秒後に消える）

### F-5: Canceled通知（?canceled=true）
- **URL**: `/pricing?canceled=true`
- **確認項目**: 黄色「決済がキャンセルされました」バナー表示

---

## G. Settings UI テスト

### G-1: Freeユーザーの設定画面
- **確認項目**:
  - [ ] プラン名「Free」表示
  - [ ] 「プランをアップグレード」ボタン → `/pricing`に遷移
  - [ ] 解約ボタン非表示

### G-2: 解約確認モーダル
- **前提**: 有料プランユーザー
- **確認項目**:
  - [ ] 「サブスクリプションを解約する」ボタン表示
  - [ ] クリックでモーダル表示
  - [ ] モーダルに期間終了日表示
  - [ ] 「キャンセル」ボタンでモーダル閉じる
  - [ ] 「解約する」ボタンで解約処理

---

## テスト実施結果 (2026-03-17)

| # | テストケース | 結果 | 不具合内容 |
|---|------------|------|----------|
| A-1 | 未ログイン→401 | ✅ PASS | - |
| A-2 | 無効プラン→401 | ✅ PASS | 認証チェックが先（正常） |
| A-3 | freeプラン→401 | ✅ PASS | 認証チェックが先（正常） |
| A-4 | 未ログイン+basic→401 | ✅ PASS | - |
| B-1 | Cancel未ログイン→401 | ✅ PASS | - |
| C-1 | Reactivate未ログイン→401 | ✅ PASS | - |
| D-1 | Portal未ログイン→401 | ✅ PASS | - |
| E-1 | 無効Webhook署名→400 | ✅ PASS | - |
| F-1 | Pricingページ表示（有料ユーザー） | ✅ PASS | Premium「現在のプラン」・次回更新日表示OK |
| F-4 | Success通知（?success=true） | ✅ PASS | ハードリロードで確認（5秒タイマー正常動作） |
| F-5 | Canceled通知（?canceled=true） | ✅ PASS | 「決済がキャンセルされました」バナー表示OK |
| G-1 | Settings Premiumユーザー表示 | ✅ PASS | Premium・利用中・次回更新日・解約ボタンOK |
| G-2 | 解約確認モーダル | ✅ PASS | 期間終了日・キャンセルボタン動作OK |

## 発見した不具合と修正

### BUG-001: trialing状態のユーザーがexpiredに判定される（修正済み）
- **重大度**: 🔴 Critical
- **場所**: `src/app/api/stripe/webhook/route.ts` L161-164
- **症状**: `STRIPE_TRIAL_DAYS=30` 設定時、30日トライアルで契約したユーザーは Stripe subscription status が `trialing`。
  `customer.subscription.updated` webhook が `trialing` を `'expired'` にマッピングしていたため、
  トライアル開始直後に `is_premium: false` になり課金機能が使えなくなる。
- **修正**: `trialing` → `'active'` にマッピング追加
- **コミット**: `75d3b96`

```diff
- const status = subscription.status === 'active' ? 'active'
-   : subscription.status === 'past_due' ? 'past_due'
+ const status = subscription.status === 'active' ? 'active'
+   : subscription.status === 'trialing' ? 'active'
+   : subscription.status === 'past_due' ? 'past_due'
    : subscription.status === 'canceled' ? 'cancelled'
    : 'expired';
```
