import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LOGO_URL } from '@/lib/constants';
import NavLink from '@/components/NavLink';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/catalog">
            <img
              src={LOGO_URL}
              alt="MARLON"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-6">
            <NavLink href="/catalog" icon="mdi:store">
              Catalogue
            </NavLink>
            <NavLink href="/orders" icon="mdi:clipboard-list">
              Commandes
            </NavLink>
            <NavLink href="/account" icon="mdi:account">
              Mon compte
            </NavLink>
            <NavLink href="/api/auth/signout" icon="mdi:logout">
              Déconnexion
            </NavLink>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
