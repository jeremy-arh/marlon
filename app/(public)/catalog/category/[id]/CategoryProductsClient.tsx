'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface Product {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  brand_id?: string;
  brands?: { id: string; name: string };
  product_images?: { image_url: string; order_index: number }[];
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoryProductsClientProps {
  category: Category;
  products: Product[];
  brands: Brand[];
  coefficient: number;
  productMonthlyPrices: Record<string, number>;
  productType?: string | null;
  specialtyId?: string | null;
  specialtyName?: string | null;
  itTypeId?: string | null;
  itTypeName?: string | null;
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

export default function CategoryProductsClient({
  category,
  products,
  brands,
  coefficient,
  productMonthlyPrices,
  productType,
  specialtyId,
  specialtyName,
  itTypeId,
  itTypeName,
}: CategoryProductsClientProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Count active filters for badge
  const activeFilterCount = [selectedBrands.length > 0, minPrice, maxPrice].filter(Boolean).length;

  // Lock body scroll when filter sheet is open
  useEffect(() => {
    if (isFilterSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFilterSheetOpen]);

  // Use server-calculated monthly price (with correct coefficient per price range)
  // Falls back to simple calculation if pre-calculated price is not available
  const calculateMonthlyPrice = (product: Product) => {
    if (productMonthlyPrices[product.id] !== undefined) {
      return productMonthlyPrices[product.id];
    }
    // Fallback (should not happen since prices are pre-calculated server-side)
    const priceHT = product.purchase_price_ht * (1 + product.marlon_margin_percent / 100);
    const monthly = priceHT * coefficient;
    return monthly;
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(query);
      const matchesRef = product.reference?.toLowerCase().includes(query);
      const matchesBrand = product.brands?.name?.toLowerCase().includes(query);
      if (!matchesName && !matchesRef && !matchesBrand) {
        return false;
      }
    }

    // Brand filter
    if (selectedBrands.length > 0 && product.brand_id) {
      if (!selectedBrands.includes(product.brand_id)) {
        return false;
      }
    }

    // Price filter
    const monthlyPrice = calculateMonthlyPrice(product);
    if (minPrice && monthlyPrice < parseFloat(minPrice)) {
      return false;
    }
    if (maxPrice && monthlyPrice > parseFloat(maxPrice)) {
      return false;
    }

    return true;
  });

  // Get unique brands from products
  const productBrandIds = Array.from(new Set(products.map(p => p.brand_id).filter(Boolean)));
  const availableBrands = brands.filter(b => productBrandIds.includes(b.id));

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const getProductImage = (product: Product) => {
    if (product.product_images && product.product_images.length > 0) {
      const sorted = [...product.product_images].sort((a, b) => a.order_index - b.order_index);
      return sorted[0].image_url;
    }
    return null;
  };

  return (
    <div className="p-4 lg:p-8">
      <PageHeader title="Catalogue" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
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
        <span className="text-gray-700 font-medium">{category.name}</span>
      </div>

      {/* Desktop Filters bar */}
      <div className="hidden lg:flex items-center gap-4 mb-8 flex-wrap">
        {/* Brand filter */}
        <div className="relative">
          <button
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 min-w-[180px]"
          >
            <span className="truncate">{selectedBrands.length > 0 ? `${selectedBrands.length} marque(s)` : 'Toutes les marques'}</span>
            <Icon icon="mdi:chevron-down" className="h-4 w-4 flex-shrink-0" />
          </button>
          
          {isBrandDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableBrands.map((brand) => (
                <label
                  key={brand.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.id)}
                    onChange={() => toggleBrand(brand.id)}
                    className="rounded border-gray-300 accent-marlon-green text-marlon-green focus:ring-marlon-green"
                  />
                  <span className="text-sm text-gray-700">{brand.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Prix:</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Search bar + Mobile filter icon */}
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Mobile filter button */}
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className="lg:hidden relative flex items-center justify-center w-11 h-11 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
          aria-label="Filtres"
        >
          <Icon icon="mdi:tune-variant" className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-marlon-green text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={() => { setIsFilterSheetOpen(false); setIsBrandDropdownOpen(false); }}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl animate-slide-up max-h-[80vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Filtres</h3>
              <button
                onClick={() => { setIsFilterSheetOpen(false); setIsBrandDropdownOpen(false); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Brand filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marque</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableBrands.map((brand) => (
                    <label
                      key={brand.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.id)}
                        onChange={() => toggleBrand(brand.id)}
                        className="rounded border-gray-300 accent-marlon-green text-marlon-green focus:ring-marlon-green"
                      />
                      <span className="text-sm text-gray-700">{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prix mensuel (€ HT)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-3 space-y-2">
              <button
                onClick={() => { setIsFilterSheetOpen(false); setIsBrandDropdownOpen(false); }}
                className="w-full py-2.5 text-sm font-medium text-white bg-marlon-green rounded-lg hover:bg-marlon-green/90 transition-colors"
              >
                Voir les résultats
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedBrands([]);
                    setMinPrice('');
                    setMaxPrice('');
                    setIsFilterSheetOpen(false);
                    setIsBrandDropdownOpen(false);
                  }}
                  className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div>
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-2">
            {filteredProducts.map((product) => {
              const imageUrl = getProductImage(product);
              const monthlyPrice = calculateMonthlyPrice(product);

              return (
                <Link
                  key={product.id}
                  href={`/catalog/product/${product.id}`}
                  className="flex flex-col rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative w-full aspect-square bg-white flex items-center justify-center p-2">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-gray-300 text-[10px]">Pas d&apos;image</span>
                    )}
                  </div>
                  <div className="p-1.5 flex-1 flex flex-col">
                    <h3 className="text-[10px] lg:text-[11px] font-medium text-[#1a365d] text-center leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <div className="mt-auto text-center">
                      <p className="text-[9px] text-gray-500">à partir de</p>
                      <p className="text-[10px] lg:text-[11px] font-bold text-gray-900">
                        {monthlyPrice.toFixed(2)} € <span className="font-normal text-gray-500">/mois</span>
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Icon icon="mdi:package-variant" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Aucun produit dans cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
}
