'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';

interface ContractInProgressTabProps {
  orderId: string;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function ContractInProgressTab({ orderId, initialTracking, onUpdate }: ContractInProgressTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<string>(initialTracking?.contract_status || 'pending');

  const statusOptions = [
    { value: 'pending', label: 'En attente' },
    { value: 'signing', label: 'En signature' },
    { value: 'signed', label: 'Signé' },
  ];

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_status: status }),
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
      <h3 className="text-lg font-semibold text-black mb-4">Statut du contrat en cours</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">Statut sauvegardé avec succès</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Statut <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value)}
            placeholder="Sélectionner un statut"
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
