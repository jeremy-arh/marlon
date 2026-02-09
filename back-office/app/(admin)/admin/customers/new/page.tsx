'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    siret: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'FR',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création');
        setLoading(false);
        return;
      }

      router.push('/admin/customers');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Icon icon="mdi:arrow-left" className="h-5 w-5" />
          Retour
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Ajouter un client</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-black">
                Nom de l&apos;organisation <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* SIRET */}
            <div>
              <label htmlFor="siret" className="mb-2 block text-sm font-medium text-black">
                SIRET
              </label>
              <input
                id="siret"
                type="text"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.siret}
                onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-black">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-black">
                Téléphone
              </label>
              <input
                id="phone"
                type="tel"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="mb-2 block text-sm font-medium text-black">
                Adresse
              </label>
              <input
                id="address"
                type="text"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="postal_code" className="mb-2 block text-sm font-medium text-black">
                  Code postal
                </label>
                <input
                  id="postal_code"
                  type="text"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="city" className="mb-2 block text-sm font-medium text-black">
                  Ville
                </label>
                <input
                  id="city"
                  type="text"
                  className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="mb-2 block text-sm font-medium text-black">
                Pays
              </label>
              <select
                id="country"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              disabled={loading}
              icon="mdi:check"
              variant="primary"
              className="w-full sm:w-auto"
            >
              {loading ? 'Création...' : 'Créer le client'}
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
