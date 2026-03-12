import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const subscriptionId = session.subscription as string;

        if (!userId || !plan) break;

        // Stripe Subscriptionの詳細取得
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // v20 SDK: current_period はitems配下に移動
        const firstItem = subscription.items.data[0];
        const periodStart = firstItem?.current_period_start;
        const periodEnd = firstItem?.current_period_end;

        // subscriptionsテーブルをupsert（既存レコードがなくても対応）
        await getSupabaseAdmin()
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan,
            status: 'active',
            payment_provider: 'stripe',
            external_subscription_id: subscriptionId,
            current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        // ユーザーのis_premiumフラグを更新
        await getSupabaseAdmin()
          .from('users')
          .update({
            is_premium: plan !== 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Basicプランのボーナストークン付与
        if (plan === 'basic' || plan === 'premium') {
          const bonusTokens = plan === 'premium' ? 500 : 200;

          const { data: balance } = await getSupabaseAdmin()
            .from('token_balances')
            .select('balance, total_purchased')
            .eq('user_id', userId)
            .single();

          if (balance) {
            const newBalance = balance.balance + bonusTokens;
            await getSupabaseAdmin()
              .from('token_balances')
              .update({
                balance: newBalance,
                total_purchased: balance.total_purchased + bonusTokens,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            await getSupabaseAdmin().from('token_transactions').insert({
              user_id: userId,
              amount: bonusTokens,
              type: 'subscription_grant',
              description: `${plan}プラン登録ボーナス`,
              balance_after: newBalance,
            });
          }
        }

        console.log(`Subscription activated: user=${userId}, plan=${plan}, sub=${subscriptionId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const updItem = subscription.items.data[0];
        const updPeriodStart = updItem?.current_period_start;
        const updPeriodEnd = updItem?.current_period_end;

        // Price IDからプラン名を逆引き（metadataは旧値の可能性があるため使わない）
        const updPriceId = updItem?.price?.id;
        let updPlan: string | null = null;
        if (updPriceId === process.env.STRIPE_BASIC_PRICE_ID) updPlan = 'basic';
        else if (updPriceId === process.env.STRIPE_PREMIUM_PRICE_ID) updPlan = 'premium';
        // Price IDが未設定の場合のみmetadata参照（プラン変更直後はmetadataが更新済みのため使用可）
        if (!updPlan && subscription.metadata?.plan &&
            ['basic', 'premium', 'free'].includes(subscription.metadata.plan)) {
          updPlan = subscription.metadata.plan;
        }

        // DBからサブスクを探す
        const { data: sub } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id, plan')
          .eq('external_subscription_id', subscriptionId)
          .single();

        if (sub) {
          const status = subscription.status === 'active' ? 'active'
            : subscription.status === 'past_due' ? 'past_due'
            : subscription.status === 'canceled' ? 'cancelled'
            : 'expired';

          // DB更新（planも含む）
          const updateData: Record<string, unknown> = {
            status,
            current_period_start: updPeriodStart ? new Date(updPeriodStart * 1000).toISOString() : null,
            current_period_end: updPeriodEnd ? new Date(updPeriodEnd * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          };
          if (updPlan) {
            updateData.plan = updPlan;
          }

          await getSupabaseAdmin()
            .from('subscriptions')
            .update(updateData)
            .eq('external_subscription_id', subscriptionId);

          // is_premium更新
          const effectivePlan = updPlan || sub.plan;
          if (status === 'cancelled' || status === 'expired') {
            await getSupabaseAdmin()
              .from('users')
              .update({ is_premium: false, updated_at: new Date().toISOString() })
              .eq('id', sub.user_id);
          } else if (status === 'active' && updPlan) {
            await getSupabaseAdmin()
              .from('users')
              .update({
                is_premium: effectivePlan !== 'free',
                updated_at: new Date().toISOString(),
              })
              .eq('id', sub.user_id);
          }

          console.log(`Subscription updated: user=${sub.user_id}, plan=${effectivePlan}, status=${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const { data: sub } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id')
          .eq('external_subscription_id', subscriptionId)
          .single();

        if (sub) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              status: 'cancelled',
              plan: 'free',
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq('external_subscription_id', subscriptionId);

          await getSupabaseAdmin()
            .from('users')
            .update({ is_premium: false, updated_at: new Date().toISOString() })
            .eq('id', sub.user_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // v20 SDK: subscription は parent.subscription_details 経由
        const subscriptionId = (invoice as unknown as { parent?: { subscription_details?: { subscription?: string } } })
          .parent?.subscription_details?.subscription;

        if (subscriptionId) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('external_subscription_id', subscriptionId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
