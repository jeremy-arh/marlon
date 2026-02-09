'use client';

import { useState } from 'react';
import { resetPassword } from '@/lib/utils/auth';
import Link from 'next/link';

const ILLUSTRATION_URL = 'https://qdnwppnrqpiquxboskos.supabase.co/storage/v1/object/public/static-assets/connection%201.svg';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
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
                alt="Réinitialisation"
                className="w-full max-w-[280px] h-auto"
              />
            </div>

            {/* Section formulaire - droite (scrollable) */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Mot de passe oublié
              </h1>
              <p className="text-gray-600 mb-8">
                Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {success ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <p className="text-sm font-medium text-green-800">Email envoyé !</p>
                    <p className="text-sm text-green-700 mt-1">
                      Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
                    </p>
                  </div>
                ) : (
                  <>
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

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-marlon-green text-white font-medium rounded-lg hover:bg-marlon-green/90 focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                    </button>
                  </>
                )}
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
