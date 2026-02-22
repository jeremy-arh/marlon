'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Force a hard redirect to ensure middleware runs
      window.location.href = '/admin/dashboard';
    }
  };

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

        {/* Login Card */}
        <div className="modal group rounded-lg bg-[#F3F4F6] p-8">
          {/* Instruction Text */}
          <p className="mb-8 text-center text-sm text-black">
            Connectez-vous pour gérer la plateforme
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
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

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-marlon-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A870] focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50"
            >
              <Icon icon="mdi:lock" className="h-4 w-4" />
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            {/* Back Link */}
            <div className="text-center">
              <a
                href="/"
                className="text-sm text-[#525C6B] hover:text-black"
              >
                ← Retour au site
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
