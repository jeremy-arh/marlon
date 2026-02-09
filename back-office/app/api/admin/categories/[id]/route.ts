import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

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
    const { name, description, image_url, product_type, specialty_ids, it_type_ids } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    // Update category
    const { data: category, error: categoryError } = await serviceClient
      .from('categories')
      .update({
        name,
        description: description || null,
        image_url: image_url || null,
        product_type: product_type || null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (categoryError) {
      return NextResponse.json(
        { error: categoryError.message },
        { status: 500 }
      );
    }

    // Update specialties
    // Delete existing associations
    await serviceClient
      .from('category_specialties')
      .delete()
      .eq('category_id', params.id);

    // Create new associations if medical equipment
    if (product_type === 'medical_equipment' && specialty_ids && specialty_ids.length > 0) {
      const categorySpecialties = specialty_ids.map((specialtyId: string) => ({
        category_id: params.id,
        specialty_id: specialtyId,
      }));

      await serviceClient
        .from('category_specialties')
        .insert(categorySpecialties);
    }

    // Update IT types
    // Delete existing associations
    await serviceClient
      .from('category_it_types')
      .delete()
      .eq('category_id', params.id);

    // Create new associations if IT equipment
    if (product_type === 'it_equipment' && it_type_ids && it_type_ids.length > 0) {
      const categoryItTypes = it_type_ids.map((itTypeId: string) => ({
        category_id: params.id,
        it_type_id: itTypeId,
      }));

      await serviceClient
        .from('category_it_types')
        .insert(categoryItTypes);
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
