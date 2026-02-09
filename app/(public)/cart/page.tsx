'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/Icon';
import { useRouter, usePathname } from 'next/navigation';

interface CartItem {
  id: string;
  quantity: number;
  duration_months?: number;
  products?: {
    id: string;
    name: string;
    reference?: string;
    purchase_price_ht: number;
    marlon_margin_percent: number;
    default_leaser_id: string | null;
    product_images?: Array<{ image_url: string }>;
  };
}

export default function CartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, { monthly: number; total: number }>>({});
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetchCart();
  }, [pathname]);

  useEffect(() => {
    // Load prices for all items
    cartItems.forEach((item) => {
      if (item.products && item.products.default_leaser_id && item.duration_months) {
        loadPrice(item.id, item.products.id, item.duration_months);
      }
    });
  }, [cartItems]);

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      setCartItems(data.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrice = async (itemId: string, productId: string, durationMonths: number) => {
    setLoadingPrices((prev) => ({ ...prev, [itemId]: true }));
    try {
      const response = await fetch(
        `/api/products/${productId}/price?duration=${durationMonths}`
      );
      const data = await response.json();
      if (data.success && data.price) {
        setPrices((prev) => ({
          ...prev,
          [itemId]: {
            monthly: data.price.monthlyPrice,
            total: data.price.totalPrice * (cartItems.find((i) => i.id === itemId)?.quantity || 1),
          },
        }));
      }
    } catch (error) {
      console.error('Error loading price:', error);
    } finally {
      setLoadingPrices((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
      });
      fetchCart();
      // Remove price from state
      setPrices((prev) => {
        const newPrices = { ...prev };
        delete newPrices[itemId];
        return newPrices;
      });
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    try {
      await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const totalAmount = Object.values(prices).reduce((sum, price) => sum + price.total, 0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Chargement du panier...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Panier</h1>

      {cartItems.length === 0 ? (
        <div className="text-center">
          <p className="mb-4 text-gray-600">Votre panier est vide.</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-md bg-marlon-green px-6 py-3 text-white font-semibold transition-colors hover:bg-[#00A870]"
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {cartItems.map((item) => {
            const product = item.products;
            const mainImage = product?.product_images?.[0]?.image_url;
            const price = prices[item.id];
            const isLoadingPrice = loadingPrices[item.id];

            return (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-lg border border-marlon-stroke bg-white p-4 sm:flex-row sm:items-center"
              >
                {mainImage && (
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={mainImage}
                      alt={product?.name || 'Produit'}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="font-semibold">{product?.name || 'Produit'}</h3>
                  {product?.reference && (
                    <p className="text-sm text-gray-500">Réf: {product.reference}</p>
                  )}
                  {item.duration_months && (
                    <p className="mt-1 text-sm text-gray-600">
                      Durée: {item.duration_months} mois
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="rounded-md border border-marlon-stroke px-2 py-1 text-marlon-text hover:bg-marlon-surface"
                    >
                      <Icon icon="mdi:minus" className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-marlon-text">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="rounded-md border border-marlon-stroke px-2 py-1 text-marlon-text hover:bg-marlon-surface"
                    >
                      <Icon icon="mdi:plus" className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="min-w-[120px] text-right">
                    {isLoadingPrice ? (
                      <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
                        <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                      </div>
                    ) : price ? (
                      <div>
                        <div className="font-semibold text-marlon-green">
                          {price.monthly.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €<span className="text-xs font-normal">/mois</span>
                        </div>
                        <div className="text-xs text-marlon-text-secondary">
                          Total: {price.total.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-marlon-text-secondary">Prix sur demande</span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-700"
                    title="Supprimer"
                  >
                    <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Total and Checkout */}
          <div className="rounded-lg border border-marlon-stroke bg-marlon-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-marlon-text">Total</span>
              <span className="text-2xl font-bold text-marlon-green">
                {totalAmount > 0
                  ? totalAmount.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) + ' €'
                  : 'Calcul en cours...'}
              </span>
            </div>
            <button
              onClick={() => router.push('/orders/new')}
              className="w-full rounded-md bg-marlon-green px-6 py-3 text-white font-semibold transition-colors hover:bg-[#00A870]"
            >
              Passer la commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
