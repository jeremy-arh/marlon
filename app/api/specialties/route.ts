import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Utiliser un client anonyme pour les données publiques
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: rawSpecialties, error } = await supabase
      .from('specialties')
      .select('id, name');

    if (error) {
      console.error('Error fetching specialties:', error);
      return NextResponse.json({ specialties: [], error: error.message });
    }

    // Tri alphabétique en français, "Autres" toujours en fin de liste
    const specialties = (rawSpecialties || []).sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      if (nameA === 'Autres') return 1;
      if (nameB === 'Autres') return -1;
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    });

    return NextResponse.json({ specialties });
  } catch (error: any) {
    console.error('API specialties error:', error);
    return NextResponse.json(
      { error: error.message, specialties: [] },
      { status: 500 }
    );
  }
}
