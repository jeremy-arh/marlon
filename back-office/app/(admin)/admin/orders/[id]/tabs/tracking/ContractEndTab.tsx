'use client';

import { useState } from 'react';
import Button from '@/components/Button';

interface ContractEndTabProps {
  orderId: string;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function ContractEndTab({ orderId, initialTracking, onUpdate }: ContractEndTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [endDate, setEndDate] = useState<string>(
    initialTracking?.contract_end_date 
      ? new Date(initialTracking.contract_end_date).toISOString().split('T')[0]
      : ''
  );

  const handleSave = async () => {
    if (!endDate) {
      setError('Veuillez sélectionner une date');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_end_date: endDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Appeler onUpdate pour rafraîchir les données
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-black mb-4">Fin de contrat</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">Date sauvegardée avec succès</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="endDate" className="mb-2 block text-sm font-medium text-black">
            Date de fin du contrat <span className="text-red-500">*</span>
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            required
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
            variant="primary"
          >
            {loading ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
