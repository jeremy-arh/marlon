'use client';

import { useState } from 'react';
import Button from '@/components/Button';

interface LeaserFormProps {
  leaser?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LeaserForm({ leaser, onSuccess, onCancel }: LeaserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: leaser?.name || '',
    contact_email: leaser?.contact_email || '',
    contact_phone: leaser?.contact_phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = leaser ? `/api/admin/leasers/${leaser.id}` : '/api/admin/leasers';
      const method = leaser ? 'PUT' : 'POST';

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
      if (!leaser) {
        setSuccessMessage('Leaser créé avec succès !');
        setFormData({
          name: '',
          contact_email: '',
          contact_phone: '',
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
            Nom du leaser <span className="text-red-500">*</span>
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
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-col sm:flex-row gap-4 border-t border-gray-200 bg-white pt-6 -mx-6 px-6">
        <Button
          type="submit"
          disabled={loading}
          icon="mdi:check"
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? 'Sauvegarde...' : leaser ? 'Modifier' : 'Créer'}
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
