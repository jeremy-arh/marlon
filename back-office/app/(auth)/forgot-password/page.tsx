'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.marlon.fr';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?source=bo`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-12 flex justify-center">
          <img src={LOGO_URL} alt="MARLON" className="h-12 w-auto" />
        </div>

        <div className="rounded-lg bg-[#F3F4F6] p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Icon icon="mdi:email-check" className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="mb-2 text-lg font-bold text-black">Email envoyé</h2>
              <p className="mb-6 text-sm text-[#525C6B]">
                Si un compte existe avec l'adresse <strong className="text-black">{email}</strong>,
                vous recevrez un lien de réinitialisation dans quelques instants.
              </p>
              <a
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-marlon-green hover:underline"
              >
                <Icon icon="mdi:arrow-left" className="h-4 w-4" />
                Retour à la connexion
              </a>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-bold text-black">
                Mot de passe oublié
              </h2>
              <p className="mb-6 text-sm text-[#525C6B]">
                Entrez votre adresse email pour recevoir un lien de réinitialisation.
              </p>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-black"
                  >
                    Adresse email
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

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-marlon-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A870] focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50"
                >
                  <Icon icon="mdi:email-fast" className="h-4 w-4" />
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
