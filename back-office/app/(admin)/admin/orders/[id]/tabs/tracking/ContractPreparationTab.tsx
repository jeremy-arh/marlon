'use client';

import { useState, useRef } from 'react';
import Button from '@/components/Button';
import Icon from '@/components/Icon';

interface ContractPreparationTabProps {
  orderId: string;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function ContractPreparationTab({ orderId, initialTracking, onUpdate }: ContractPreparationTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [frontUrl, setFrontUrl] = useState<string>(initialTracking?.identity_card_front_url || '');
  const [backUrl, setBackUrl] = useState<string>(initialTracking?.identity_card_back_url || '');
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'front' | 'back') => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const existingUrl = type === 'front' ? frontUrl : backUrl;
      const filePath = existingUrl 
        ? existingUrl.split('/').pop() || `orders/${orderId}/identity-${type}-${Date.now()}.${file.name.split('.').pop()}`
        : `orders/${orderId}/identity-${type}-${Date.now()}.${file.name.split('.').pop()}`;
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

      if (type === 'front') {
        setFrontUrl(data.url);
      } else {
        setBackUrl(data.url);
      }

      // Save to tracking
      await saveTracking(type === 'front' ? { identity_card_front_url: data.url } : { identity_card_back_url: data.url });
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
      <h3 className="text-lg font-semibold text-black mb-4">Pièces d&apos;identité</h3>

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
        {/* Front */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Pièce d&apos;identité recto
          </label>
          <input
            ref={frontInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'front');
            }}
            className="hidden"
          />
          {frontUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-md border border-gray-200 p-4">
                {frontUrl.toLowerCase().endsWith('.pdf') ? (
                  <a
                    href={frontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-gray-50 rounded"
                  >
                    <Icon icon="mdi:file-pdf-box" className="h-16 w-16 text-red-500" />
                    <span className="mt-2 text-sm text-marlon-green hover:text-[#00A870]">
                      Voir le document
                    </span>
                  </a>
                ) : (
                  <a
                    href={frontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={frontUrl}
                      alt="Recto"
                      className="w-full h-48 object-contain cursor-pointer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="mt-2 block text-sm text-marlon-green hover:text-[#00A870] text-center">
                      Voir le document
                    </span>
                  </a>
                )}
              </div>
              <Button
                onClick={() => frontInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => frontInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Icon icon="mdi:upload" className="h-5 w-5" />
              Ajouter le recto
            </Button>
          )}
        </div>

        {/* Back */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Pièce d&apos;identité verso
          </label>
          <input
            ref={backInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'back');
            }}
            className="hidden"
          />
          {backUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-md border border-gray-200 p-4">
                {backUrl.toLowerCase().endsWith('.pdf') ? (
                  <a
                    href={backUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-gray-50 rounded"
                  >
                    <Icon icon="mdi:file-pdf-box" className="h-16 w-16 text-red-500" />
                    <span className="mt-2 text-sm text-marlon-green hover:text-[#00A870]">
                      Voir le document
                    </span>
                  </a>
                ) : (
                  <a
                    href={backUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={backUrl}
                      alt="Verso"
                      className="w-full h-48 object-contain cursor-pointer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="mt-2 block text-sm text-marlon-green hover:text-[#00A870] text-center">
                      Voir le document
                    </span>
                  </a>
                )}
              </div>
              <Button
                onClick={() => backInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => backInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Icon icon="mdi:upload" className="h-5 w-5" />
              Ajouter le verso
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
