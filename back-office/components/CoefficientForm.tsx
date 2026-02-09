'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';

interface CoefficientFormProps {
  leaserId: string;
  coefficient?: any;
  durations: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CoefficientForm({
  leaserId,
  coefficient,
  durations,
  onSuccess,
  onCancel,
}: CoefficientFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    duration_id: coefficient?.duration_id || '',
    min_amount: coefficient?.min_amount?.toString() || '',
    max_amount: coefficient?.max_amount?.toString() || '',
    coefficient: coefficient?.coefficient?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = coefficient
        ? `/api/admin/leaser-coefficients/${coefficient.id}`
        : '/api/admin/leaser-coefficients';
      const method = coefficient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaser_id: leaserId,
          duration_id: formData.duration_id,
          min_amount: parseFloat(formData.min_amount),
          max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
          coefficient: parseFloat(formData.coefficient),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        setLoading(false);
        return;
      }

      // Reset form for mass creation
      if (!coefficient) {
        setSuccessMessage('Coefficient créé avec succès !');
        setFormData({
          duration_id: '',
          min_amount: '',
          max_amount: '',
          coefficient: '',
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
          <label htmlFor="duration_id" className="mb-2 block text-sm font-medium text-black">
            Durée de leasing <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={durations.map((duration) => ({
              value: duration.id,
              label: `${duration.months} mois`,
            }))}
            value={formData.duration_id}
            onChange={(value) => setFormData({ ...formData, duration_id: value })}
            placeholder="Sélectionner une durée"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="min_amount" className="mb-2 block text-sm font-medium text-black">
              Montant minimum (€) <span className="text-red-500">*</span>
            </label>
            <input
              id="min_amount"
              type="number"
              step="0.01"
              required
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              value={formData.min_amount}
              onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="max_amount" className="mb-2 block text-sm font-medium text-black">
              Montant maximum (€)
              <span className="ml-1 text-xs text-gray-500">(laisser vide pour ∞)</span>
            </label>
            <input
              id="max_amount"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              value={formData.max_amount}
              onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
              placeholder="Infini si vide"
            />
          </div>
        </div>

        <div>
          <label htmlFor="coefficient" className="mb-2 block text-sm font-medium text-black">
            Coefficient <span className="text-red-500">*</span>
          </label>
          <input
            id="coefficient"
            type="number"
            step="0.0001"
            required
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            value={formData.coefficient}
            onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
            placeholder="Ex: 1.2500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Le coefficient sera appliqué au calcul du prix de leasing
          </p>
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
          {loading ? 'Sauvegarde...' : coefficient ? 'Modifier' : 'Créer'}
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
