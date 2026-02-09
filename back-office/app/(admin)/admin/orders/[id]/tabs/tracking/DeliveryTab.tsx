'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';
import Icon from '@/components/Icon';

interface DeliveryTabProps {
  orderId: string;
  order?: any;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function DeliveryTab({ orderId, order, initialTracking, onUpdate }: DeliveryTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<string>(initialTracking?.delivery_status || 'pending');

  const statusOptions = [
    { value: 'pending', label: 'En attente' },
    { value: 'in_transit', label: 'En livraison' },
    { value: 'delivered', label: 'Livré' },
    { value: 'delivery_signed', label: 'Bon de livraison signé' },
  ];

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_status: status }),
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

  // Check if we have delivery address data
  const hasDeliveryAddress = order?.delivery_address || order?.delivery_city;

  return (
    <div className="space-y-6">
      {/* Delivery Address Section */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Adresse de livraison</h3>
        
        {hasDeliveryAddress ? (
          <div className="space-y-2">
            {order?.delivery_name && (
              <p className="font-medium text-gray-900">{order.delivery_name}</p>
            )}
            <div className="flex items-start gap-2 text-gray-600">
              <Icon icon="mdi:map-marker" className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p>{order?.delivery_address}</p>
                <p>{order?.delivery_postal_code} {order?.delivery_city}</p>
                <p>{order?.delivery_country}</p>
              </div>
            </div>
            {(order?.delivery_contact_name || order?.delivery_contact_phone) && (
              <div className="flex items-start gap-2 text-gray-600 mt-3">
                <Icon icon="mdi:account" className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  {order?.delivery_contact_name && (
                    <p>Contact: {order.delivery_contact_name}</p>
                  )}
                  {order?.delivery_contact_phone && (
                    <p>Tél: {order.delivery_contact_phone}</p>
                  )}
                </div>
              </div>
            )}
            {order?.delivery_instructions && (
              <div className="flex items-start gap-2 text-gray-600 mt-3">
                <Icon icon="mdi:information" className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p>Instructions: {order.delivery_instructions}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Icon icon="mdi:alert-circle-outline" className="h-5 w-5" />
            <span>Aucune adresse de livraison spécifiée</span>
          </div>
        )}
      </div>

      {/* Delivery Status Section */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Statut de livraison</h3>

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
