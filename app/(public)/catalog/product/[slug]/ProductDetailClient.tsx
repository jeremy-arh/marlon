'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';
import { supabase } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  slug?: string;
  reference?: string;
  description?: string;
  technical_info?: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  product_type?: string;
  parent_product_id?: string | null;
  variant_data?: Record<string, string>;
  brands?: { name: string };
  product_images?: { image_url: string; order_index: number }[];
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug?: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  product_images?: { image_url: string; order_index: number }[];
}

interface SiblingProduct {
  id: string;
  name: string;
  slug?: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  variant_data?: Record<string, string>;
  parent_product_id?: string | null;
  product_images?: { image_url: string; order_index: number }[];
}

interface VariantFilterDef {
  id: string;
  name: string;
  label: string;
  display_name?: string;
  product_variant_filter_options: { id: string; value: string; label: string; order_index: number }[];
}

interface ProductDetailClientProps {
  product: Product;
  category: Category | null;
  productType: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  itCategoryId: string | null;
  coefficient: number;
  currentMonthlyPrice: number;
  cheapestMonthlyPrice: number | null;
  bestDurationMonths: number;
  relatedProducts: RelatedProduct[];
  siblings: SiblingProduct[];
  variantFilterDefs: VariantFilterDef[];
}

const getProductTypeLabel = (type: string): string => {
  switch (type) {
    case 'medical_equipment':
      return 'Matériel médical';
    case 'furniture':
      return 'Mobilier';
    case 'it_equipment':
      return 'Informatique';
    default:
      return type;
  }
};

export default function ProductDetailClient({
  product,
  category,
  productType,
  specialtyId,
  specialtyName,
  itCategoryId,
  coefficient,
  currentMonthlyPrice,
  cheapestMonthlyPrice,
  bestDurationMonths,
  relatedProducts,
  siblings,
  variantFilterDefs,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Has variants? (more than just the current product in the group)
  const hasVariants = siblings.length > 1 && variantFilterDefs.length > 0;

  // Build the selected filters from the current product's variant_data
  const currentFilters = useMemo(() => {
    if (!hasVariants || !product.variant_data) return {};
    return product.variant_data;
  }, [product.variant_data, hasVariants]);

  // Build available filter options from ALL siblings' variant_data
  const filterOptions = useMemo(() => {
    if (!hasVariants) return {};
    const options: Record<string, Set<string>> = {};
    for (const sibling of siblings) {
      if (sibling.variant_data && typeof sibling.variant_data === 'object') {
        for (const [key, value] of Object.entries(sibling.variant_data)) {
          if (!options[key]) options[key] = new Set();
          if (value) options[key].add(value);
        }
      }
    }
    return options;
  }, [siblings, hasVariants]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // When a filter changes, find the matching sibling and navigate to its page
  const handleFilterChange = (filterName: string, value: string) => {
    // Build the new desired variant_data
    const newFilters = { ...currentFilters, [filterName]: value };

    // Find the sibling that matches ALL current filters
    const matchingSibling = siblings.find(sibling => {
      if (!sibling.variant_data || typeof sibling.variant_data !== 'object') return false;
      return variantFilterDefs.every(filterDef => {
        const desiredValue = newFilters[filterDef.name];
        if (!desiredValue) return true; // Filter not selected yet, skip
        return sibling.variant_data?.[filterDef.name] === desiredValue;
      });
    });

    if (matchingSibling && matchingSibling.id !== product.id) {
      // Navigate to the matching sibling's product page
      router.push(`/catalog/product/${matchingSibling.slug || matchingSibling.id}`);
    }
    // If no match found, do nothing (stay on current page)
  };

  // Calculate monthly price for related products
  const calculateMonthlyPrice = (purchasePrice: number, marginPercent: number) => {
    const priceHT = purchasePrice * (1 + marginPercent / 100);
    return priceHT * coefficient;
  };

  // Determine price to display
  const displayPrice = currentMonthlyPrice;
  const startingPrice = cheapestMonthlyPrice ?? currentMonthlyPrice;

  const handleAddToCart = async () => {
    setAddingToCart(true);
    setAddedToCart(false);

    try {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAddingToCart(false);
        router.push(`/login?redirect=${encodeURIComponent(`/catalog/product/${product.slug || product.id}`)}`);
        return;
      }

      // Each variant is its own product, so product_id is always the current product
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
          leasing_duration_months: bestDurationMonths,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(`/catalog/product/${product.slug || product.id}`)}`);
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'ajout au panier');
      }

      // Success! Show confirmation and update cart count
      setAddedToCart(true);
      
      // Dispatch custom event to update cart counter in header
      window.dispatchEvent(new CustomEvent('cart-updated'));

      // Reset the success message after 3 seconds
      setTimeout(() => setAddedToCart(false), 3000);

    } catch (error: any) {
      console.error('Erreur ajout panier:', error);
      alert(error.message || 'Une erreur est survenue lors de l\'ajout au panier');
    } finally {
      setAddingToCart(false);
    }
  };

  const getProductImage = (prod: Product | RelatedProduct) => {
    if (prod.product_images && prod.product_images.length > 0) {
      const sorted = [...prod.product_images].sort((a, b) => a.order_index - b.order_index);
      return sorted[0].image_url;
    }
    return null;
  };

  const images = product.product_images 
    ? [...product.product_images].sort((a, b) => a.order_index - b.order_index) 
    : [];

  const inclusList = [
    { icon: 'mdi:package-variant', text: 'Location de l\'équipement' },
    { icon: 'mdi:cash-check', text: 'Financement simple et rapide' },
    { icon: 'mdi:shield-check', text: 'Garantie Premium Marlon' },
    { icon: 'mdi:cog-outline', text: 'Accès à la gestion de vos équipement' },
    { icon: 'mdi:truck-delivery', text: 'Livraison partout en France' },
  ];

  return (
    <div className="p-4 lg:p-8 pb-28 lg:pb-8">
      <PageHeader title="Commander" />

      {/* Breadcrumb */}
      <div className="mb-4 lg:mb-6 flex items-center gap-2 text-sm overflow-x-auto">
        <Link 
          href="/catalog" 
          className="flex items-center gap-1 text-gray-500 hover:text-marlon-green transition-colors flex-shrink-0"
        >
          <Icon icon="mdi:chevron-left" className="h-4 w-4" />
          <span>Retour</span>
        </Link>
        <span className="text-gray-300 hidden sm:inline">|</span>
        {productType && (
          <>
            <Link 
              href={`/catalog?type=${productType}${specialtyId ? `&specialty=${specialtyId}` : ''}${itCategoryId ? `&itCategory=${itCategoryId}` : ''}`}
              className="text-gray-500 hover:text-marlon-green transition-colors hidden sm:inline"
            >
              {specialtyName || getProductTypeLabel(productType)}
            </Link>
            <Icon icon="mdi:chevron-right" className="h-4 w-4 text-gray-400 hidden sm:inline" />
          </>
        )}
        {category && (
          <>
            <Link 
              href={`/catalog/category/${category.slug || category.id}`}
              className="text-gray-500 hover:text-marlon-green transition-colors hidden sm:inline"
            >
              {category.name}
            </Link>
            <Icon icon="mdi:chevron-right" className="h-4 w-4 text-gray-400 hidden sm:inline" />
          </>
        )}
        <span className="text-gray-700 font-medium truncate max-w-[200px] sm:max-w-[300px] hidden sm:inline">{product.name}</span>
      </div>

      {/* Main content */}
      <div className="p-0 lg:p-6">
        {/* Product name */}
        <h1 className="text-xl lg:text-2xl font-bold text-[#1a365d] mb-4 lg:mb-6">{product.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-[540px_1fr] lg:grid-cols-[630px_1fr] gap-6 lg:gap-8">
          {/* Left: Product images */}
          <div>
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative aspect-square w-full max-w-[480px] mx-auto md:max-w-none bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <Image
                    src={images[selectedImageIndex]?.image_url || images[0].image_url}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    priority
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-14 h-14 flex-shrink-0 rounded-lg border overflow-hidden ${
                          selectedImageIndex === idx ? 'border-marlon-green' : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={img.image_url}
                          alt={`${product.name} - ${idx + 1}`}
                          fill
                          className="object-contain p-1"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square w-full bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Pas d&apos;image</span>
              </div>
            )}
          </div>

          {/* Right: Product details */}
          <div className="space-y-4">
            {/* Price and add to cart - Desktop only (inline) */}
            <div className="hidden lg:flex items-center justify-between gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div>
                {hasVariants ? (
                  <>
                    <span className="text-gray-600">Prix : </span>
                    <span className="text-xl font-bold text-gray-900">{displayPrice.toFixed(2)} € HT</span>
                    <span className="text-gray-600"> /mois</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-600">A partir de : </span>
                    <span className="text-xl font-bold text-gray-900">{displayPrice.toFixed(2)} € HT</span>
                    <span className="text-gray-600"> /mois</span>
                  </>
                )}
              </div>
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || addedToCart}
                className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-full transition-colors disabled:cursor-not-allowed flex-shrink-0 ${
                  addedToCart 
                    ? 'bg-green-600 text-white' 
                    : 'bg-marlon-green text-white hover:bg-[#00A870] disabled:opacity-50'
                }`}
              >
                {addingToCart ? (
                  <>
                    <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                    <span>Ajout...</span>
                  </>
                ) : addedToCart ? (
                  <>
                    <Icon icon="mdi:check" className="h-5 w-5" />
                    <span>Ajouté !</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:cart-plus" className="h-5 w-5" />
                    <span>Ajouter au panier</span>
                  </>
                )}
              </button>
            </div>

            {/* Variant filters as dropdowns */}
            {hasVariants && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                {variantFilterDefs.map((filterDef) => {
                  // Get available values from siblings for this filter
                  const availableValues = filterOptions[filterDef.name] || new Set();
                  
                  // Only show filter options that exist in actual siblings
                  const filteredOptions = filterDef.product_variant_filter_options
                    .filter(opt => availableValues.has(opt.value))
                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

                  if (filteredOptions.length === 0) return null;

                  const currentValue = currentFilters[filterDef.name] || '';

                  return (
                    <div key={filterDef.id}>
                      <label className="block text-sm font-semibold text-[#1a365d] mb-1.5">
                        {filterDef.display_name || filterDef.label || filterDef.name}
                      </label>
                      <select
                        value={currentValue}
                        onChange={(e) => handleFilterChange(filterDef.name, e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Sélectionner {(filterDef.display_name || filterDef.label || filterDef.name).toLowerCase()}</option>
                        {filteredOptions.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.label || option.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Caractéristiques */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-[#1a365d] mb-3">Caractéristiques</h2>
              {product.description ? (
                <div 
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-sm text-gray-500">Aucune description disponible.</p>
              )}
            </div>

            {/* Inclus dans le loyer */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-[#1a365d] mb-3">Inclus dans le loyer</h2>
              <div className="space-y-3">
                {inclusList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-marlon-green flex items-center justify-center flex-shrink-0">
                      <Icon icon={item.icon} className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-[#1a365d] mb-4">
              D&apos;autres produits qui pourraient vous intéresser :
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {relatedProducts.map((relatedProduct) => {
                const relatedImageUrl = getProductImage(relatedProduct);
                const relatedPrice = calculateMonthlyPrice(
                  relatedProduct.purchase_price_ht, 
                  relatedProduct.marlon_margin_percent
                );

                return (
                  <Link
                    key={relatedProduct.id}
                    href={`/catalog/product/${(relatedProduct as any).slug || relatedProduct.id}`}
                    className="flex-shrink-0 w-72 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow flex items-center gap-4 p-4"
                  >
                    <div className="relative w-24 h-24 flex-shrink-0 bg-white flex items-center justify-center">
                      {relatedImageUrl ? (
                        <Image
                          src={relatedImageUrl}
                          alt={relatedProduct.name}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">Pas d&apos;image</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[#1a365d] leading-tight line-clamp-2 mb-1">
                        {relatedProduct.name}
                      </h3>
                      <p className="text-xs text-gray-500">à partir de</p>
                      <p className="text-sm font-bold text-marlon-green">
                        {relatedPrice.toFixed(2)}€ HT <span className="font-normal text-gray-500">/mois</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Technical info */}
        {product.technical_info && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#1a365d] mb-4">Informations techniques</h2>
            <div 
              className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.technical_info }}
            />
          </div>
        )}
      </div>

      {/* Mobile sticky bottom bar - Price + Add to cart */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-gray-200 px-4 py-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 leading-none mb-0.5">
              {hasVariants ? 'Prix' : 'A partir de'}
            </p>
            <p className="text-lg font-bold text-gray-900 leading-tight">
              {displayPrice.toFixed(2)} € <span className="text-sm font-normal text-gray-500">HT /mois</span>
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={addingToCart || addedToCart}
            className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-full transition-colors disabled:cursor-not-allowed flex-shrink-0 text-sm ${
              addedToCart 
                ? 'bg-green-600 text-white' 
                : 'bg-marlon-green text-white hover:bg-[#00A870] disabled:opacity-50'
            }`}
          >
            {addingToCart ? (
              <>
                <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                <span>Ajout...</span>
              </>
            ) : addedToCart ? (
              <>
                <Icon icon="mdi:check" className="h-5 w-5" />
                <span>Ajouté !</span>
              </>
            ) : (
              <>
                <Icon icon="mdi:cart-plus" className="h-5 w-5" />
                <span>Ajouter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
