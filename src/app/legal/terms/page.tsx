'use client';

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* ヘッダー */}
        <div>
          <a href="/" className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block">
            ← トップに戻る
          </a>
          <h1 className="text-2xl font-bold tracking-tight">利用規約</h1>
          <p className="text-sm text-muted-foreground mt-1">最終更新日: 2026年3月11日</p>
        </div>

        {/* 第1条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第1条（サービスの概要）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            「さやゆめ」（以下「本サービス」）は、AI技術を活用した恋愛シミュレーションゲームです。
            ユーザーはAIキャラクター（さや・ゆめ）とのテキストチャットおよびAI生成画像の閲覧を楽しむことができます。
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本サービスで提供されるすべてのチャット応答および画像は、人工知能（AI）によって自動生成されたものであり、
            実在の人物を表現するものではありません。
          </p>
        </section>

        {/* 第2条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第2条（年齢制限）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本サービスは18歳以上の方のみご利用いただけます。
            18歳未満の方の利用は固くお断りいたします。
            アカウント登録時に年齢確認を行い、虚偽の申告が判明した場合は直ちにアカウントを停止します。
          </p>
        </section>

        {/* 第3条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第3条（アカウント登録）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ユーザーは正確な情報を提供してアカウントを登録する必要があります。
            アカウントの管理責任はユーザーにあり、第三者への譲渡・貸与は禁止します。
            不正アクセスやアカウントの不正使用が発覚した場合、直ちに当社にご連絡ください。
          </p>
        </section>

        {/* 第4条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第4条（AI生成コンテンツに関する免責事項）</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              本サービスのAIキャラクターが生成するテキストおよび画像は、すべてAI（人工知能）によって自動生成されたものです。
              以下の点についてご了承ください。
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>AIの応答は架空のものであり、事実に基づくものではありません</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>AIキャラクターは実在の人物ではなく、感情や意思を持ちません</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>生成されたコンテンツの正確性・適切性について保証するものではありません</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>生成画像は架空のものであり、実在の人物とは一切関係ありません</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 第5条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第5条（料金および支払い）</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              本サービスは無料プランと有料プランを提供しています。有料プランの料金は以下の通りです。
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>Basicプラン: 月額¥1,980（税込）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>Premiumプラン: 月額¥2,980（税込）</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              決済はStripe社の決済システムを通じて処理されます。
              サブスクリプションは自動更新され、キャンセルしない限り毎月自動的に課金されます。
              キャンセルはいつでも可能ですが、日割りでの返金は行いません。
              キャンセル後も、現在の請求期間の終了まではサービスをご利用いただけます。
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              追加のトークン購入やPPV（ペイパービュー）コンテンツについては、購入時に表示される金額が適用されます。
              デジタルコンテンツの性質上、購入後の返金は原則としてお受けできません。
            </p>
          </div>
        </section>

        {/* 第6条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第6条（禁止事項）</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              ユーザーは本サービスの利用にあたり、以下の行為を行ってはなりません。
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>法令または公序良俗に反する行為</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>未成年者に有害な影響を与える行為</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>本サービスの運営を妨害する行為（不正アクセス、スクレイピング、APIの不正利用等）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>他のユーザーまたは第三者の権利を侵害する行為</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>AI生成コンテンツを実在の人物として偽る行為</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>本サービスのコンテンツを無断で転載・再配布する行為</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>リバースエンジニアリング、逆コンパイル、逆アセンブルを行う行為</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>その他、当社が不適切と判断する行為</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 第7条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第7条（コンテンツの権利）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本サービスにおいてAIが生成したテキスト、画像、その他のコンテンツに関する著作権その他の知的財産権は、
            当社または当社にライセンスを許諾した第三者に帰属します。
            ユーザーは、本サービスを通じて取得したAI生成コンテンツを個人利用の範囲でのみ使用できます。
            商業目的での使用、再配布、二次利用は禁止します。
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ユーザーが本サービスに入力したテキスト（チャットメッセージ等）については、
            サービスの改善・AIモデルの学習のために利用させていただく場合があります。
          </p>
        </section>

        {/* 第8条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第8条（サービスの変更・中断・終了）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            当社は、以下の場合に事前の通知なく本サービスの全部または一部を変更、中断、または終了することができます。
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>システムのメンテナンスや更新を行う場合</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>天災、停電、その他の不可抗力が発生した場合</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>その他、運営上必要と判断した場合</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            料金体系の変更については、変更の30日前までにユーザーに通知します。
          </p>
        </section>

        {/* 第9条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第9条（免責事項）</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              当社は、本サービスに関して以下の事項について一切の保証をいたしません。
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 ml-4">
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>本サービスが中断なく提供されること</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>AI生成コンテンツの正確性、完全性、有用性</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>本サービスがユーザーの特定の目的に適合すること</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground/60">•</span>
                <span>セキュリティ上の欠陥やエラーが完全に修正されること</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              本サービスの利用によりユーザーに生じた損害について、当社の故意または重大な過失による場合を除き、
              当社の損害賠償責任は、ユーザーが過去12ヶ月間に本サービスに支払った金額を上限とします。
            </p>
          </div>
        </section>

        {/* 第10条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第10条（規約の変更）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            当社は、必要に応じて本規約を変更することがあります。
            重要な変更がある場合は、サービス内の通知またはメールにて事前にお知らせいたします。
            変更後の規約は、本サービス上に掲載された時点で効力を生じます。
            変更後も本サービスの利用を継続した場合、変更後の規約に同意したものとみなします。
          </p>
        </section>

        {/* 第11条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第11条（準拠法・管轄裁判所）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本規約の解釈および適用は日本法に準拠します。
            本サービスに関連する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        {/* 第12条 */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
          <h2 className="text-lg font-semibold">第12条（お問い合わせ）</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本規約に関するお問い合わせは、本サービス内のお問い合わせフォームまたは以下のメールアドレスまでご連絡ください。
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
