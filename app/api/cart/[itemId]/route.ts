import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify cart item belongs to user
    const { data: cartItem } = await supabase
      .from('cart_items')
      .select('cart_id, carts!inner(user_id)')
      .eq('id', params.itemId)
      .single();

    if (!cartItem || cartItem.carts.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', params.itemId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { quantity, leasing_duration_months, durationMonths } = body;

    // Verify cart item belongs to user
    const { data: cartItem } = await supabase
      .from('cart_items')
      .select('cart_id, carts!inner(user_id)')
      .eq('id', params.itemId)
      .single();

    if (!cartItem || cartItem.carts.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    // Support both naming conventions
    const finalDurationMonths = leasing_duration_months || durationMonths;
    if (finalDurationMonths !== undefined) updateData.leasing_duration_months = finalDurationMonths;

    const { data, error } = await supabase
      .from('cart_items')
      .update(updateData)
      .eq('id', params.itemId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ cartItem: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
