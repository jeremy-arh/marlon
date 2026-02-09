'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/Icon';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    reference?: string;
    description?: string;
    purchase_price_ht: number;
    marlon_margin_percent: number;
    default_leaser_id: string | null;
    product_images?: Array<{ image_url: string }>;
  };
  defaultDurationMonths: number;
}

export default function ProductCard({ product, defaultDurationMonths }: ProductCardProps) {
  const [price, setPrice] = useState<{ monthly: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrice = async () => {
      if (!product.default_leaser_id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/products/${product.id}/price?duration=${defaultDurationMonths}`
        );
        const data = await response.json();
        if (data.success && data.price) {
          setPrice({
            monthly: data.price.monthlyPrice,
            total: data.price.totalPrice,
          });
        }
      } catch (error) {
        console.error('Error loading price:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrice();
  }, [product.id, product.default_leaser_id, defaultDurationMonths]);

  const mainImage = product.product_images?.[0]?.image_url;

  return (
    <Link
      href={`/catalog/product/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-marlon-stroke bg-white transition-shadow hover:shadow-md"
    >
      {mainImage && (
        <div className="relative h-48 w-full">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-xl font-semibold text-marlon-text">{product.name}</h2>
        {product.reference && (
          <p className="mt-1 text-sm text-marlon-text-secondary">Réf: {product.reference}</p>
        )}
        {product.description && (
          <p className="mt-2 line-clamp-2 flex-1 text-sm text-marlon-text-secondary">
            {product.description.replace(/<[^>]*>/g, '')}
          </p>
        )}
        
        {/* Price Display */}
        <div className="mt-4 border-t border-marlon-stroke pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-marlon-text-secondary">
              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
              <span>Calcul du prix...</span>
            </div>
          ) : price ? (
            <div>
              <div className="text-lg font-bold text-marlon-green">
                {price.monthly.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €<span className="text-sm font-normal">/mois</span>
              </div>
              <p className="text-xs text-marlon-text-secondary">
                {defaultDurationMonths} mois • Total: {price.total.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €
              </p>
            </div>
          ) : (
            <p className="text-sm text-marlon-text-secondary">Prix sur demande</p>
          )}
        </div>
      </div>
    </Link>
  );
}
