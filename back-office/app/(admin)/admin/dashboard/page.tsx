import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon';

export default async function AdminDashboardPage() {
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
    redirect('/login?error=Access denied');
  }

  // Get stats via service client (bypass RLS) pour que tous les SA voient les comptes globaux
  const { count: ordersCount } = await serviceClient
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: organizationsCount } = await serviceClient
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  const { count: productsCount } = await serviceClient
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: pendingOrdersCount } = await serviceClient
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="mb-6 lg:mb-8 text-2xl lg:text-3xl font-bold text-black">Tableau de bord</h1>

      {/* Stats Cards */}
      <div className="mb-6 lg:mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Commandes totales</h3>
            <Icon icon="mdi:clipboard-list" className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-black">{ordersCount || 0}</p>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">En attente</h3>
            <Icon icon="mdi:clock-outline" className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{pendingOrdersCount || 0}</p>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Organisations</h3>
            <Icon icon="mdi:account-group" className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-black">{organizationsCount || 0}</p>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Produits</h3>
            <Icon icon="mdi:package-variant" className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-black">{productsCount || 0}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/orders"
          className="rounded-lg bg-white border border-gray-200 p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-3">
            <Icon icon="mdi:clipboard-list" className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-black">Gestion des commandes</h2>
          </div>
          <p className="text-sm text-gray-600">
            Voir et gérer toutes les commandes
          </p>
        </Link>

        <Link
          href="/admin/products"
          className="rounded-lg bg-white border border-gray-200 p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-3">
            <Icon icon="mdi:package-variant" className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-black">Gestion du catalogue</h2>
          </div>
          <p className="text-sm text-gray-600">
            Produits, catégories, marques
          </p>
        </Link>

        <Link
          href="/admin/customers"
          className="rounded-lg bg-white border border-gray-200 p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-3">
            <Icon icon="mdi:account-group" className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-black">Gestion des clients</h2>
          </div>
          <p className="text-sm text-gray-600">
            Organisations et utilisateurs
          </p>
        </Link>

        <Link
          href="/admin/leasers"
          className="rounded-lg bg-white border border-gray-200 p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-3">
            <Icon icon="mdi:handshake" className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-black">Gestion des leasers</h2>
          </div>
          <p className="text-sm text-gray-600">
            Leasers et coefficients
          </p>
        </Link>

        <Link
          href="/admin/suppliers"
          className="rounded-lg bg-white border border-gray-200 p-6 transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-3">
            <Icon icon="mdi:truck-delivery" className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-black">Gestion des fournisseurs</h2>
          </div>
          <p className="text-sm text-gray-600">
            Fournisseurs partenaires
          </p>
        </Link>
      </div>
    </div>
  );
}
