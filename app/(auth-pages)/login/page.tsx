'use client';

import { useState } from 'react';
import { signIn } from '@/lib/utils/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon';

const ILLUSTRATION_URL = 'https://qdnwppnrqpiquxboskos.supabase.co/storage/v1/object/public/static-assets/connection%201.svg';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const redirect = searchParams.get('redirect') || '/catalog';
      router.push(redirect);
      router.refresh();
    }
  };

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
                alt="Connexion"
                className="w-full max-w-[280px] h-auto"
              />
            </div>

            {/* Section formulaire - droite (scrollable) */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-8">
                Connectez-vous à votre compte
              </h1>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email professionnel
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className="block w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="••••••••"
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

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-marlon-green focus:ring-marlon-green accent-marlon-green"
                  />
                  <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">
                    Se souvenir de moi
                  </label>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  En soumettant ce formulaire, je confirme que que j'ai lu la{' '}
                  <Link href="/privacy" className="text-marlon-green hover:underline">
                    politique de confidentialité
                  </Link>{' '}
                  et que j'accepte le traitement de mes données personnelles par Marlon.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-marlon-green text-white font-medium rounded-lg hover:bg-marlon-green/90 focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>

              <div className="mt-6 space-y-2 text-center">
                <p className="text-sm text-gray-600">
                  Vous n'avez pas de compte ?{' '}
                  <Link
                    href="/register"
                    className="text-marlon-green hover:underline font-medium"
                  >
                    Créer un compte.
                  </Link>
                </p>
                <p className="text-sm text-gray-600">
                  Vous avez oublié votre mot de passe ?{' '}
                  <Link
                    href="/forgot-password"
                    className="text-marlon-green hover:underline font-medium"
                  >
                    Réinitialisez le en cliquant ici.
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
