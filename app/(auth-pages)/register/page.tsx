'use client';

import { useState, useEffect } from 'react';
import { signUp } from '@/lib/utils/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon';

const ILLUSTRATION_URL = 'https://qdnwppnrqpiquxboskos.supabase.co/storage/v1/object/public/static-assets/intro-removebg-preview%201.svg';

interface Specialty {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await fetch('/api/specialties');
        const data = await response.json();
        if (data.specialties) {
          setSpecialties(data.specialties);
        }
      } catch (error) {
        console.error('Error fetching specialties:', error);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    fetchSpecialties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation des champs obligatoires
    if (!firstName?.trim()) {
      setError('Le prénom est requis');
      return;
    }
    if (!lastName?.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!email?.trim()) {
      setError("L'email est requis");
      return;
    }
    if (!phone?.trim()) {
      setError('Le téléphone est requis');
      return;
    }
    if (!profession?.trim()) {
      setError('La spécialité est requise');
      return;
    }
    if (!organizationName?.trim()) {
      setError("Le nom de l'organisation est requis");
      return;
    }
    if (!acceptTerms) {
      setError('Vous devez accepter la politique de confidentialité');
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

    setLoading(true);

    const { error } = await signUp({
      email,
      password,
      organizationName,
      firstName,
      lastName,
      phone,
      profession,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/catalog');
      router.refresh();
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-5xl mx-auto h-full max-h-[calc(100vh-120px)]">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Section illustration - gauche */}
            <div className="hidden md:flex md:w-2/5 items-center justify-center p-8 bg-gray-50 flex-shrink-0">
              <img
                src={ILLUSTRATION_URL}
                alt="Inscription"
                className="w-full max-w-[320px] h-auto"
              />
            </div>

            {/* Section formulaire - droite (scrollable) */}
            <div className="flex-1 p-8 md:p-10 overflow-y-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Créez votre compte
              </h1>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Nom et Prénom sur la même ligne */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="Dupont"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Numéro de téléphone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Numéro de téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="06 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {/* Spécialité (dropdown) */}
                <div>
                  <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Spécialité <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="profession"
                      name="profession"
                      required
                      className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 appearance-none bg-white"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      disabled={loadingSpecialties}
                    >
                      <option value="">
                        {loadingSpecialties ? 'Chargement...' : 'Sélectionnez votre spécialité'}
                      </option>
                      {specialties.map((specialty) => (
                        <option key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Icon icon="mdi:chevron-down" className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Nom de l'organisation */}
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom de l'organisation
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-marlon-green focus:ring-1 focus:ring-marlon-green transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="Votre cabinet / clinique"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email professionnel <span className="text-red-500">*</span>
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

                {/* Mot de passe et Confirmation sur la même ligne */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mot de passe
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
                      Confirmer
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
                </div>

                {/* Checkbox conditions */}
                <div className="flex items-start">
                  <input
                    id="accept-terms"
                    name="accept-terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-gray-300 text-marlon-green focus:ring-marlon-green accent-marlon-green"
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
                  {loading ? 'Inscription...' : "S'inscrire"}
                </button>
              </form>

              <div className="mt-6 text-center pb-2">
                <p className="text-sm text-gray-600">
                  Déjà un compte ?{' '}
                  <Link
                    href="/login"
                    className="text-marlon-green hover:underline font-medium"
                  >
                    Se connecter.
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
