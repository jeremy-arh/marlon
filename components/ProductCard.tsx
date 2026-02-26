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
      href={`/catalog/product/${(product as any).slug || product.id}`}
      className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative w-full aspect-square bg-white flex items-center justify-center p-2">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-contain p-1.5"
          />
        ) : (
          <span className="text-gray-300 text-[10px]">Pas d&apos;image</span>
        )}
      </div>
      <div className="p-1.5 flex-1 flex flex-col">
        <h3 className="text-[10px] lg:text-[11px] font-medium text-gray-900 text-center leading-tight line-clamp-2 mb-1">
          {product.name}
        </h3>
        <div className="mt-auto text-center">
          {loading ? (
            <Icon icon="mdi:loading" className="h-3 w-3 animate-spin text-gray-400 mx-auto" />
          ) : price ? (
            <>
                  <p className="text-[9px] text-gray-500">A partir de :</p>
              <p className="text-[10px] lg:text-[11px] font-bold text-marlon-green">
                {(price.monthly * 1.2).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} € TTC /mois
              </p>
            </>
          ) : (
            <p className="text-[9px] text-gray-500">Prix sur demande</p>
          )}
        </div>
      </div>
    </Link>
  );
}
