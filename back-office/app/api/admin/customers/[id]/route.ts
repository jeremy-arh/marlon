import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrganizationLog } from '@/lib/utils/organization-logs';

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

    const { data, error } = await serviceClient
      .from('organizations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
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

    // Get current organization to track changes
    const { data: currentOrg } = await serviceClient
      .from('organizations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!currentOrg) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, siret, email, phone, address, city, postal_code, country } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('organizations')
      .update({
        name,
        siret: siret || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postal_code: postal_code || null,
        country: country || 'FR',
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

    // Track changes for logging
    const changes: string[] = [];
    const metadata: any = {};

    if (name !== currentOrg.name) {
      changes.push(`Nom modifié: ${currentOrg.name} → ${name}`);
      metadata.name_change = { from: currentOrg.name, to: name };
    }
    if (siret !== currentOrg.siret) {
      changes.push('SIRET modifié');
      metadata.siret_change = { from: currentOrg.siret, to: siret };
    }
    if (email !== currentOrg.email) {
      changes.push('Email modifié');
      metadata.email_change = { from: currentOrg.email, to: email };
    }
    if (phone !== currentOrg.phone) {
      changes.push('Téléphone modifié');
      metadata.phone_change = { from: currentOrg.phone, to: phone };
    }
    if (address !== currentOrg.address) {
      changes.push('Adresse modifiée');
      metadata.address_change = { from: currentOrg.address, to: address };
    }
    if (city !== currentOrg.city) {
      changes.push('Ville modifiée');
      metadata.city_change = { from: currentOrg.city, to: city };
    }
    if (postal_code !== currentOrg.postal_code) {
      changes.push('Code postal modifié');
      metadata.postal_code_change = { from: currentOrg.postal_code, to: postal_code };
    }
    if (country !== currentOrg.country) {
      changes.push('Pays modifié');
      metadata.country_change = { from: currentOrg.country, to: country };
    }

    // Create log
    await createOrganizationLog({
      organizationId: params.id,
      actionType: 'updated',
      description: changes.length > 0 ? changes.join(', ') : 'Organisation mise à jour',
      metadata,
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
