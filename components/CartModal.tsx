'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  quantity: number;
  duration_months?: number;
  calculated_monthly_price?: number;
  products?: {
    id: string;
    name: string;
    reference?: string;
    purchase_price_ht: number;
    marlon_margin_percent: number;
    default_leaser_id: string | null;
    product_images?: Array<{ image_url: string; order_index: number }>;
  };
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { value: 24, label: '24 mois' },
  { value: 36, label: '36 mois' },
  { value: 48, label: '48 mois' },
  { value: 60, label: '60 mois' },
];

// Default coefficients by duration (as decimal, e.g., 0.035 = 3.5%)
// These are fallback values when API doesn't return coefficients
const DEFAULT_COEFFICIENTS: Record<number, number> = {
  24: 0.05,    // 5%
  36: 0.038,   // 3.8%
  48: 0.032,   // 3.2%
  60: 0.028,   // 2.8%
};

// Calculate price locally using product data and coefficients
const calculateLocalPrice = (item: CartItem, durationMonths: number) => {
  if (!item.products) return null;
  
  const purchasePrice = Number(item.products.purchase_price_ht);
  const marginPercent = Number(item.products.marlon_margin_percent);
  const sellingPriceHT = purchasePrice * (1 + marginPercent / 100);
  
  // Get coefficient for duration (as decimal)
  const coefficient = DEFAULT_COEFFICIENTS[durationMonths] || 0.035;
  
  // Monthly price HT = selling price * coefficient
  const monthlyHT = sellingPriceHT * coefficient;
  const monthlyTTC = monthlyHT * 1.2; // Add 20% TVA
  
  return {
    monthlyHT: monthlyHT * item.quantity,
    monthlyTTC: monthlyTTC * item.quantity,
  };
};

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, { monthlyHT: number; monthlyTTC: number }>>({});
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle opening/closing animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
      fetchCart();
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Load prices when items or duration changes
  useEffect(() => {
    if (cartItems.length === 0) return;
    
    // First, set immediate local prices for instant display
    const immediateUpdate: Record<string, { monthlyHT: number; monthlyTTC: number }> = {};
    cartItems.forEach((item) => {
      if (item.products) {
        const localPrice = calculateLocalPrice(item, selectedDuration);
        if (localPrice) {
          immediateUpdate[item.id] = localPrice;
        }
      }
    });
    
    if (Object.keys(immediateUpdate).length > 0) {
      setPrices(immediateUpdate);
    }
    
    // Then try to get more accurate prices from API
    cartItems.forEach((item) => {
      if (item.products) {
        loadPrice(item.id, item.products.id, selectedDuration);
      }
    });
  }, [cartItems, selectedDuration]);

  const fetchCart = async () => {
    setLoading(true);
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
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;

    setLoadingPrices((prev) => ({ ...prev, [itemId]: true }));
    
    try {
      const response = await fetch(
        `/api/products/${productId}/price?duration=${durationMonths}`
      );
      const data = await response.json();
      
      if (data.success && data.price) {
        const qty = item.quantity || 1;
        // API returns monthlyPrice as HT
        const monthlyHT = data.price.monthlyPrice * qty;
        const monthlyTTC = monthlyHT * 1.2; // Add 20% TVA
        setPrices((prev) => ({
          ...prev,
          [itemId]: {
            monthlyHT,
            monthlyTTC,
          },
        }));
      } else {
        // Fallback to local calculation
        const localPrice = calculateLocalPrice(item, durationMonths);
        if (localPrice) {
          setPrices((prev) => ({
            ...prev,
            [itemId]: localPrice,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading price:', error);
      // Fallback to local calculation on error
      const localPrice = calculateLocalPrice(item, durationMonths);
      if (localPrice) {
        setPrices((prev) => ({
          ...prev,
          [itemId]: localPrice,
        }));
      }
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
      setPrices((prev) => {
        const newPrices = { ...prev };
        delete newPrices[itemId];
        return newPrices;
      });
      // Update cart counter in header
      window.dispatchEvent(new CustomEvent('cart-updated'));
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
      // Update cart counter in header
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const toggleItemDetails = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleAddMore = () => {
    onClose();
    router.push('/catalog');
  };

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  // Calculate totals
  const totalMonthlyHT = Object.values(prices).reduce((sum, price) => sum + price.monthlyHT, 0);
  const totalMonthlyTTC = Object.values(prices).reduce((sum, price) => sum + price.monthlyTTC, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#1a365d]">Mon Panier</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <Icon icon="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Chargement...</span>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Icon icon="mdi:cart-off" className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center mb-4">Votre panier est vide</p>
              <button
                onClick={handleAddMore}
                className="text-marlon-green hover:text-marlon-green/80 font-medium"
              >
                Parcourir le catalogue
              </button>
            </div>
          ) : (
            <div className="px-6 py-4">
              {/* Product List */}
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const product = item.products;
                  const images = product?.product_images?.sort((a, b) => a.order_index - b.order_index) || [];
                  const mainImage = images[0]?.image_url;
                  const price = prices[item.id];
                  const isLoadingPrice = loadingPrices[item.id];
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <div key={item.id} className="flex gap-4">
                      {/* Image */}
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {mainImage ? (
                          <Image
                            src={mainImage}
                            alt={product?.name || 'Produit'}
                            fill
                            className="object-contain p-2"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Icon icon="mdi:image-off" className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-[#1a365d] line-clamp-2">
                          {product?.name || 'Produit'}
                        </h3>
                        
                        {/* Price */}
                        <div className="mt-1">
                          {isLoadingPrice ? (
                            <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-gray-400" />
                          ) : price ? (
                            <span className="text-sm font-bold text-marlon-green">
                              {price.monthlyTTC.toFixed(2)} € TTC
                              <span className="font-normal text-gray-500"> / mois</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Prix sur demande</span>
                          )}
                        </div>

                        {/* Show details link */}
                        <button
                          onClick={() => toggleItemDetails(item.id)}
                          className="text-xs text-marlon-green hover:underline mt-1"
                        >
                          {isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            {product?.reference && (
                              <p>Réf: {product.reference}</p>
                            )}
                            <Link
                              href={`/catalog/product/${product?.id}`}
                              onClick={onClose}
                              className="text-marlon-green hover:underline block"
                            >
                              Voir le produit
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls & Delete */}
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Icon icon="mdi:trash-can-outline" className="h-4.5 w-4.5" />
                        </button>
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <Icon icon="mdi:minus" className="h-4 w-4" />
                          </button>
                          <span className="w-8 h-8 flex items-center justify-center text-sm font-medium border-x border-gray-300">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <Icon icon="mdi:plus" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 bg-white">
            {/* Mobile toggle handle */}
            <button
              onClick={() => setIsFooterExpanded(!isFooterExpanded)}
              className="w-full flex flex-col items-center pt-2 pb-1 md:hidden"
              aria-label={isFooterExpanded ? 'Réduire le résumé' : 'Voir le résumé'}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mb-1" />
              <Icon
                icon={isFooterExpanded ? 'mdi:chevron-down' : 'mdi:chevron-up'}
                className="h-5 w-5 text-gray-400"
              />
            </button>

            <div className="p-6 pt-2 md:pt-6 space-y-4">
              {/* Collapsible section on mobile */}
              <div
                className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out md:max-h-none md:opacity-100 ${
                  isFooterExpanded
                    ? 'max-h-[500px] opacity-100'
                    : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'
                }`}
              >
                {/* Duration Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1a365d]">Nombre de mensualités :</span>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary Box */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm text-gray-500">
                    Nombre d&apos;articles: {itemCount}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-[#1a365d]">Loyer HT :</span>
                      <span className="text-gray-700">{totalMonthlyHT.toFixed(2)} € / mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#1a365d]">Durée du contrat :</span>
                      <span className="text-gray-700">{selectedDuration} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#1a365d]">Livraison :</span>
                      <span className="text-marlon-green font-medium">Offerte</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Always visible: Total TTC + Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-bold text-[#1a365d]">Loyer TTC :</span>
                <span className="font-bold text-[#1a365d]">{totalMonthlyTTC.toFixed(2)} € / mois</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddMore}
                  className="w-full py-3 border-2 border-marlon-green text-marlon-green font-semibold rounded-lg hover:bg-marlon-green/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:plus" className="h-5 w-5" />
                  Ajouter des équipements
                </button>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-marlon-green text-white font-semibold rounded-lg hover:bg-marlon-green/90 transition-colors"
                >
                  Valider mon panier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
