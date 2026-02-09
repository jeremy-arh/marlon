import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: List all delivery addresses for the user's organization
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userRole?.organization_id) {
      return NextResponse.json({ addresses: [] });
    }

    // Get delivery addresses
    const { data: addresses, error } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('organization_id', userRole.organization_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ addresses: addresses || [] });
  } catch (error: any) {
    console.error('Error fetching delivery addresses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new delivery address
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userRole?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const { name, address, city, postal_code, country, contact_name, contact_phone, instructions } = body;

    if (!name || !address || !city || !postal_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the address
    const { data: newAddress, error } = await supabase
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
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, address: newAddress });
  } catch (error: any) {
    console.error('Error creating delivery address:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
