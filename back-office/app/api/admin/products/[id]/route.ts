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
    
    // Fetch product with basic relations
    const { data, error } = await serviceClient
      .from('products')
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(name),
        default_leaser:leasers(name),
        product_images(image_url, order_index)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Fetch categories and specialties separately
    const { data: categoriesData } = await serviceClient
      .from('product_categories')
      .select('category_id, category:categories(name)')
      .eq('product_id', params.id);

    let specialtiesData: any[] = [];
    try {
      const { data: specialties } = await serviceClient
        .from('product_specialties')
        .select('specialty_id, specialty:specialties(name)')
        .eq('product_id', params.id);
      specialtiesData = specialties || [];
    } catch (e) {
      // Table might not exist yet, ignore
    }

    // Fetch variant filters
    let variantFiltersData: any[] = [];
    try {
      const { data: variantFilters } = await serviceClient
        .from('product_variant_filters_junction')
        .select('filter_id')
        .eq('product_id', params.id);
      variantFiltersData = variantFilters || [];
    } catch (e) {
      // Table might not exist yet, ignore
    }

    // Fetch child products (variants) if this is a parent product
    const { data: childProducts } = await serviceClient
      .from('products')
      .select(`
        id, name, reference, description, technical_info, purchase_price_ht, marlon_margin_percent, product_type, variant_data,
        product_images(image_url, order_index)
      `)
      .eq('parent_product_id', params.id)
      .order('created_at', { ascending: true });

    const enrichedData = {
      ...data,
      product_categories: categoriesData || [],
      product_specialties: specialtiesData || [],
      variant_filter_ids: variantFiltersData.map((vf: any) => vf.filter_id),
      child_products: childProducts || [],
    };

    return NextResponse.json({ success: true, data: enrichedData });
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
    const { name, reference, description, technical_info, product_type, serial_number, purchase_price_ht, marlon_margin_percent, supplier_id, brand_id, default_leaser_id, category_ids, specialty_ids, images, variant_filter_ids, variant_data, parent_product_id } = body;

    if (!name || !purchase_price_ht || !marlon_margin_percent || !product_type) {
      return NextResponse.json({ error: 'Les champs nom, type, prix d\'achat et marge sont requis' }, { status: 400 });
    }

    const { data: product, error } = await serviceClient
      .from('products')
      .update({
        name,
        reference: reference || null,
        description: description || null,
        technical_info: technical_info || null,
        product_type,
        serial_number: serial_number || null,
        purchase_price_ht,
        marlon_margin_percent,
        parent_product_id: parent_product_id || null,
        supplier_id: supplier_id || null,
        brand_id: brand_id || null,
        default_leaser_id: default_leaser_id || null,
        variant_data: product_type === 'it_equipment' ? (variant_data || {}) : {},
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

    // Update product images
    if (images !== undefined) {
      // Delete existing images
      await serviceClient
        .from('product_images')
        .delete()
        .eq('product_id', params.id);

      // Insert new images if provided
      if (Array.isArray(images) && images.length > 0) {
        const imageRecords = images.map((url: string, index: number) => ({
          product_id: params.id,
          image_url: url,
          order_index: index,
        }));

        await serviceClient
          .from('product_images')
          .insert(imageRecords);
      }
    }

    // Update product categories
    if (category_ids !== undefined) {
      // Delete existing categories
      await serviceClient
        .from('product_categories')
        .delete()
        .eq('product_id', params.id);

      // Insert new categories if provided
      if (Array.isArray(category_ids) && category_ids.length > 0) {
        const categoryRecords = category_ids.map((categoryId: string) => ({
          product_id: params.id,
          category_id: categoryId,
        }));

        await serviceClient
          .from('product_categories')
          .insert(categoryRecords);
      }
    }

    // Update product specialties
    if (specialty_ids !== undefined) {
      // Delete existing specialties
      await serviceClient
        .from('product_specialties')
        .delete()
        .eq('product_id', params.id);

      // Insert new specialties if provided (only for medical equipment)
      if (product_type === 'medical_equipment' && Array.isArray(specialty_ids) && specialty_ids.length > 0) {
        const specialtyRecords = specialty_ids.map((specialtyId: string) => ({
          product_id: params.id,
          specialty_id: specialtyId,
        }));

        await serviceClient
          .from('product_specialties')
          .insert(specialtyRecords);
      }
    }

    // Update product variant filters
    if (variant_filter_ids !== undefined && product_type === 'it_equipment') {
      // Delete existing variant filters
      await serviceClient
        .from('product_variant_filters_junction')
        .delete()
        .eq('product_id', params.id);

      // Insert new variant filters if provided
      if (Array.isArray(variant_filter_ids) && variant_filter_ids.length > 0) {
        const filterRecords = variant_filter_ids.map((filterId: string) => ({
          product_id: params.id,
          filter_id: filterId,
        }));

        await serviceClient
          .from('product_variant_filters_junction')
          .insert(filterRecords);
      }
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Mise à jour rapide inline (leaser, marge, type, catégories)
 * Ne nécessite pas tous les champs obligatoires contrairement à PUT.
 */
export async function PATCH(
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
    const updateFields: Record<string, any> = {};

    // Champs simples (colonnes directes sur products)
    if (body.default_leaser_id !== undefined) updateFields.default_leaser_id = body.default_leaser_id || null;
    if (body.marlon_margin_percent !== undefined) updateFields.marlon_margin_percent = body.marlon_margin_percent;
    if (body.product_type !== undefined) updateFields.product_type = body.product_type;

    // Mettre à jour les champs simples si présents
    if (Object.keys(updateFields).length > 0) {
      const { error } = await serviceClient
        .from('products')
        .update(updateFields)
        .eq('id', params.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Mettre à jour les catégories (table de jonction)
    if (body.category_ids !== undefined) {
      const { error: deleteError } = await serviceClient
        .from('product_categories')
        .delete()
        .eq('product_id', params.id);

      if (deleteError) {
        console.error('Error deleting product_categories:', deleteError);
        return NextResponse.json({ error: 'Erreur lors de la suppression des catégories: ' + deleteError.message }, { status: 500 });
      }

      if (Array.isArray(body.category_ids) && body.category_ids.length > 0) {
        const categoryRecords = body.category_ids.map((categoryId: string) => ({
          product_id: params.id,
          category_id: categoryId,
        }));

        const { error: catError } = await serviceClient
          .from('product_categories')
          .insert(categoryRecords);

        if (catError) {
          console.error('Error inserting product_categories:', catError);
          return NextResponse.json({ error: 'Erreur lors de l\'ajout des catégories: ' + catError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const productId = params.id;

    // Vérifier si le produit est utilisé dans des commandes
    const { data: orderItems } = await serviceClient
      .from('order_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (orderItems && orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer ce produit : il est utilisé dans des commandes.' },
        { status: 400 }
      );
    }

    // Si c'est un produit parent, supprimer d'abord les variantes (enfants)
    const { data: variants } = await serviceClient
      .from('products')
      .select('id')
      .eq('parent_product_id', productId);

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        // Vérifier que les variantes ne sont pas dans des commandes
        const { data: variantInOrders } = await serviceClient
          .from('order_items')
          .select('id')
          .eq('product_id', variant.id)
          .limit(1);
        if (variantInOrders && variantInOrders.length > 0) {
          return NextResponse.json(
            { error: 'Impossible de supprimer : une variante de ce produit est utilisée dans des commandes.' },
            { status: 400 }
          );
        }
        // Supprimer les données liées aux variantes
        await serviceClient.from('product_categories').delete().eq('product_id', variant.id);
        await serviceClient.from('product_images').delete().eq('product_id', variant.id);
        await serviceClient.from('product_specialties').delete().eq('product_id', variant.id);
        await serviceClient.from('product_variant_filters_junction').delete().eq('product_id', variant.id);
        await serviceClient.from('product_documents').delete().eq('product_id', variant.id);
        await serviceClient.from('cart_items').delete().eq('product_id', variant.id);
        await serviceClient.from('products').delete().eq('id', variant.id);
      }
    }

    // Supprimer les données liées au produit
    await serviceClient.from('product_categories').delete().eq('product_id', productId);
    await serviceClient.from('product_images').delete().eq('product_id', productId);
    await serviceClient.from('product_specialties').delete().eq('product_id', productId);
    await serviceClient.from('product_variant_filters_junction').delete().eq('product_id', productId);
    await serviceClient.from('product_documents').delete().eq('product_id', productId);
    await serviceClient.from('cart_items').delete().eq('product_id', productId);

    const { error: deleteError } = await serviceClient
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Error deleting product:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE product error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
