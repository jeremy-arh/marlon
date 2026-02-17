'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  product_type?: string;
}

interface Specialty {
  id: string;
  name: string;
}

interface ItCategory {
  id: string;
  name: string;
  slug?: string;
}

interface ItProduct {
  id: string;
  name: string;
  slug?: string;
  reference?: string;
  description?: string;
  purchase_price_ht: number;
  marlon_margin_percent: number;
  brand_id?: string;
  brands?: { id: string; name: string };
  product_images?: { image_url: string; order_index: number }[];
}

interface CatalogClientProps {
  initialCategories: Category[];
  categoryProductTypes: Record<string, string[]>;
  categorySpecialties: Record<string, string[]>;
  categoryItTypes: Record<string, string[]>;
  specialties: Specialty[];
  itCategories: ItCategory[];
  itCategoryProducts: Record<string, ItProduct[]>;
  allItProducts: ItProduct[];
  allMedicalProducts: ItProduct[];
  coefficient: number;
  productCheapestPrices: Record<string, number>;
  productCheapestImages: Record<string, string | null>;
  productCheapestId: Record<string, string>;
  productCheapestSlug: Record<string, string>;
}

export default function CatalogClient({ 
  initialCategories, 
  categoryProductTypes,
  categorySpecialties,
  categoryItTypes,
  specialties,
  itCategories,
  itCategoryProducts,
  allItProducts,
  allMedicalProducts,
  coefficient,
  productCheapestPrices,
  productCheapestImages,
  productCheapestId,
  productCheapestSlug
}: CatalogClientProps) {
  const searchParams = useSearchParams();
  const urlType = searchParams.get('type');
  const urlSpecialty = searchParams.get('specialty');
  const urlItCategory = searchParams.get('itCategory');
  
  const [activeProductType, setActiveProductType] = useState<string | null>(urlType);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(urlSpecialty);
  const [selectedItCategory, setSelectedItCategory] = useState<string | null>(urlItCategory);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [itCategorySearch, setItCategorySearch] = useState('');
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const [isItTypeDropdownOpen, setIsItTypeDropdownOpen] = useState(false);
  const specialtyDropdownRef = useRef<HTMLDivElement>(null);
  const itTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize from URL params
  useEffect(() => {
    if (urlType) {
      setActiveProductType(urlType);
    }
    if (urlSpecialty) {
      setSelectedSpecialty(urlSpecialty);
      setActiveProductType('medical_equipment');
    }
    if (urlItCategory) {
      setSelectedItCategory(urlItCategory);
      setActiveProductType('it_equipment');
    }
  }, [urlType, urlSpecialty, urlItCategory]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialtyDropdownRef.current && !specialtyDropdownRef.current.contains(event.target as Node)) {
        setIsSpecialtyDropdownOpen(false);
      }
      if (itTypeDropdownRef.current && !itTypeDropdownRef.current.contains(event.target as Node)) {
        setIsItTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter specialties based on search
  const filteredSpecialties = specialties.filter(s => 
    s.name.toLowerCase().includes(specialtySearch.toLowerCase())
  );

  // Filter IT categories based on search
  const filteredItCategories = itCategories.filter(c => 
    c.name.toLowerCase().includes(itCategorySearch.toLowerCase())
  );

  // Filter categories based on active filters (no search filter on categories)
  const filteredCategories = initialCategories.filter((category) => {
    // If medical equipment is selected and a specialty is selected
    if (activeProductType === 'medical_equipment' && selectedSpecialty) {
      if (category.product_type !== 'medical_equipment') return false;
      const catSpecialties = categorySpecialties[category.id] || [];
      return catSpecialties.includes(selectedSpecialty);
    }

    // If IT equipment is selected and an IT category is selected
    if (activeProductType === 'it_equipment' && selectedItCategory) {
      return category.id === selectedItCategory;
    }
    
    // If a product type is selected, filter by category's own product_type
    if (activeProductType) {
      return category.product_type === activeProductType;
    }
    
    // By default (no filter), show only medical equipment categories
    return category.product_type === 'medical_equipment';
  });

  const handleSpecialtySelect = (specialtyId: string | null) => {
    setSelectedSpecialty(specialtyId);
    setSelectedItCategory(null);
    setActiveProductType(specialtyId ? 'medical_equipment' : null);
    setIsSpecialtyDropdownOpen(false);
    setSpecialtySearch('');
  };

  const handleItCategorySelect = (categoryId: string | null) => {
    setSelectedItCategory(categoryId);
    setSelectedSpecialty(null);
    setActiveProductType('it_equipment');
    setIsItTypeDropdownOpen(false);
    setItCategorySearch('');
  };

  const getSpecialtyLabel = () => {
    if (selectedSpecialty) {
      return specialties.find(s => s.id === selectedSpecialty)?.name || 'Matériel médical';
    }
    return 'Matériel médical';
  };

  const getItCategoryLabel = () => {
    if (selectedItCategory) {
      return itCategories.find(c => c.id === selectedItCategory)?.name || 'Informatique';
    }
    return 'Informatique';
  };

  // IT products helpers
  const calculateMonthlyPrice = (product: ItProduct) => {
    const priceHT = product.purchase_price_ht * (1 + product.marlon_margin_percent / 100);
    const monthly = priceHT * coefficient;
    return monthly;
  };

  const getProductImage = (product: ItProduct) => {
    if (product.product_images && product.product_images.length > 0) {
      const sorted = [...product.product_images].sort((a, b) => a.order_index - b.order_index);
      return sorted[0].image_url;
    }
    return null;
  };

  // Get the IT products to display based on selected IT category
  const displayItProducts = selectedItCategory 
    ? (itCategoryProducts[selectedItCategory] || [])
    : (activeProductType === 'it_equipment' ? allItProducts : []);

  // Should we show IT products directly?
  const showItProducts = activeProductType === 'it_equipment';

  // If there's a search query, combine all products (medical + IT) and filter them
  let searchResults: ItProduct[] = [];
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    // Combine all products
    const allProducts = [...allMedicalProducts, ...allItProducts];
    // Filter by search query
    searchResults = allProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.reference?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  }

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Count active filters for badge
  const activeFilterCount = [activeProductType, selectedSpecialty, selectedItCategory].filter(Boolean).length;

  // Lock body scroll when filter sheet is open
  useEffect(() => {
    if (isFilterSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFilterSheetOpen]);

  // Shared filter content renderer
  const renderFilters = (isMobile: boolean) => (
    <>
      {/* Matériel médical - Searchable dropdown */}
      <div className={`relative ${isMobile ? 'w-full' : ''}`} ref={isMobile ? undefined : specialtyDropdownRef}>
        <button
          onClick={() => {
            if (isMobile) {
              setIsSpecialtyDropdownOpen(!isSpecialtyDropdownOpen);
              setIsItTypeDropdownOpen(false);
            } else {
              setIsSpecialtyDropdownOpen(!isSpecialtyDropdownOpen);
              setIsItTypeDropdownOpen(false);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isMobile ? 'w-full justify-center' : 'min-w-[180px] justify-between'} ${
            activeProductType === 'medical_equipment'
              ? 'bg-marlon-green text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>{getSpecialtyLabel()}</span>
          <Icon icon="mdi:chevron-down" className="h-4 w-4" />
        </button>
        
        {isSpecialtyDropdownOpen && (
          <div className={`${isMobile ? 'mt-1 w-full' : 'absolute top-full left-0 mt-1 w-64'} bg-white border border-gray-200 rounded-lg shadow-lg z-50`}>
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={specialtySearch}
                onChange={(e) => setSpecialtySearch(e.target.value)}
                placeholder="Rechercher une spécialité..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              <button
                onClick={() => { handleSpecialtySelect(null); if (isMobile) setIsFilterSheetOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-600"
              >
                Toutes les spécialités
              </button>
              {filteredSpecialties.map((specialty) => (
                <button
                  key={specialty.id}
                  onClick={() => { handleSpecialtySelect(specialty.id); if (isMobile) setIsFilterSheetOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    selectedSpecialty === specialty.id ? 'bg-marlon-green/10 text-marlon-green' : 'text-gray-700'
                  }`}
                >
                  {specialty.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobilier */}
      <button
        onClick={() => {
          setActiveProductType(activeProductType === 'furniture' ? null : 'furniture');
          setSelectedSpecialty(null);
          setSelectedItCategory(null);
          if (isMobile) setIsFilterSheetOpen(false);
        }}
        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isMobile ? 'w-full text-center' : ''} ${
          activeProductType === 'furniture'
            ? 'bg-marlon-green text-white'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        Mobilier
      </button>

      {/* Informatique - Searchable dropdown */}
      <div className={`relative ${isMobile ? 'w-full' : ''}`} ref={isMobile ? undefined : itTypeDropdownRef}>
        <button
          onClick={() => {
            setIsItTypeDropdownOpen(!isItTypeDropdownOpen);
            setIsSpecialtyDropdownOpen(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isMobile ? 'w-full justify-center' : 'min-w-[160px] justify-between'} ${
            activeProductType === 'it_equipment'
              ? 'bg-marlon-green text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>{getItCategoryLabel()}</span>
          <Icon icon="mdi:chevron-down" className="h-4 w-4" />
        </button>
        
        {isItTypeDropdownOpen && (
          <div className={`${isMobile ? 'mt-1 w-full' : 'absolute top-full left-0 mt-1 w-64'} bg-white border border-gray-200 rounded-lg shadow-lg z-50`}>
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={itCategorySearch}
                onChange={(e) => setItCategorySearch(e.target.value)}
                placeholder="Rechercher une catégorie..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              <button
                onClick={() => { handleItCategorySelect(null); if (isMobile) setIsFilterSheetOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-600"
              >
                Tous les équipements IT
              </button>
              {filteredItCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => { handleItCategorySelect(category.id); if (isMobile) setIsFilterSheetOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    selectedItCategory === category.id ? 'bg-marlon-green/10 text-marlon-green' : 'text-gray-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="p-4 lg:p-8">
      <PageHeader title="Catalogue" />
      
      {/* Desktop Filters bar */}
      <div className="mb-8 hidden lg:flex items-center gap-3 flex-wrap">
        {renderFilters(false)}
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
            onClick={() => { setIsFilterSheetOpen(false); setIsSpecialtyDropdownOpen(false); setIsItTypeDropdownOpen(false); }}
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
                onClick={() => { setIsFilterSheetOpen(false); setIsSpecialtyDropdownOpen(false); setIsItTypeDropdownOpen(false); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {renderFilters(true)}
            </div>
            {/* Footer with reset */}
            {activeFilterCount > 0 && (
              <div className="border-t border-gray-200 px-5 py-3">
                <button
                  onClick={() => {
                    setActiveProductType(null);
                    setSelectedSpecialty(null);
                    setSelectedItCategory(null);
                    setIsFilterSheetOpen(false);
                    setIsSpecialtyDropdownOpen(false);
                    setIsItTypeDropdownOpen(false);
                  }}
                  className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content: Search results, IT Products grid or Categories grid */}
      {searchQuery.trim() ? (
        // Show search results (all products) - triés du moins cher au plus cher
        searchResults.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-2">
            {[...searchResults]
              .sort((a, b) => {
                const priceA = productCheapestPrices[a.id] ?? calculateMonthlyPrice(a);
                const priceB = productCheapestPrices[b.id] ?? calculateMonthlyPrice(b);
                return priceA - priceB;
              })
              .map((product) => {
              const cheapestImage = productCheapestImages[product.id];
              const imageUrl = cheapestImage || getProductImage(product);
              const monthlyPrice = productCheapestPrices[product.id] ?? calculateMonthlyPrice(product);
              const targetSlug = productCheapestSlug[product.id] || product.slug || product.id;

              return (
                <Link
                  key={product.id}
                  href={`/catalog/product/${targetSlug}`}
                  className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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
                    <h3 className="text-[10px] lg:text-[11px] font-medium text-gray-900 text-center leading-tight line-clamp-2 mb-1">
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
            <p className="text-gray-600">Aucun produit trouvé pour &quot;{searchQuery}&quot;.</p>
          </div>
        )
      ) : showItProducts ? (
        // Show IT products directly - triés du moins cher au plus cher
        displayItProducts.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-2">
            {[...displayItProducts]
              .sort((a, b) => {
                const priceA = productCheapestPrices[a.id] ?? calculateMonthlyPrice(a);
                const priceB = productCheapestPrices[b.id] ?? calculateMonthlyPrice(b);
                return priceA - priceB;
              })
              .map((product) => {
              const cheapestImage = productCheapestImages[product.id];
              const imageUrl = cheapestImage || getProductImage(product);
              const monthlyPrice = productCheapestPrices[product.id] ?? calculateMonthlyPrice(product);
              const targetSlug = productCheapestSlug[product.id] || product.slug || product.id;

              return (
                <Link
                  key={product.id}
                  href={`/catalog/product/${targetSlug}`}
                  className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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
                    <h3 className="text-[10px] lg:text-[11px] font-medium text-gray-900 text-center leading-tight line-clamp-2 mb-1">
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
            <p className="text-gray-600">Aucun produit informatique disponible.</p>
          </div>
        )
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-2">
          {filteredCategories.map((category) => (
            <Link
              key={category.id}
              href={`/catalog/category/${category.slug || category.id}`}
              className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative w-full aspect-square bg-white flex items-center justify-center p-2">
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt={category.name}
                    fill
                    className="object-contain p-1.5"
                  />
                ) : (
                  <span className="text-gray-300 text-[10px]">Pas d&apos;image</span>
                )}
              </div>
              <div className="py-1.5 px-1">
                <h2 className="text-[10px] lg:text-[11px] font-medium text-gray-900 text-center leading-tight line-clamp-2">{category.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Icon icon="mdi:package-variant" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Aucune catégorie disponible.</p>
        </div>
      )}
    </div>
  );
}
