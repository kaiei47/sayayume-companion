import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

// Stripe Customer Portal — サブスク管理（プラン変更、解約）
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // Stripe subscription IDからcustomer IDを取得
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('external_subscription_id')
      .eq('user_id', dbUser.id)
      .eq('payment_provider', 'stripe')
      .single();

    if (!sub?.external_subscription_id) {
      return NextResponse.json({ error: 'サブスクリプションが見つかりません' }, { status: 404 });
    }

    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(sub.external_subscription_id);
    } catch (stripeErr: unknown) {
      const isNotFound = stripeErr instanceof Error && stripeErr.message.includes('No such subscription');
      console.error('Portal stripe retrieve error:', stripeErr);
      if (isNotFound) {
        return NextResponse.json({ error: 'サブスクリプションが見つかりません。再度ご購読ください。', code: 'subscription_not_found' }, { status: 404 });
      }
      throw stripeErr;
    }

    const customerId = subscription.customer as string;

    const origin = req.headers.get('origin') || 'https://www.sayayume.com';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ error: 'ポータルの開始に失敗しました' }, { status: 500 });
  }
}
