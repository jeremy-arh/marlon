'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';
import { supabase } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  technical_info?: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  product_type?: string;
  brands?: { name: string };
  product_images?: { image_url: string; order_index: number }[];
}

interface Category {
  id: string;
  name: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  product_images?: { image_url: string; order_index: number }[];
}

interface ProductDetailClientProps {
  product: Product;
  category: Category | null;
  productType: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  itTypeId: string | null;
  itTypeName: string | null;
  coefficient: number;
  bestDurationMonths: number;
  relatedProducts: RelatedProduct[];
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
  itTypeId,
  itTypeName,
  coefficient,
  bestDurationMonths,
  relatedProducts,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Variants state
  const [variantFilters, setVariantFilters] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [variantMonthlyPrice, setVariantMonthlyPrice] = useState<number | null>(null);
  const [variantImages, setVariantImages] = useState<string[]>([]);

  useEffect(() => {
    // Vérifier l'authentification au chargement
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    // Charger les variantes et filtres si produit IT
    if (productType === 'it_equipment') {
      loadVariantsAndFilters();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [productType]);

  const loadVariantsAndFilters = async () => {
    try {
      const [variantsRes, filtersRes] = await Promise.all([
        fetch(`/api/products/${product.id}/variants`),
        fetch('/api/product-variant-filters'),
      ]);

      const variantsData = await variantsRes.json();
      const filtersData = await filtersRes.json();

      if (variantsData.success) {
        setProductVariants(variantsData.data || []);
      }
      if (filtersData.success) {
        setVariantFilters(filtersData.data || []);
      }
    } catch (err) {
      console.error('Error loading variants:', err);
    }
  };

  // Filtrer les variantes selon les sélections
  useEffect(() => {
    if (productVariants.length === 0 || variantFilters.length === 0) {
      setSelectedVariant(null);
      setVariantMonthlyPrice(null);
      return;
    }

    // Vérifier que tous les filtres sont sélectionnés
    const allFiltersSelected = variantFilters.every(filter => selectedFilters[filter.name]);

    if (!allFiltersSelected) {
      setSelectedVariant(null);
      setVariantMonthlyPrice(null);
      return;
    }

    // Trouver la variante qui correspond exactement aux filtres sélectionnés
    const matchingVariant = productVariants.find((variant) => {
      const variantData = variant.variant_data || {};
      return variantFilters.every((filter) => {
        const selectedValue = selectedFilters[filter.name];
        return variantData[filter.name] === selectedValue;
      });
    });

    setSelectedVariant(matchingVariant || null);

    // Mettre à jour les images de la variante sélectionnée
    if (matchingVariant && Array.isArray(matchingVariant.images) && matchingVariant.images.length > 0) {
      setVariantImages(matchingVariant.images);
      setSelectedImageIndex(0); // Réinitialiser l'index d'image
    } else {
      setVariantImages([]);
      setSelectedImageIndex(0); // Réinitialiser l'index d'image
    }

    // Calculer le prix de la variante sélectionnée
    if (matchingVariant && matchingVariant.purchase_price_ht && matchingVariant.marlon_margin_percent) {
      const price = calculateMonthlyPrice(
        parseFloat(matchingVariant.purchase_price_ht.toString()),
        parseFloat(matchingVariant.marlon_margin_percent.toString())
      );
      setVariantMonthlyPrice(price);
    } else {
      setVariantMonthlyPrice(null);
    }
  }, [selectedFilters, productVariants, variantFilters, coefficient]);

  // Vérifier si la variante sélectionnée est disponible
  // Une variante est disponible si :
  // - Elle existe (selectedVariant n'est pas null)
  // - Elle est active (is_active !== false)
  // - Le stock est > 0 (si stock_quantity est défini) ou non géré (null/undefined)
  const isVariantAvailable = selectedVariant && 
    selectedVariant.is_active !== false && 
    (selectedVariant.stock_quantity === null || 
     selectedVariant.stock_quantity === undefined || 
     (typeof selectedVariant.stock_quantity === 'number' && selectedVariant.stock_quantity > 0));

  const handleFilterChange = (filterName: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
  };

  // Calculate monthly price TTC
  const calculateMonthlyPrice = (purchasePrice: number, marginPercent: number) => {
    const priceHT = purchasePrice * (1 + marginPercent / 100);
    const monthlyHT = priceHT * coefficient;
    const monthlyTTC = monthlyHT * 1.2; // 20% TVA
    return monthlyTTC;
  };

  const monthlyPrice = variantMonthlyPrice !== null 
    ? variantMonthlyPrice 
    : calculateMonthlyPrice(product.purchase_price_ht, product.marlon_margin_percent);

  const handleAddToCart = async () => {
    // Vérifier l'authentification avant d'ajouter au panier
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Rediriger vers la page de login avec le paramètre redirect
      router.push(`/login?redirect=${encodeURIComponent(`/catalog/product/${product.id}`)}`);
      return;
    }

    // Pour les produits IT avec variantes, vérifier qu'une variante est sélectionnée
    if (productType === 'it_equipment' && variantFilters.length > 0 && !selectedVariant) {
      alert('Veuillez sélectionner toutes les options pour continuer');
      return;
    }

    setAddingToCart(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
          leasing_duration_months: bestDurationMonths,
          variant_id: selectedVariant?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si l'erreur est 401 (Unauthorized), rediriger vers login
        if (response.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(`/catalog/product/${product.id}`)}`);
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'ajout au panier');
      }

      // Refresh page to update cart count
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Une erreur est survenue');
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
    <div className="p-6 lg:p-8">
      <PageHeader title="Commander" />

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link 
          href="/catalog" 
          className="flex items-center gap-1 text-gray-500 hover:text-marlon-green transition-colors"
        >
          <Icon icon="mdi:chevron-left" className="h-4 w-4" />
          <span>Retour</span>
        </Link>
        <span className="text-gray-300">|</span>
        {productType && (
          <>
            <Link 
              href={`/catalog?type=${productType}${specialtyId ? `&specialty=${specialtyId}` : ''}${itTypeId ? `&itType=${itTypeId}` : ''}`}
              className="text-gray-500 hover:text-marlon-green transition-colors"
            >
              {specialtyName || itTypeName || getProductTypeLabel(productType)}
            </Link>
            <Icon icon="mdi:chevron-right" className="h-4 w-4 text-gray-400" />
          </>
        )}
        {category && (
          <>
            <Link 
              href={`/catalog/category/${category.id}`}
              className="text-gray-500 hover:text-marlon-green transition-colors"
            >
              {category.name}
            </Link>
            <Icon icon="mdi:chevron-right" className="h-4 w-4 text-gray-400" />
          </>
        )}
        <span className="text-gray-700 font-medium truncate max-w-[300px]">{product.name}</span>
      </div>

      {/* Main content */}
      <div className="p-6">
        {/* Product name */}
        <h1 className="text-2xl font-bold text-[#1a365d] mb-6">{product.name}</h1>

        <div className="grid grid-cols-2 gap-8">
          {/* Left: Product images */}
          <div>
            {(() => {
              const displayImages = variantImages.length > 0 ? variantImages : images.map((img: any) => img.image_url || img);
              return displayImages.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative aspect-square w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <Image
                      src={displayImages[selectedImageIndex] || displayImages[0]}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                      priority
                    />
                  </div>
                  {displayImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {displayImages.map((imgUrl: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`relative w-14 h-14 flex-shrink-0 rounded-lg border overflow-hidden ${
                            selectedImageIndex === idx ? 'border-marlon-green' : 'border-gray-200'
                          }`}
                        >
                          <Image
                            src={imgUrl}
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
                  <span className="text-gray-400">Pas d'image</span>
                </div>
              );
            })()}
          </div>

          {/* Right: Product details */}
          <div className="space-y-4">
            {/* Variants filters - Only for IT equipment */}
            {productType === 'it_equipment' && variantFilters.length > 0 && (
              <div className="space-y-4">
                {variantFilters.map((filter) => {
                  const options = filter.product_variant_filter_options || [];
                  // Récupérer les valeurs uniques disponibles dans les variantes actives
                  const availableValues = new Set(
                    productVariants
                      .map(v => v.variant_data?.[filter.name])
                      .filter(Boolean)
                  );
                  const availableOptions = options.filter(opt => availableValues.has(opt.value));

                  if (availableOptions.length === 0) return null;

                  return (
                    <div key={filter.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-base font-semibold text-[#1a365d] mb-3">{filter.label}</h3>
                      <div className="flex flex-wrap gap-2">
                        {availableOptions.map((option: any) => {
                          const isSelected = selectedFilters[filter.name] === option.value;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleFilterChange(filter.name, option.value)}
                              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-marlon-green text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Price and add to cart */}
            <div className="flex items-center justify-between gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div>
                {productType === 'it_equipment' && variantFilters.length > 0 && selectedVariant ? (
                  <>
                    <span className="text-gray-600">Prix : </span>
                    <span className="text-xl font-bold text-gray-900">{monthlyPrice.toFixed(2)} € TTC</span>
                    <span className="text-gray-600"> /mois</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-600">A partir de : </span>
                    <span className="text-xl font-bold text-gray-900">{monthlyPrice.toFixed(2)} € TTC</span>
                    <span className="text-gray-600"> /mois</span>
                  </>
                )}
              </div>
              {productType === 'it_equipment' && variantFilters.length > 0 ? (
                (!selectedVariant || !isVariantAvailable) ? (
                  <div className="px-6 py-2.5 bg-gray-200 text-gray-600 font-medium rounded-full flex-shrink-0">
                    Non disponible
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex items-center gap-2 px-6 py-2.5 bg-marlon-green text-white font-medium rounded-full hover:bg-[#00A870] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {addingToCart ? (
                      <>
                        <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                        <span>Ajout...</span>
                      </>
                    ) : (
                      <span>Ajouter au panier</span>
                    )}
                  </button>
                )
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="flex items-center gap-2 px-6 py-2.5 bg-marlon-green text-white font-medium rounded-full hover:bg-[#00A870] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {addingToCart ? (
                    <>
                      <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                      <span>Ajout...</span>
                    </>
                  ) : (
                    <span>Ajouter au panier</span>
                  )}
                </button>
              )}
            </div>

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
              D'autres produits qui pourraient vous intéresser :
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
                    href={`/catalog/product/${relatedProduct.id}`}
                    className="flex-shrink-0 w-52 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow flex items-center gap-3 p-3"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0 bg-white flex items-center justify-center">
                      {relatedImageUrl ? (
                        <Image
                          src={relatedImageUrl}
                          alt={relatedProduct.name}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-gray-300 text-[10px]">Pas d'image</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium text-[#1a365d] leading-tight line-clamp-2 mb-1">
                        {relatedProduct.name}
                      </h3>
                      <p className="text-[10px] text-gray-500">à partir de</p>
                      <p className="text-xs font-bold text-marlon-green">
                        {relatedPrice.toFixed(2)}€ TTC <span className="font-normal text-gray-500">/mois</span>
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
    </div>
  );
}
