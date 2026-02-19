'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button';

interface ContractEndTabProps {
  orderId: string;
  order?: any;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function ContractEndTab({ orderId, order, initialTracking, onUpdate }: ContractEndTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const durationMonths = order?.leasing_duration_months || 36;

  const [startDate, setStartDate] = useState<string>(
    initialTracking?.contract_start_date
      ? new Date(initialTracking.contract_start_date).toISOString().split('T')[0]
      : ''
  );

  const [endDate, setEndDate] = useState<string>(
    initialTracking?.contract_end_date
      ? new Date(initialTracking.contract_end_date).toISOString().split('T')[0]
      : ''
  );

  useEffect(() => {
    if (!startDate) {
      setEndDate('');
      return;
    }
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + durationMonths);
    setEndDate(start.toISOString().split('T')[0]);
  }, [startDate, durationMonths]);

  const handleSave = async () => {
    if (!startDate) {
      setError('Veuillez sélectionner une date de début');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_start_date: startDate,
          contract_end_date: endDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-black mb-4">Contrat</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">Dates sauvegardées avec succès</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="startDate" className="mb-2 block text-sm font-medium text-black">
            Date de début du contrat <span className="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            required
          />
        </div>

        <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Durée du contrat :</span>
            <span className="font-medium text-black">{durationMonths} mois</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">Date de fin du contrat :</span>
            <span className="font-medium text-black">
              {endDate ? formatDate(endDate) : '—'}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading || !startDate}
            variant="primary"
          >
            {loading ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
