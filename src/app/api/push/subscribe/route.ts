import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Delete any existing subscription with the same endpoint for this user, then insert fresh
    // (avoids functional-index onConflict issues with PostgREST)
    await supabase.from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('subscription->>endpoint', (subscription as { endpoint: string }).endpoint);

    await supabase.from('push_subscriptions').insert({
      user_id: user.id,
      subscription,
      updated_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error('push subscribe error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint } = await req.json();
    await supabase.from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('subscription->>endpoint', endpoint);

    return Response.json({ ok: true });
  } catch (e) {
    console.error('push unsubscribe error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
