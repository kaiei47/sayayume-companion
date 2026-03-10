'use client';

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* ヘッダー */}
        <div>
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block">
            ← トップに戻る
          </a>
          <h1 className="text-2xl font-bold tracking-tight">プライバシーポリシー</h1>
          <p className="text-sm text-muted-foreground mt-1">最終更新日: 2026年3月11日</p>
        </div>

        {/* はじめに */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">はじめに</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            「さやゆめ」（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。
            本プライバシーポリシーは、本サービスがどのような情報を収集し、どのように利用・保護するかを説明するものです。
            本サービスをご利用いただくことで、本ポリシーに同意いただいたものとみなします。
          </p>
        </section>

        {/* 収集する情報 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">1. 収集する情報</h2>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">1-1. ユーザーが提供する情報</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>メールアドレス（アカウント登録時）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>チャットメッセージ（AIキャラクターとの会話内容）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>決済情報（クレジットカード情報はStripe社が安全に管理し、当社は直接保有しません）</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">1-2. 自動的に収集される情報</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>利用ログ（アクセス日時、利用した機能、エラー情報）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>デバイス情報（ブラウザ種類、OS、画面解像度）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>IPアドレス</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>AI生成画像およびその生成パラメータ</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 情報の利用目的 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">2. 情報の利用目的</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            収集した情報は、以下の目的で利用します。
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>本サービスの提供・運営・改善</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>ユーザーの本人確認および年齢確認</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>サブスクリプションおよび決済の処理</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>AIチャット体験のパーソナライズ（会話履歴の保持）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>カスタマーサポートへの対応</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>不正利用の防止・検出</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>サービスに関する重要なお知らせの送信</span>
            </li>
          </ul>
        </section>

        {/* 第三者サービス */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">3. 第三者サービスとの連携</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本サービスは以下の第三者サービスを利用しており、それぞれのプライバシーポリシーに従ってデータが処理されます。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted-foreground">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">サービス</th>
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">用途</th>
                  <th className="text-left py-2 font-semibold text-foreground">共有するデータ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="py-2 pr-4">Supabase</td>
                  <td className="py-2 pr-4">データベース・認証</td>
                  <td className="py-2">メール、チャット履歴、ユーザー設定</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Google Gemini</td>
                  <td className="py-2 pr-4">AIチャット・画像生成</td>
                  <td className="py-2">チャットメッセージ、生成リクエスト</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Stripe</td>
                  <td className="py-2 pr-4">決済処理</td>
                  <td className="py-2">メール、決済情報</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vercel</td>
                  <td className="py-2 pr-4">ホスティング</td>
                  <td className="py-2">アクセスログ、IPアドレス</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Cloudflare R2</td>
                  <td className="py-2 pr-4">画像ストレージ</td>
                  <td className="py-2">AI生成画像</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* データの保管 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">4. データの保管期間</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>アカウント情報: アカウント削除まで保管</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>チャット履歴: アカウント削除まで保管（ユーザーは個別に削除可能）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>AI生成画像: アカウント削除まで保管</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>決済記録: 法令の定めに従い最大7年間保管</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>アクセスログ: 90日間保管後、自動削除</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            アカウント削除後、個人情報は30日以内に削除されます。
            ただし、法令に基づく保管義務がある情報については、必要な期間保管します。
          </p>
        </section>

        {/* ユーザーの権利 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">5. ユーザーの権利</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ユーザーは以下の権利を有します。
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">アクセス権</strong>: 当社が保有するご自身の個人情報の開示を請求できます</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">訂正権</strong>: 不正確な個人情報の訂正を請求できます</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">削除権</strong>: 個人情報の削除を請求できます（アカウント削除）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">データポータビリティ</strong>: ご自身のデータを構造化された形式でエクスポートできます</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">利用停止権</strong>: 個人情報の利用停止を請求できます</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            これらの権利行使をご希望の場合は、設定ページまたはサポートまでお問い合わせください。
          </p>
        </section>

        {/* Cookie */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">6. Cookieの使用</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本サービスは以下の目的でCookieおよび類似の技術を使用しています。
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">必須Cookie</strong>: ログイン状態の維持、セッション管理</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">機能Cookie</strong>: ユーザー設定の記憶（テーマ、言語等）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span><strong className="text-foreground">分析Cookie</strong>: サービスの利用状況の把握・改善</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ブラウザの設定によりCookieを無効にすることができますが、一部の機能が正常に動作しなくなる場合があります。
          </p>
        </section>

        {/* セキュリティ */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">7. セキュリティ</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            当社はユーザーの個人情報を保護するために、以下のセキュリティ対策を講じています。
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>通信の暗号化（TLS/SSL）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>データベースの暗号化</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>アクセス制御（RLS: Row Level Security）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>決済情報はStripe社のPCI DSS準拠環境で管理</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ただし、インターネット上の通信において完全なセキュリティを保証することはできません。
          </p>
        </section>

        {/* 法令遵守 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">8. 法令の遵守</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本サービスは、日本の個人情報保護法（個人情報の保護に関する法律）に準拠して運営されます。
            法令に基づき開示が求められた場合、または不正行為の防止・安全確保のために必要な場合は、
            個人情報を開示することがあります。
          </p>
        </section>

        {/* ポリシーの変更 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">9. プライバシーポリシーの変更</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            当社は、必要に応じて本ポリシーを変更することがあります。
            重要な変更がある場合は、サービス内の通知またはメールにてお知らせいたします。
            変更後も本サービスの利用を継続した場合、変更後のポリシーに同意したものとみなします。
          </p>
        </section>

        {/* お問い合わせ */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">10. お問い合わせ</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            個人情報の取り扱いに関するお問い合わせ、開示・削除等のご請求は、以下までご連絡ください。
          </p>
          <p className="text-sm text-muted-foreground">
            メール: support@sayayume.com
          </p>
        </section>

        {/* フッター */}
        <div className="text-center space-y-1 pt-4 pb-8">
          <p className="text-xs text-muted-foreground">さやゆめ v0.1.0</p>
          <p className="text-xs text-muted-foreground">18歳以上限定 · AI生成コンテンツ</p>
        </div>
      </div>
    </div>
  );
}
