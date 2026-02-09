import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is super admin
    const serviceClient = createServiceClient();
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: tracking, error } = await serviceClient
      .from('order_tracking')
      .select('*')
      .eq('order_id', params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: tracking || null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is super admin
    const serviceClient = createServiceClient();
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();

    // Check if tracking exists
    const { data: existingTracking } = await serviceClient
      .from('order_tracking')
      .select('id')
      .eq('order_id', params.id)
      .maybeSingle();

    let result;
    if (existingTracking) {
      // Update existing tracking
      const { data, error } = await serviceClient
        .from('order_tracking')
        .update(body)
        .eq('order_id', params.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Create new tracking
      const { data, error } = await serviceClient
        .from('order_tracking')
        .insert({
          order_id: params.id,
          ...body,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      result = data;
    }

    // Create log for tracking update
    const changedFields = Object.keys(body).filter(key => {
      if (existingTracking) {
        return body[key] !== (existingTracking as Record<string, any>)[key];
      }
      return body[key] !== null && body[key] !== undefined;
    });

    if (changedFields.length > 0) {
      await createOrderLog({
        orderId: params.id,
        actionType: 'tracking_updated',
        description: `Suivi mis à jour: ${changedFields.join(', ')}`,
        metadata: {
          changed_fields: changedFields,
          values: changedFields.reduce((acc: any, field) => {
            acc[field] = body[field];
            return acc;
          }, {}),
        },
        userId: user.id,
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
