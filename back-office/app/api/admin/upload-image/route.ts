import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const bucket = (formData.get('bucket') as string) || 'product-images';

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Upload to Supabase Storage (allow overwrite for updates)
    const upsert = formData.get('upsert') === 'true';
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: upsert,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}
