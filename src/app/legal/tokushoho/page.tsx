'use client';

export default function TokushohoPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* ヘッダー */}
        <div>
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block">
            ← トップに戻る
          </a>
          <h1 className="text-2xl font-bold tracking-tight">特定商取引法に基づく表記</h1>
          <p className="text-sm text-muted-foreground mt-1">最終更新日: 2026年3月11日</p>
        </div>

        {/* 表記一覧 */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-0 divide-y divide-border/30">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4 first:pt-0">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">サービス名称</dt>
            <dd className="text-sm text-muted-foreground">さやゆめ</dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">事業形態</dt>
            <dd className="text-sm text-muted-foreground">個人事業</dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">運営責任者</dt>
            <dd className="text-sm text-muted-foreground">丸山快英</dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">所在地</dt>
            <dd className="text-sm text-muted-foreground">東京都多摩市</dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">電話番号</dt>
            <dd className="text-sm text-muted-foreground">
              メールにてお問い合わせください（support@sayayume.com）
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">メールアドレス</dt>
            <dd className="text-sm text-muted-foreground">support@sayayume.com</dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">サービスURL</dt>
            <dd className="text-sm text-muted-foreground">https://sayayume.com</dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">販売価格</dt>
            <dd className="text-sm text-muted-foreground space-y-1">
              <p>Basicプラン: 月額¥1,980（税込）</p>
              <p>Premiumプラン: 月額¥4,980（税込）</p>
              <p>追加トークン・PPVコンテンツ: 購入時に画面上に表示される金額</p>
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">販売価格以外の必要料金</dt>
            <dd className="text-sm text-muted-foreground">
              インターネット接続料金、通信料金等はお客様のご負担となります
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">支払方法</dt>
            <dd className="text-sm text-muted-foreground">
              クレジットカード（Stripe社の決済システムを利用）
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">支払時期</dt>
            <dd className="text-sm text-muted-foreground">
              サブスクリプション登録時に初回課金。以降毎月自動更新
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">サービス提供時期</dt>
            <dd className="text-sm text-muted-foreground">
              決済完了後、直ちにサービスをご利用いただけます
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">キャンセル・解約</dt>
            <dd className="text-sm text-muted-foreground space-y-1">
              <p>サブスクリプションはいつでもキャンセルが可能です。</p>
              <p>キャンセル後も、現在の請求期間の終了まではサービスをご利用いただけます。</p>
              <p>日割り計算による返金は行いません。</p>
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">返金ポリシー</dt>
            <dd className="text-sm text-muted-foreground space-y-1">
              <p>デジタルコンテンツの性質上、原則として返金はお受けできません。</p>
              <p>ただし、サービスの重大な不具合により利用できなかった場合はこの限りではありません。</p>
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">動作環境</dt>
            <dd className="text-sm text-muted-foreground space-y-1">
              <p>最新版のChrome、Safari、Firefox、Edgeに対応</p>
              <p>スマートフォン・タブレット・PCでご利用いただけます（PWA対応）</p>
            </dd>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-4 last:pb-0">
            <dt className="text-sm font-semibold text-foreground sm:w-48 flex-shrink-0">特別な販売条件</dt>
            <dd className="text-sm text-muted-foreground">
              本サービスは18歳以上の方のみご利用いただけます
            </dd>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center space-y-1 pt-4 pb-8">
          <p className="text-xs text-muted-foreground">さやゆめ v0.1.0</p>
          <p className="text-xs text-muted-foreground">18歳以上限定 · AI生成コンテンツ</p>
        </div>
      </div>
    </div>
  );
}
