'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-marlon-green" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
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
            setError('Session invalide ou expirée. Veuillez refaire une demande de réinitialisation.');
            setPageLoading(false);
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
        }

        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const at = hashParams.get('access_token');
          const rt = hashParams.get('refresh_token');
          if (at) {
            await supabase.auth.setSession({
              access_token: at,
              refresh_token: rt || '',
            });
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Session expirée. Veuillez refaire une demande de réinitialisation.');
          setPageLoading(false);
          return;
        }

        setSessionReady(true);
      } catch {
        setError('Une erreur est survenue');
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [accessToken, refreshToken]);

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
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 2000);
    } catch (err: any) {
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

  if (error && !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <img src={LOGO_URL} alt="MARLON" className="h-12 w-auto" />
          </div>
          <div className="rounded-lg bg-[#F3F4F6] p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <Icon icon="mdi:alert-circle" className="h-7 w-7 text-red-600" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Lien expiré</h2>
            <p className="mb-6 text-sm text-[#525C6B]">{error}</p>
            <a
              href="/forgot-password"
              className="inline-flex items-center gap-2 rounded-md bg-marlon-green px-6 py-2.5 text-sm font-medium text-white hover:bg-[#00A870] transition-colors"
            >
              Nouvelle demande
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Icon icon="mdi:check" className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Mot de passe modifié</h2>
            <p className="text-sm text-[#525C6B]">Redirection vers le tableau de bord...</p>
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
          <h2 className="mb-2 text-lg font-bold text-black">
            Nouveau mot de passe
          </h2>
          <p className="mb-6 text-sm text-[#525C6B]">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-black"
              >
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Min. 6 caractères"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 pr-10 text-sm text-black placeholder-[#525C6B] focus:border-[#525C6B] focus:outline-none focus:ring-1 focus:ring-[#525C6B]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-black"
              >
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 pr-10 text-sm text-black placeholder-[#525C6B] focus:border-[#525C6B] focus:outline-none focus:ring-1 focus:ring-[#525C6B]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-marlon-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A870] focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50"
            >
              <Icon icon="mdi:lock-reset" className="h-4 w-4" />
              {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
            </button>

            <div className="text-center">
              <a
                href="/login"
                className="text-sm text-[#525C6B] hover:text-black"
              >
                ← Retour à la connexion
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
