import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
    redirect('/login');
  }

  // Load categories server-side
  const { data: categoriesData, error } = await serviceClient
    .from('categories')
    .select(`
      *,
      category_specialties(
        specialty_id,
        specialty:specialties(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching categories:', error);
  }

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <CategoriesClient initialCategories={categoriesData || []} />
    </div>
  );
}
