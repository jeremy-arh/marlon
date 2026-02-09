'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Icon from '@/components/Icon';
import Link from 'next/link';
import { LOGO_URL } from '@/lib/constants';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash from URL (Supabase sends tokens in hash)
        const hash = window.location.hash;
        
        if (hash) {
          // Parse the hash to get access_token and other params
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken) {
            // Set the session using the tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              setError('Erreur lors de l\'authentification');
              setLoading(false);
              return;
            }

            if (data.user) {
              // Check if this is an invite (user has invitation_token in metadata)
              const invitationToken = data.user.user_metadata?.invitation_token;
              
              if (type === 'invite' || invitationToken) {
                // Redirect to complete invitation page
                router.push(`/complete-invitation?token=${invitationToken || ''}`);
                return;
              }

              // Check if user needs to complete their profile
              if (type === 'recovery') {
                router.push('/reset-password');
                return;
              }

              // Regular login - go to catalog
              router.push('/catalog');
              return;
            }
          }
        }

        // Check for code in query params (PKCE flow)
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError('Erreur lors de l\'authentification');
            setLoading(false);
            return;
          }
          
          // Get the invitation token from query params
          const invitationToken = searchParams.get('invitation_token');
          if (invitationToken) {
            router.push(`/complete-invitation?token=${invitationToken}`);
            return;
          }
          
          router.push('/catalog');
          return;
        }

        // No valid auth data found
        setError('Lien invalide ou expiré');
        setLoading(false);
      } catch (err) {
        console.error('Callback error:', err);
        setError('Une erreur est survenue');
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <Link href="/catalog">
            <img src={LOGO_URL} alt="Marlon" className="h-8" />
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green mx-auto mb-4" />
            <p className="text-gray-600">Authentification en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <Link href="/catalog">
            <img src={LOGO_URL} alt="Marlon" className="h-8" />
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:alert-circle" className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Erreur</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
