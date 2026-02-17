'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import Icon from '@/components/Icon';

const ILLUSTRATION_URL = 'https://qdnwppnrqpiquxboskos.supabase.co/storage/v1/object/public/static-assets/intro-removebg-preview%201.svg';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  employee: 'Employé',
};

interface InvitationData {
  id: string;
  organization_id: string;
  role: string;
  is_super_admin?: boolean;
  organizations: {
    name: string;
  };
}

export default function CompleteInvitationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-marlon-green" /></div>}>
      <CompleteInvitationContent />
    </Suspense>
  );
}

function CompleteInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Method 1: Verify using token_hash (most reliable)
        if (tokenHash && type === 'invite') {
          console.log('Verifying with token_hash...');
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'invite',
          });

          if (verifyError) {
            console.error('Verify error:', verifyError);
            setError('Le lien d\'invitation a expiré ou est invalide. Veuillez demander une nouvelle invitation.');
            setPageLoading(false);
            return;
          }

          if (verifyData.session) {
            // Clear URL params
            window.history.replaceState(null, '', window.location.pathname + (token ? `?token=${token}` : ''));
          }
        }
        
        // Method 2: Check hash tokens (fallback)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken) {
            console.log('Setting session from hash tokens...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              setError('Erreur lors de l\'authentification. Le lien a peut-être expiré. Veuillez demander une nouvelle invitation.');
              setPageLoading(false);
              return;
            }

            if (sessionData.session) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
        }

        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          setError('Session expirée. Veuillez cliquer à nouveau sur le lien dans l\'email.');
          setPageLoading(false);
          return;
        }

        setUser(currentUser);

        // Pre-fill names if available from user metadata
        if (currentUser.user_metadata?.first_name) {
          setFirstName(currentUser.user_metadata.first_name);
        }
        if (currentUser.user_metadata?.last_name) {
          setLastName(currentUser.user_metadata.last_name);
        }

        // Get invitation token from various sources
        const invitationToken = token || currentUser.user_metadata?.invitation_token;
        let foundInvitation = null;

        if (invitationToken) {
          const { data: inviteData, error: inviteError } = await supabase
            .from('user_invitations')
            .select('*, organizations(name)')
            .eq('token', invitationToken)
            .single();

          if (!inviteError && inviteData) {
            foundInvitation = inviteData;
          }
        }

        // If no invitation found by token, try to find by email
        if (!foundInvitation && currentUser.email) {
          const { data: emailInvite } = await supabase
            .from('user_invitations')
            .select('*, organizations(name)')
            .eq('email', currentUser.email.toLowerCase())
            .is('accepted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (emailInvite) {
            foundInvitation = emailInvite;
          }
        }

        if (foundInvitation) {
          setInvitation(foundInvitation);
        } else {
          // No invitation found but user is authenticated - might be a regular user
          // Check if they already have a role somewhere
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', currentUser.id)
            .single();

          if (existingRole) {
            // User already has an organization, redirect to catalog
            router.push('/catalog');
            return;
          }
        }
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Une erreur est survenue');
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const invitationToken = token || user?.user_metadata?.invitation_token;
    if (!invitationToken && !user?.email) {
      setError('Invitation introuvable');
      return;
    }

    setLoading(true);

    try {
      // Update user password and metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (updateError) {
        throw updateError;
      }

      // Créer le rôle via l'API (service client) pour garantir is_super_admin dans user_roles
      const res = await fetch('/api/auth/complete-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: invitationToken,
          firstName,
          lastName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la finalisation');
      }

      setSuccess(true);

      // Rediriger les super admins vers le back-office (pas l'app)
      const isSuperAdmin = data.is_super_admin ?? invitation?.is_super_admin ?? user?.user_metadata?.is_super_admin;
      const boUrl = process.env.NEXT_PUBLIC_BO_URL || 'http://localhost:3001';
      const redirectUrl = isSuperAdmin ? `${boUrl}/admin/dashboard` : '/catalog';

      setTimeout(() => {
        if (isSuperAdmin) {
          window.location.replace(redirectUrl);
        } else {
          router.push(redirectUrl);
          router.refresh();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Error completing invitation:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-marlon-green" />
          <span className="text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="mdi:alert-circle" className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien expiré</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Les liens d'invitation expirent après quelques minutes pour des raisons de sécurité. 
            Contactez votre administrateur pour recevoir une nouvelle invitation.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="mdi:check" className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Compte configuré !</h1>
          <p className="text-gray-600 mb-4">
            Bienvenue chez {invitation?.organizations?.name}
            {(invitation?.is_super_admin || user?.user_metadata?.is_super_admin) && (
              <>
                {' — Vous serez redirigé vers le back-office. '}
                <a href={`${process.env.NEXT_PUBLIC_BO_URL || 'http://localhost:3001'}/admin/dashboard`} className="text-marlon-green underline font-medium">
                  Cliquez ici si la redirection ne fonctionne pas.
                </a>
              </>
            )}
          </p>
          <p className="text-sm text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-4xl mx-auto h-full max-h-[calc(100vh-120px)]">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Section illustration - gauche */}
            <div className="hidden md:flex md:w-2/5 items-center justify-center p-8 bg-gray-50 flex-shrink-0">
              <div className="text-center">
                <img
                  src={ILLUSTRATION_URL}
                  alt="Bienvenue"
                  className="w-full max-w-[280px] h-auto mx-auto mb-6"
                />
                {invitation && (
                  <div className="bg-white/80 backdrop-blur rounded-xl p-4 mx-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-900">
                      Vous rejoignez
                    </p>
                    <p className="text-lg font-bold text-marlon-green">
                      {invitation.organizations?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      en tant que {invitation.is_super_admin ? 'Super administrateur' : ROLE_LABELS[invitation.role || 'user']}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section formulaire - droite */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Finalisez votre compte
              </h1>
              <p className="text-gray-600 mb-8">
                Définissez votre mot de passe pour accéder à votre espace
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Email (disabled) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email professionnel
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                {/* Prénom et Nom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prénom
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                      className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Mot de passe et Confirmation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                        className="block w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                        className="block w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Icon
                          icon={showConfirmPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                          className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checkbox conditions */}
                <div className="flex items-start">
                  <input
                    id="accept-terms"
                    name="accept-terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-marlon-green focus:ring-marlon-green accent-marlon-green"
                  />
                  <label htmlFor="accept-terms" className="ml-2 text-xs text-gray-500 leading-relaxed">
                    En soumettant ce formulaire, je confirme que j'ai lu la{' '}
                    <Link href="/privacy" className="text-marlon-green hover:underline">
                      politique de confidentialité
                    </Link>{' '}
                    et que j'accepte le traitement de mes données personnelles par Marlon.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-marlon-green text-white font-medium rounded-lg hover:bg-marlon-green/90 focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Configuration...' : 'Finaliser mon compte'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
