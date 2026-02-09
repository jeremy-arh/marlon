import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrganizationLog } from '@/lib/utils/organization-logs';

export async function POST(request: NextRequest) {
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
    const { name, siret, email, phone, address, city, postal_code, country } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('organizations')
      .insert({
        name,
        siret: siret || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postal_code: postal_code || null,
        country: country || 'FR',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Create log for organization creation
    await createOrganizationLog({
      organizationId: data.id,
      actionType: 'created',
      description: `Organisation créée: ${name}`,
      metadata: {
        name,
        siret,
        email,
        phone,
        address,
        city,
        postal_code,
        country,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
