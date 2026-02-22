'use client';

import { useState, useEffect } from 'react';
import { updatePassword } from '@/lib/utils/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { supabase } from '@/lib/supabase/client';

const ILLUSTRATION_URL = 'https://qdnwppnrqpiquxboskos.supabase.co/storage/v1/object/public/static-assets/connection%201.svg';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  // Fallback: si l'utilisateur arrive avec un hash (ancien lien email), traiter les tokens ici
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' }).then(() => {
          window.history.replaceState(null, '', window.location.pathname);
          setSessionReady(true);
        });
        return;
      }
    }
    setSessionReady(true);
  }, []);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/catalog');
      router.refresh();
    }
  };

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-4xl mx-auto h-full max-h-[calc(100vh-120px)]">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Section illustration - gauche */}
            <div className="hidden md:flex md:w-2/5 items-center justify-center p-8 bg-gray-50 flex-shrink-0">
              <img
                src={ILLUSTRATION_URL}
                alt="Nouveau mot de passe"
                className="w-full max-w-[280px] h-auto"
              />
            </div>

            {/* Section formulaire - droite (scrollable) */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Nouveau mot de passe
              </h1>
              <p className="text-gray-600 mb-8">
                Créez un nouveau mot de passe sécurisé pour votre compte.
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className="block w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="Min. 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <Icon
                        icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                        className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className="block w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <Icon
                        icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                        className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-marlon-green text-white font-medium rounded-lg hover:bg-marlon-green/90 focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-marlon-green hover:underline font-medium"
                >
                  ← Retour à la connexion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
