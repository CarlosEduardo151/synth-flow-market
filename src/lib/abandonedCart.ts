import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/CartContext';

export type FunnelEventType =
  | 'cart_updated'
  | 'cart_cleared'
  | 'checkout_view'
  | 'order_created';

export type AbandonedStage = 'cart' | 'checkout';

function serializeCartItems(items: CartItem[]) {
  return items.map((i) => ({
    slug: i.slug,
    title: i.title,
    price: i.price,
    quantity: i.quantity,
    image: i.image ?? null,
    acquisitionType: i.acquisitionType,
    rentalMonths: i.rentalMonths ?? null,
    isPackage: Boolean(i.isPackage),
    packageId: i.packageId ?? null,
    subscriptionPlan: i.subscriptionPlan ?? null,
    includedProducts: i.includedProducts ?? null,
  }));
}

export async function logFunnelEvent(userId: string, eventType: FunnelEventType, metadata?: unknown) {
  await supabase.from('funnel_events').insert({
    user_id: userId,
    event_type: eventType,
    metadata: (metadata ?? null) as any,
  });
}

export async function upsertOpenAbandonedCart(params: {
  userId: string;
  stage: AbandonedStage;
  items: CartItem[];
  totalAmount: number;
}) {
  const { userId, stage, items, totalAmount } = params;

  const payload = {
    user_id: userId,
    stage,
    status: 'open',
    cart_items: serializeCartItems(items) as any,
    total_amount: totalAmount as any,
    last_event_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('abandoned_carts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('abandoned_carts').update(payload).eq('id', existing.id);
    return existing.id as string;
  }

  const { data: created } = await supabase
    .from('abandoned_carts')
    .insert(payload)
    .select('id')
    .single();

  return created?.id as string | undefined;
}

export async function closeOpenAbandonedCarts(userId: string, status: 'cleared' | 'converted') {
  await supabase
    .from('abandoned_carts')
    .update({
      status,
      updated_at: new Date().toISOString(),
      last_event_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'open');
}
