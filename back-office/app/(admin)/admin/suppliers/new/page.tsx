'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/suppliers', {
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

      router.push('/admin/suppliers');
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
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Ajouter un fournisseur</h1>
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
                Nom du fournisseur <span className="text-red-500">*</span>
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

            {/* Email */}
            <div>
              <label htmlFor="contact_email" className="mb-2 block text-sm font-medium text-black">
                Email de contact
              </label>
              <input
                id="contact_email"
                type="email"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="contact_phone" className="mb-2 block text-sm font-medium text-black">
                Téléphone de contact
              </label>
              <input
                id="contact_phone"
                type="tel"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="mb-2 block text-sm font-medium text-black">
                Adresse
              </label>
              <textarea
                id="address"
                rows={3}
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
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
              {loading ? 'Création...' : 'Créer le fournisseur'}
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
