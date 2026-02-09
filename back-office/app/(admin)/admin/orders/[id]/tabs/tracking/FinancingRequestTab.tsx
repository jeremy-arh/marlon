'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';
import Icon from '@/components/Icon';

interface FinancingRequestTabProps {
  orderId: string;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function FinancingRequestTab({ orderId, initialTracking, onUpdate }: FinancingRequestTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<string>(initialTracking?.financing_status || 'pending');

  const statusOptions = [
    { value: 'pending', label: 'En attente' },
    { value: 'validated', label: 'Validé' },
    { value: 'rejected', label: 'Non validé' },
  ];

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financing_status: status }),
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

  const renderDocumentLink = (url: string | null | undefined, label: string) => {
    if (!url) {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <Icon icon="mdi:file-document-outline" className="h-5 w-5" />
          <span>{label}</span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Non fourni</span>
        </div>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-marlon-green hover:text-marlon-green/80 transition-colors"
      >
        <Icon icon="mdi:file-document" className="h-5 w-5" />
        <span>{label}</span>
        <Icon icon="mdi:open-in-new" className="h-4 w-4" />
      </a>
    );
  };

  return (
    <div className="space-y-6">
      {/* Documents du client */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Documents fournis par le client</h3>
        
        <div className="space-y-4">
          {/* Pièce d&apos;identité */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pièce d&apos;identité</h4>
            <div className="space-y-2 pl-4">
              {renderDocumentLink(initialTracking?.identity_card_front_url, 'Recto')}
              {renderDocumentLink(initialTracking?.identity_card_back_url, 'Verso')}
            </div>
          </div>

          {/* Liasse fiscale */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Documents financiers</h4>
            <div className="space-y-2 pl-4">
              {renderDocumentLink(initialTracking?.tax_liasse_url, 'Liasse fiscale / Bilan comptable')}
              {renderDocumentLink(initialTracking?.business_plan_url, 'Business plan')}
            </div>
          </div>
        </div>
      </div>

      {/* Statut de financement */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Statut de la demande de financement</h3>

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
    </div>
  );
}
