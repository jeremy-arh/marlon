import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET public settings (contact info) and FAQ
export async function GET() {
  try {
    // Use anon key for public data access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Supabase URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('Supabase Anon Key:', supabaseAnonKey ? 'OK' : 'MISSING');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get visible settings
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('key, value, is_visible')
      .eq('is_visible', true);

    console.log('Settings from DB:', settings);
    console.log('Settings error:', settingsError);

    if (settingsError) throw settingsError;

    // Get visible FAQ items
    const { data: faqItems, error: faqError } = await supabase
      .from('faq_items')
      .select('id, question, answer, category, order_index')
      .eq('is_visible', true)
      .order('order_index');

    if (faqError) throw faqError;

    // Transform settings to a more usable format
    const settingsMap: Record<string, any> = {};
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    console.log('📤 Returning support settings:', {
      settings: settingsMap,
      faqCount: faqItems?.length || 0,
      visibleSettings: settings?.map(s => ({ key: s.key, is_visible: s.is_visible }))
    });

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
