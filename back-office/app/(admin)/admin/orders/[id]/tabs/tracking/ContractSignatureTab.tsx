'use client';

import { useState, useRef } from 'react';
import Button from '@/components/Button';
import Icon from '@/components/Icon';

interface ContractSignatureTabProps {
  orderId: string;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function ContractSignatureTab({ orderId, initialTracking, onUpdate }: ContractSignatureTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [taxLiasseUrl, setTaxLiasseUrl] = useState<string>(initialTracking?.tax_liasse_url || '');
  const [businessPlanUrl, setBusinessPlanUrl] = useState<string>(initialTracking?.business_plan_url || '');
  
  const taxLiasseInputRef = useRef<HTMLInputElement>(null);
  const businessPlanInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'tax' | 'business') => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const existingUrl = type === 'tax' ? taxLiasseUrl : businessPlanUrl;
      const filePath = existingUrl
        ? existingUrl.split('/').pop() || `orders/${orderId}/${type === 'tax' ? 'tax-liasse' : 'business-plan'}-${Date.now()}.${file.name.split('.').pop()}`
        : `orders/${orderId}/${type === 'tax' ? 'tax-liasse' : 'business-plan'}-${Date.now()}.${file.name.split('.').pop()}`;
      formData.append('path', filePath);
      formData.append('bucket', 'contracts');
      formData.append('upsert', existingUrl ? 'true' : 'false');

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      if (type === 'tax') {
        setTaxLiasseUrl(data.url);
      } else {
        setBusinessPlanUrl(data.url);
      }

      // Save to tracking
      await saveTracking(type === 'tax' ? { tax_liasse_url: data.url } : { business_plan_url: data.url });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const saveTracking = async (updates: any) => {
    const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erreur lors de la sauvegarde');
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    
    // Appeler onUpdate pour rafraîchir les données
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-black mb-4">Documents de signature</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">Document sauvegardé avec succès</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tax Liasse */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Liasse fiscale
          </label>
          <input
            ref={taxLiasseInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'tax');
            }}
            className="hidden"
          />
          {taxLiasseUrl ? (
            <div className="space-y-2">
              <div className="rounded-md border border-gray-200 p-4">
                <a
                  href={taxLiasseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-marlon-green hover:text-[#00A870]"
                >
                  <Icon icon="mdi:file-document" className="h-5 w-5" />
                  Voir la liasse fiscale
                </a>
              </div>
              <Button
                onClick={() => taxLiasseInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => taxLiasseInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Icon icon="mdi:upload" className="h-5 w-5" />
              Ajouter la liasse fiscale
            </Button>
          )}
        </div>

        {/* Business Plan */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Business plan
          </label>
          <input
            ref={businessPlanInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'business');
            }}
            className="hidden"
          />
          {businessPlanUrl ? (
            <div className="space-y-2">
              <div className="rounded-md border border-gray-200 p-4">
                <a
                  href={businessPlanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-marlon-green hover:text-[#00A870]"
                >
                  <Icon icon="mdi:file-document" className="h-5 w-5" />
                  Voir le business plan
                </a>
              </div>
              <Button
                onClick={() => businessPlanInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => businessPlanInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Icon icon="mdi:upload" className="h-5 w-5" />
              Ajouter le business plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
