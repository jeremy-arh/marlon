import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select(`
        organization_id,
        organizations(
          id,
          name,
          siret,
          address,
          city,
          postal_code,
          country,
          phone,
          email,
          signer_phone,
          signer_birth_city,
          signer_birth_date,
          signer_identity_card_front_url,
          signer_identity_card_back_url,
          signer_tax_liasse_url,
          signer_business_plan_url
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // For now, return basic user info from auth metadata
    const profile = {
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      phone: user.user_metadata?.phone || '',
    };

    // Get delivery addresses for the organization
    let deliveryAddresses: any[] = [];
    
    if (userRole?.organization_id) {
      const { data: addresses } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('organization_id', userRole.organization_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (addresses && addresses.length > 0) {
        deliveryAddresses = addresses;
      }
    }
    
    // If no saved addresses but organization has an address, use it as default
    if (deliveryAddresses.length === 0 && userRole?.organizations) {
      const org = userRole.organizations as any;
      if (org.address) {
        deliveryAddresses.push({
          id: 'org-default',
          name: 'Cabinet',
          address: org.address,
          city: org.city || '',
          postal_code: org.postal_code || '',
          country: org.country || 'France',
          contact_name: profile?.full_name || user.user_metadata?.full_name || '',
          contact_phone: org.phone || '',
          instructions: '',
          is_default: true,
        });
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        phone: profile?.phone || user.user_metadata?.phone || '',
      },
      organization: userRole?.organizations || null,
      organizationId: userRole?.organization_id || null,
      deliveryAddresses,
    });
  } catch (error: any) {
    console.error('Error fetching user organization:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new delivery address
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userRole?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, address, city, postal_code, country, contact_name, contact_phone, instructions, is_default } = body;

    if (!name || !address || !city || !postal_code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If this is the default address, unset other defaults
    if (is_default) {
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('organization_id', userRole.organization_id);
    }

    // Create the address
    const { data: deliveryAddress, error } = await supabase
      .from('delivery_addresses')
      .insert({
        organization_id: userRole.organization_id,
        name,
        address,
        city,
        postal_code,
        country: country || 'France',
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        instructions: instructions || null,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, deliveryAddress });
  } catch (error: any) {
    console.error('Error creating delivery address:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
