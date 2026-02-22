'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function CompleteInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-marlon-green" />
        </div>
      }
    >
      <CompleteInvitationContent />
    </Suspense>
  );
}

function CompleteInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Session invalide. Veuillez demander une nouvelle invitation.');
            setPageLoading(false);
            return;
          }

          window.history.replaceState(
            null,
            '',
            window.location.pathname + (token ? `?token=${token}` : '')
          );
        }

        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          setError('Session expirée. Veuillez cliquer à nouveau sur le lien dans l\'email.');
          setPageLoading(false);
          return;
        }

        setUser(currentUser);

        if (currentUser.user_metadata?.first_name) {
          setFirstName(currentUser.user_metadata.first_name);
        }
        if (currentUser.user_metadata?.last_name) {
          setLastName(currentUser.user_metadata.last_name);
        }
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Une erreur est survenue');
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [accessToken, refreshToken, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { first_name: firstName, last_name: lastName },
      });

      if (updateError) throw updateError;

      const invitationToken = token || user?.user_metadata?.invitation_token;
      const res = await fetch('/api/auth/complete-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitationToken, firstName, lastName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la finalisation');

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 1500);
    } catch (err: any) {
      console.error('Error completing invitation:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-marlon-green" />
          <span className="text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <img src={LOGO_URL} alt="MARLON" className="h-12 w-auto" />
          </div>
          <div className="rounded-lg bg-[#F3F4F6] p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Icon icon="mdi:alert-circle" className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Lien expiré</h1>
            <p className="mb-6 text-sm text-gray-600">{error}</p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-marlon-green px-6 py-2.5 text-sm font-medium text-white hover:bg-[#00A870] transition-colors"
            >
              Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <img src={LOGO_URL} alt="MARLON" className="h-12 w-auto" />
          </div>
          <div className="rounded-lg bg-[#F3F4F6] p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Icon icon="mdi:check" className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Compte configuré !</h1>
            <p className="mb-4 text-sm text-gray-600">
              Bienvenue dans le back-office MARLON.
            </p>
            <p className="text-sm text-gray-500">Redirection vers le tableau de bord...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-12 flex justify-center">
          <img src={LOGO_URL} alt="MARLON" className="h-12 w-auto" />
        </div>

        <div className="rounded-lg bg-[#F3F4F6] p-8">
          <h1 className="mb-2 text-xl font-bold text-gray-900">Finalisez votre compte</h1>
          <p className="mb-6 text-sm text-gray-600">
            Configurez votre accès administrateur au back-office
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black">
                  Prénom
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black">
                  Nom
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 pr-10 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525C6B] hover:text-black"
                >
                  <Icon
                    icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 pr-10 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525C6B] hover:text-black"
                >
                  <Icon
                    icon={showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-marlon-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A870] focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50"
            >
              <Icon icon="mdi:shield-check" className="h-4 w-4" />
              {loading ? 'Configuration...' : 'Finaliser mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
