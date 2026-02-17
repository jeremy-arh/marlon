import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET public settings (contact info) and FAQ - utilise le service client pour lecture fiable
export async function GET() {
  try {
    const serviceClient = createServiceClient();
    
    // Récupérer TOUS les settings puis filtrer par is_visible côté serveur
    const { data: allSettings, error: settingsError } = await serviceClient
      .from('site_settings')
      .select('key, value, is_visible');

    if (settingsError) throw settingsError;

    // Ne retourner que les settings avec is_visible = true
    const visibleSettings = (allSettings || []).filter((s: any) => s.is_visible === true);
    const settingsMap: Record<string, any> = {};
    visibleSettings.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    // Récupérer les FAQ visibles
    const { data: faqItems, error: faqError } = await serviceClient
      .from('faq_items')
      .select('id, question, answer, category, order_index')
      .eq('is_visible', true)
      .order('order_index');

    if (faqError) throw faqError;

    return NextResponse.json(
      {
        success: true,
        data: {
          settings: settingsMap,
          faq: faqItems || [],
        },
      },
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
    console.error('Error fetching support settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Disable static generation for this route
export const dynamic = 'force-dynamic';
