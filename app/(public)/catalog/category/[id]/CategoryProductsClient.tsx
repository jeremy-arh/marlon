'use client';

import { useState } from 'react';
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
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);

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
    <div className="p-6 lg:p-8">
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

      {/* Filters bar */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
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

      {/* Main content */}
      <div className="p-6">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-gray-300 text-xs">Pas d'image</span>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-xs font-medium text-[#1a365d] text-center leading-tight line-clamp-3 mb-2">
                      {product.name}
                    </h3>
                    <div className="mt-auto text-center">
                      <p className="text-[10px] text-gray-500">à partir de</p>
                      <p className="text-xs font-bold text-gray-900">
                        {monthlyPrice.toFixed(2)} € HT <span className="font-normal text-gray-500">/mois</span>
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
