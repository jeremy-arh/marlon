import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET all settings
export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    
    // Force fresh data by ordering by updated_at DESC and selecting all columns
    const { data, error } = await serviceClient
      .from('site_settings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('GET /api/admin/settings - Error:', error);
      throw error;
    }

    // Re-order by key for consistent output
    const sortedData = data?.sort((a, b) => a.key.localeCompare(b.key)) || [];

    console.log('GET /api/admin/settings - Returning:', JSON.stringify(sortedData, null, 2));
    console.log('GET /api/admin/settings - Count:', sortedData?.length);
    if (sortedData && sortedData.length > 0) {
      console.log('GET /api/admin/settings - First item updated_at:', sortedData[0].updated_at);
      console.log('GET /api/admin/settings - All updated_at:', sortedData.map(s => ({ key: s.key, updated_at: s.updated_at })));
    }

    return NextResponse.json(
      { success: true, data: sortedData },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a setting
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, is_visible } = body;

    console.log('PUT /api/admin/settings - Received:', JSON.stringify({ key, value, is_visible }, null, 2));
    console.log('PUT /api/admin/settings - is_visible type:', typeof is_visible, 'value:', is_visible);

    // First, check if the setting exists
    const { data: existing } = await serviceClient
      .from('site_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing record
      const updateData = {
        value,
        is_visible: is_visible === true || is_visible === 'true' || is_visible === 1,
        updated_at: new Date().toISOString()
      };
      
      console.log('PUT /api/admin/settings - Updating with:', JSON.stringify(updateData, null, 2));
      
      const { data, error } = await serviceClient
        .from('site_settings')
        .update(updateData)
        .eq('key', key)
        .select()
        .single();

      if (error) {
        console.error('PUT /api/admin/settings - Update Error:', error);
        throw error;
      }
      
      console.log('PUT /api/admin/settings - Update result:', JSON.stringify(data, null, 2));
      result = data;
    } else {
      // Insert new record
      const { data, error } = await serviceClient
        .from('site_settings')
        .insert({
          key,
          value,
          is_visible,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('PUT /api/admin/settings - Insert Error:', error);
        throw error;
      }
      result = data;
    }

    console.log('PUT /api/admin/settings - Success:', result);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
