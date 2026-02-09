'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';

interface CustomerFormProps {
  customer?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    siret: customer?.siret || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    postal_code: customer?.postal_code || '',
    country: customer?.country || 'FR',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = customer ? `/api/admin/customers/${customer.id}` : '/api/admin/customers';
      const method = customer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        setLoading(false);
        return;
      }

      // Reset form for mass creation
      if (!customer) {
        setSuccessMessage('Client créé avec succès !');
        setFormData({
          name: '',
          siret: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          postal_code: '',
          country: 'FR',
        });
        setError(null);
        setLoading(false);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Keep modal open for mass creation
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

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

        <div>
          <label htmlFor="country" className="mb-2 block text-sm font-medium text-black">
            Pays
          </label>
          <SearchableSelect
            options={[
              { value: 'FR', label: 'France' },
              { value: 'BE', label: 'Belgique' },
              { value: 'CH', label: 'Suisse' },
            ]}
            value={formData.country}
            onChange={(value) => setFormData({ ...formData, country: value })}
            placeholder="Sélectionner un pays"
          />
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-col sm:flex-row gap-4 border-t border-gray-200 bg-white pt-6 -mx-6 px-6">
        <Button
          type="submit"
          disabled={loading}
          icon="mdi:check"
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? 'Sauvegarde...' : customer ? 'Modifier' : 'Créer'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
