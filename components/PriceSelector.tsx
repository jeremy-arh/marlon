'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

interface Duration {
  id: string;
  months: number;
}

interface PriceInfo {
  monthly: number;
  total: number;
}

interface PriceSelectorProps {
  productId: string;
  purchasePrice: number;
  marginPercent: number;
  leaserId: string | null;
  durations: Duration[];
  onDurationChange?: (durationMonths: number) => void;
  className?: string;
}

export default function PriceSelector({
  productId,
  purchasePrice,
  marginPercent,
  leaserId,
  durations,
  onDurationChange,
  className = '',
}: PriceSelectorProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<number, PriceInfo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (durations.length > 0 && !selectedDuration) {
      setSelectedDuration(durations[0].months);
    }
  }, [durations, selectedDuration]);

  useEffect(() => {
    if (selectedDuration && onDurationChange) {
      onDurationChange(selectedDuration);
    }
  }, [selectedDuration, onDurationChange]);

  useEffect(() => {
    const loadPrices = async () => {
      if (!leaserId || durations.length === 0) return;

      setLoading(true);
      try {
        const pricePromises = durations.map(async (duration) => {
          const response = await fetch(
            `/api/products/${productId}/price?duration=${duration.months}`
          );
          const data = await response.json();
          if (data.success && data.price) {
            return {
              duration: duration.months,
              price: {
                monthly: data.price.monthlyPrice,
                total: data.price.totalPrice,
              },
            };
          }
          return null;
        });

        const results = await Promise.all(pricePromises);
        const pricesMap: Record<number, PriceInfo> = {};
        results.forEach((result) => {
          if (result) {
            pricesMap[result.duration] = result.price;
          }
        });
        setPrices(pricesMap);
      } catch (error) {
        console.error('Error loading prices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, [productId, leaserId, durations]);

  const selectedPrice = selectedDuration ? prices[selectedDuration] : null;

  if (!leaserId || durations.length === 0) {
    return (
      <div className={`rounded-lg border border-marlon-stroke bg-marlon-surface p-6 ${className}`}>
        <p className="text-sm text-marlon-text-secondary">Prix non disponible</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-marlon-stroke bg-marlon-surface p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-marlon-text">Prix de location</h3>

      {/* Duration Selector */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-marlon-text">
          Durée de location
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {durations.map((duration) => {
            const isSelected = selectedDuration === duration.months;
            const price = prices[duration.months];

            return (
              <button
                key={duration.id}
                type="button"
                onClick={() => setSelectedDuration(duration.months)}
                disabled={loading || !price}
                className={`rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-marlon-green bg-marlon-green/10 text-marlon-green'
                    : 'border-marlon-stroke bg-white text-marlon-text hover:border-marlon-green/50 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {duration.months} mois
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Display */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-marlon-text-secondary" />
          <span className="ml-2 text-sm text-marlon-text-secondary">Calcul des prix...</span>
        </div>
      ) : selectedPrice ? (
        <div className="space-y-2">
          <div className="text-3xl font-bold text-marlon-green">
            {selectedPrice.monthly.toLocaleString('fr-FR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            €
            <span className="text-lg font-normal"> / mois</span>
          </div>
          <div className="text-sm text-marlon-text-secondary">
            Total pour {selectedDuration} mois :{' '}
            <span className="font-semibold">
              {selectedPrice.total.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-marlon-text-secondary">Prix non disponible pour cette durée</p>
      )}
    </div>
  );
}
