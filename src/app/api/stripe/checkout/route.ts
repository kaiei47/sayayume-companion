import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PLANS, PlanType, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // レート制限: 1分あたり5回（checkout作成はそんなに頻繁にしない）
    const clientIp = getClientIp(req);
    const rl = rateLimit(`checkout:${clientIp}`, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'リクエストが多すぎます。少し待ってください。' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { plan } = await req.json() as { plan: PlanType };

    if (!plan || plan === 'free' || !PLANS[plan]) {
      return NextResponse.json({ error: '無効なプランです' }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      return NextResponse.json({ error: 'このプランは購入できません' }, { status: 400 });
    }

    // DBからユーザー情報取得
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 既存のStripe Customerを検索 or 新規作成
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('external_subscription_id, payment_provider')
      .eq('user_id', dbUser.id)
      .eq('payment_provider', 'stripe')
      .eq('status', 'active')
      .single();

    if (existingSub?.external_subscription_id) {
      // 既にアクティブなサブスクがある → ポータルに誘導
      return NextResponse.json({ error: 'すでにサブスクリプションがあります。設定から管理してください。' }, { status: 400 });
    }

    // Stripe Checkout Session作成
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: dbUser.email || user.email,
      metadata: {
        userId: dbUser.id,
        plan,
      },
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: '決済の開始に失敗しました' },
      { status: 500 }
    );
  }
}
