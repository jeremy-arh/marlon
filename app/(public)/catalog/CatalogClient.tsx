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
  description?: string;
  image_url?: string;
  product_type?: string;
}

interface Specialty {
  id: string;
  name: string;
}

interface ItType {
  id: string;
  name: string;
}

interface ItProduct {
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

interface CatalogClientProps {
  initialCategories: Category[];
  categoryProductTypes: Record<string, string[]>;
  categorySpecialties: Record<string, string[]>;
  categoryItTypes: Record<string, string[]>;
  specialties: Specialty[];
  itTypes: ItType[];
  itTypeProducts: Record<string, ItProduct[]>;
  allItProducts: ItProduct[];
  allMedicalProducts: ItProduct[];
  coefficient: number;
  productCheapestPrices: Record<string, number>;
  productCheapestImages: Record<string, string | null>;
  productCheapestId: Record<string, string>;
}

export default function CatalogClient({ 
  initialCategories, 
  categoryProductTypes,
  categorySpecialties,
  categoryItTypes,
  specialties,
  itTypes,
  itTypeProducts,
  allItProducts,
  allMedicalProducts,
  coefficient,
  productCheapestPrices,
  productCheapestImages,
  productCheapestId
}: CatalogClientProps) {
  const searchParams = useSearchParams();
  const urlType = searchParams.get('type');
  const urlSpecialty = searchParams.get('specialty');
  const urlItType = searchParams.get('itType');
  
  const [activeProductType, setActiveProductType] = useState<string | null>(urlType);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(urlSpecialty);
  const [selectedItType, setSelectedItType] = useState<string | null>(urlItType);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [itTypeSearch, setItTypeSearch] = useState('');
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
    if (urlItType) {
      setSelectedItType(urlItType);
      setActiveProductType('it_equipment');
    }
  }, [urlType, urlSpecialty, urlItType]);

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

  // Filter IT types based on search
  const filteredItTypes = itTypes.filter(t => 
    t.name.toLowerCase().includes(itTypeSearch.toLowerCase())
  );

  // Filter categories based on active filters (no search filter on categories)
  const filteredCategories = initialCategories.filter((category) => {
    // If medical equipment is selected and a specialty is selected
    if (activeProductType === 'medical_equipment' && selectedSpecialty) {
      if (category.product_type !== 'medical_equipment') return false;
      const catSpecialties = categorySpecialties[category.id] || [];
      return catSpecialties.includes(selectedSpecialty);
    }

    // If IT equipment is selected and an IT type is selected
    if (activeProductType === 'it_equipment' && selectedItType) {
      if (category.product_type !== 'it_equipment') return false;
      const catItTypes = categoryItTypes[category.id] || [];
      return catItTypes.includes(selectedItType);
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
    setSelectedItType(null);
    setActiveProductType(specialtyId ? 'medical_equipment' : null);
    setIsSpecialtyDropdownOpen(false);
    setSpecialtySearch('');
  };

  const handleItTypeSelect = (itTypeId: string | null) => {
    setSelectedItType(itTypeId);
    setSelectedSpecialty(null);
    setActiveProductType('it_equipment');
    setIsItTypeDropdownOpen(false);
    setItTypeSearch('');
  };

  const getSpecialtyLabel = () => {
    if (selectedSpecialty) {
      return specialties.find(s => s.id === selectedSpecialty)?.name || 'Matériel médical';
    }
    return 'Matériel médical';
  };

  const getItTypeLabel = () => {
    if (selectedItType) {
      return itTypes.find(t => t.id === selectedItType)?.name || 'Informatique';
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

  // Get the IT products to display based on selected IT type
  const displayItProducts = selectedItType 
    ? (itTypeProducts[selectedItType] || [])
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

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Catalogue" />
      
      {/* Filters bar */}
      <div className="mb-8 flex items-center gap-3 flex-wrap">
          {/* Matériel médical - Searchable dropdown */}
          <div className="relative" ref={specialtyDropdownRef}>
            <button
              onClick={() => {
                setIsSpecialtyDropdownOpen(!isSpecialtyDropdownOpen);
                setIsItTypeDropdownOpen(false);
              }}
              className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-sm font-medium min-w-[180px] transition-colors ${
                activeProductType === 'medical_equipment'
                  ? 'bg-marlon-green text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{getSpecialtyLabel()}</span>
              <Icon icon="mdi:chevron-down" className="h-4 w-4" />
            </button>
            
            {isSpecialtyDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Search input */}
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    value={specialtySearch}
                    onChange={(e) => setSpecialtySearch(e.target.value)}
                    placeholder="Rechercher une spécialité..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
                  />
                </div>
                
                {/* Options list */}
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleSpecialtySelect(null)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-600"
                  >
                    Toutes les spécialités
                  </button>
                  {filteredSpecialties.map((specialty) => (
                    <button
                      key={specialty.id}
                      onClick={() => handleSpecialtySelect(specialty.id)}
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
              setSelectedItType(null);
            }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeProductType === 'furniture'
                ? 'bg-marlon-green text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mobilier
          </button>

          {/* Informatique - Searchable dropdown */}
          <div className="relative" ref={itTypeDropdownRef}>
            <button
              onClick={() => {
                setIsItTypeDropdownOpen(!isItTypeDropdownOpen);
                setIsSpecialtyDropdownOpen(false);
              }}
              className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-sm font-medium min-w-[160px] transition-colors ${
                activeProductType === 'it_equipment'
                  ? 'bg-marlon-green text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{getItTypeLabel()}</span>
              <Icon icon="mdi:chevron-down" className="h-4 w-4" />
            </button>
            
            {isItTypeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Search input */}
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    value={itTypeSearch}
                    onChange={(e) => setItTypeSearch(e.target.value)}
                    placeholder="Rechercher un type..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
                  />
                </div>
                
                {/* Options list */}
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleItTypeSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-600"
                  >
                    Tous les équipements IT
                  </button>
                  {filteredItTypes.map((itType) => (
                    <button
                      key={itType.id}
                      onClick={() => handleItTypeSelect(itType.id)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedItType === itType.id ? 'bg-marlon-green/10 text-marlon-green' : 'text-gray-700'
                      }`}
                    >
                      {itType.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative w-full">
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
      </div>

      {/* Content: Search results, IT Products grid or Categories grid */}
      {searchQuery.trim() ? (
        // Show search results (all products)
        searchResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {searchResults.map((product) => {
              const cheapestImage = productCheapestImages[product.id];
              const imageUrl = cheapestImage || getProductImage(product);
              const monthlyPrice = productCheapestPrices[product.id] ?? calculateMonthlyPrice(product);
              const targetProductId = productCheapestId[product.id] || product.id;

              return (
                <Link
                  key={product.id}
                  href={`/catalog/product/${targetProductId}`}
                  className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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
                      <span className="text-gray-300 text-xs">Pas d&apos;image</span>
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
            <p className="text-gray-600">Aucun produit trouvé pour &quot;{searchQuery}&quot;.</p>
          </div>
        )
      ) : showItProducts ? (
        // Show IT products directly
        displayItProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayItProducts.map((product) => {
              // Utiliser l'image de la variante la moins chère, sinon celle du produit principal
              const cheapestImage = productCheapestImages[product.id];
              const imageUrl = cheapestImage || getProductImage(product);
              // Utiliser le prix le moins cher pré-calculé côté serveur, sinon fallback sur le prix du produit principal
              const monthlyPrice = productCheapestPrices[product.id] ?? calculateMonthlyPrice(product);
              // Lien vers la variante la moins chère (ou le produit principal si c'est le moins cher)
              const targetProductId = productCheapestId[product.id] || product.id;

              return (
                <Link
                  key={product.id}
                  href={`/catalog/product/${targetProductId}`}
                  className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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
                      <span className="text-gray-300 text-xs">Pas d&apos;image</span>
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
            <p className="text-gray-600">Aucun produit informatique disponible.</p>
          </div>
        )
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredCategories.map((category) => (
            <Link
              key={category.id}
              href={`/catalog/category/${category.id}`}
              className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative w-full aspect-square bg-white flex items-center justify-center p-3">
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt={category.name}
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-gray-300 text-xs">Pas d&apos;image</span>
                )}
              </div>
              <div className="py-2 px-1">
                <h2 className="text-xs font-medium text-gray-900 text-center leading-tight line-clamp-2">{category.name}</h2>
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
