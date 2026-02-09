import Link from 'next/link';
import { LOGO_URL } from '@/lib/constants';

export default function AuthPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden bg-[#F9FAFB] flex flex-col">
      {/* Header avec logo */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/catalog" className="flex items-center">
            <img
              src={LOGO_URL}
              alt="MARLON"
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 overflow-hidden px-4 py-6">
        {children}
      </main>
    </div>
  );
}
