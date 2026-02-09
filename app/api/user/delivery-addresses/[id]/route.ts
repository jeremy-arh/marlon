import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT: Update a delivery address
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify the address belongs to the user's organization
    const { data: existingAddress } = await supabase
      .from('delivery_addresses')
      .select('id, organization_id')
      .eq('id', params.id)
      .single();

    if (!existingAddress || existingAddress.organization_id !== userRole.organization_id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, address, city, postal_code, country, contact_name, contact_phone, instructions } = body;

    if (!name || !address || !city || !postal_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the address
    const { data: updatedAddress, error } = await supabase
      .from('delivery_addresses')
      .update({
        name,
        address,
        city,
        postal_code,
        country: country || 'France',
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        instructions: instructions || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, address: updatedAddress });
  } catch (error: any) {
    console.error('Error updating delivery address:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a delivery address
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify the address belongs to the user's organization
    const { data: existingAddress } = await supabase
      .from('delivery_addresses')
      .select('id, organization_id')
      .eq('id', params.id)
      .single();

    if (!existingAddress || existingAddress.organization_id !== userRole.organization_id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Delete the address
    const { error } = await supabase
      .from('delivery_addresses')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting delivery address:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
