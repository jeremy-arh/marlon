'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('MARLON Administration');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(false);

  useEffect(() => {
    // Check if super admin already exists
    fetch('/api/admin/check-super-admin')
      .then((res) => res.json())
      .then((data) => {
        setSuperAdminExists(data.exists);
        setChecking(false);
      })
      .catch(() => {
        setChecking(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création');
        setLoading(false);
        return;
      }

      // Redirect to login
      router.push('/login?message=Super admin créé avec succès');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center text-black">Vérification...</div>
      </div>
    );
  }

  if (superAdminExists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md text-center">
          <p className="mb-4 text-black">
            Un super admin existe déjà. Veuillez vous connecter.
          </p>
          <a
            href="/login"
            className="text-[#525C6B] hover:text-black"
          >
            Aller à la page de connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-12 flex justify-center">
          <img
            src={LOGO_URL}
            alt="MARLON"
            className="h-12 w-auto"
          />
        </div>

        {/* Setup Card */}
        <div className="modal group rounded-lg bg-[#F3F4F6] p-8">
          <h2 className="mb-2 text-center text-lg font-semibold text-black">
            Configuration initiale
          </h2>
          <p className="mb-8 text-center text-sm text-black">
            Créez le premier compte administrateur
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div>
              <label
                htmlFor="organizationName"
                className="mb-2 block text-sm font-medium text-black"
              >
                Nom de l&apos;organisation
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-[#525C6B] focus:outline-none focus:ring-1 focus:ring-[#525C6B]"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-black"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@marlon.fr"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-[#525C6B] focus:outline-none focus:ring-1 focus:ring-[#525C6B]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-black"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-[#525C6B] focus:outline-none focus:ring-1 focus:ring-[#525C6B]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Create Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-marlon-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A870] focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50"
            >
              <Icon icon="mdi:account-plus" className="h-4 w-4" />
              {loading ? 'Création...' : 'Créer le super admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
