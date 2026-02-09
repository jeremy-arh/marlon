'use client';

import { useState, useRef } from 'react';
import Button from '@/components/Button';
import Icon from '@/components/Icon';

interface SignedContractTabProps {
  orderId: string;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function SignedContractTab({ orderId, initialTracking, onUpdate }: SignedContractTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [contractUrl, setContractUrl] = useState<string>(initialTracking?.signed_contract_url || '');
  const [contractNumber, setContractNumber] = useState<string>(initialTracking?.contract_number || '');
  const [docusignLink, setDocusignLink] = useState<string>(initialTracking?.docusign_link || '');
  
  const contractInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const filePath = contractUrl
        ? contractUrl.split('/').pop() || `orders/${orderId}/signed-contract-${Date.now()}.${file.name.split('.').pop()}`
        : `orders/${orderId}/signed-contract-${Date.now()}.${file.name.split('.').pop()}`;
      formData.append('path', filePath);
      formData.append('bucket', 'contracts');
      formData.append('upsert', contractUrl ? 'true' : 'false');

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      setContractUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_contract_url: contractUrl,
          contract_number: contractNumber,
          docusign_link: docusignLink,
        }),
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
      <h3 className="text-lg font-semibold text-black mb-4">Contrat signé</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">Informations sauvegardées avec succès</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Contract File */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Contrat signé
          </label>
          <input
            ref={contractInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
          {contractUrl ? (
            <div className="space-y-2">
              <div className="rounded-md border border-gray-200 p-4">
                <a
                  href={contractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-marlon-green hover:text-[#00A870]"
                >
                  <Icon icon="mdi:file-document" className="h-5 w-5" />
                  Voir le contrat signé
                </a>
              </div>
              <Button
                onClick={() => contractInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => contractInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Icon icon="mdi:upload" className="h-5 w-5" />
              Ajouter le contrat signé
            </Button>
          )}
        </div>

        {/* Contract Number */}
        <div>
          <label htmlFor="contractNumber" className="mb-2 block text-sm font-medium text-black">
            Numéro de contrat
          </label>
          <input
            id="contractNumber"
            type="text"
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            placeholder="Entrez le numéro de contrat"
          />
        </div>

        {/* DocuSign Link */}
        <div>
          <label htmlFor="docusignLink" className="mb-2 block text-sm font-medium text-black">
            Lien DocuSign
          </label>
          <input
            id="docusignLink"
            type="url"
            value={docusignLink}
            onChange={(e) => setDocusignLink(e.target.value)}
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            placeholder="https://..."
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
