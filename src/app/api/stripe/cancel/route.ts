import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

// POST: サブスクリプションをキャンセル（期間終了時）
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('external_subscription_id')
      .eq('user_id', dbUser.id)
      .eq('payment_provider', 'stripe')
      .eq('status', 'active')
      .single();

    if (subError) {
      console.error('Subscription lookup error:', subError);
      return NextResponse.json({ error: `DB lookup failed: ${subError.message}` }, { status: 500 });
    }
    if (!sub?.external_subscription_id) {
      return NextResponse.json({ error: 'アクティブなサブスクリプションが見つかりません' }, { status: 404 });
    }

    // 期間終了時にキャンセル
    let updated;
    try {
      updated = await stripe.subscriptions.update(sub.external_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (stripeErr: unknown) {
      console.error('Stripe update error:', stripeErr);
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
    }

    // DBの cancel_at_period_end フラグを更新
    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('external_subscription_id', sub.external_subscription_id);

    return NextResponse.json({
      success: true,
      cancel_at_period_end: true,
      current_period_end: new Date(((updated as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: `解約処理に失敗しました: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

// DELETE: 解約を取り消す（再度アクティブに）
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const { data: sub } = await admin
      .from('subscriptions')
      .select('external_subscription_id')
      .eq('user_id', dbUser.id)
      .eq('payment_provider', 'stripe')
      .eq('status', 'active')
      .single();

    if (!sub?.external_subscription_id) {
      return NextResponse.json({ error: 'サブスクリプションが見つかりません' }, { status: 404 });
    }

    // 解約を取り消す
    const updated = await stripe.subscriptions.update(sub.external_subscription_id, {
      cancel_at_period_end: false,
    });

    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('external_subscription_id', sub.external_subscription_id);

    return NextResponse.json({
      success: true,
      cancel_at_period_end: false,
      current_period_end: new Date(((updated as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return NextResponse.json({ error: '解約の取り消しに失敗しました' }, { status: 500 });
  }
}
