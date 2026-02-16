import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

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

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('leasers')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
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
    const { name, contact_email, contact_phone } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('leasers')
      .update({
        name,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify user is super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if leaser is used by products
    const { data: products } = await serviceClient
      .from('products')
      .select('id')
      .eq('default_leaser_id', params.id)
      .limit(1);

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: 'Ce leaser est utilisé par des produits et ne peut pas être supprimé' },
        { status: 400 }
      );
    }

    // Check if leaser is used by orders
    const { data: orders } = await serviceClient
      .from('orders')
      .select('id')
      .eq('leaser_id', params.id)
      .limit(1);

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: 'Ce leaser est lié à des commandes et ne peut pas être supprimé' },
        { status: 400 }
      );
    }

    // Check if leaser is used by contracts
    const { data: contracts } = await serviceClient
      .from('contracts')
      .select('id')
      .eq('leaser_id', params.id)
      .limit(1);

    if (contracts && contracts.length > 0) {
      return NextResponse.json(
        { error: 'Ce leaser est lié à des contrats et ne peut pas être supprimé' },
        { status: 400 }
      );
    }

    // Leaser coefficients will be deleted automatically (ON DELETE CASCADE)
    const { error } = await serviceClient
      .from('leasers')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
