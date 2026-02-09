import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET: List all documents for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceClient = createServiceClient();
    const productId = params.id;

    const { data, error } = await serviceClient
      .from('product_documents')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Add a new document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is authenticated and super admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();

    // Check if user is super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const productId = params.id;
    const body = await request.json();

    const { name, description, file_url, file_type, file_size } = body;

    if (!name || !file_url) {
      return NextResponse.json(
        { success: false, error: 'Nom et URL du fichier requis' },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from('product_documents')
      .insert({
        product_id: productId,
        name,
        description: description || null,
        file_url,
        file_type: file_type || null,
        file_size: file_size || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is authenticated and super admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();

    // Check if user is super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID du document requis' },
        { status: 400 }
      );
    }

    const { error } = await serviceClient
      .from('product_documents')
      .delete()
      .eq('id', documentId)
      .eq('product_id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
