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
}

interface Specialty {
  id: string;
  name: string;
}

interface ItType {
  id: string;
  name: string;
}

interface CatalogClientProps {
  initialCategories: Category[];
  categoryProductTypes: Record<string, string[]>;
  categorySpecialties: Record<string, string[]>;
  categoryItTypes: Record<string, string[]>;
  specialties: Specialty[];
  itTypes: ItType[];
}

export default function CatalogClient({ 
  initialCategories, 
  categoryProductTypes,
  categorySpecialties,
  categoryItTypes,
  specialties,
  itTypes
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

  // Filter categories based on active filters
  const filteredCategories = initialCategories.filter((category) => {
    // If medical equipment is selected and a specialty is selected
    if (activeProductType === 'medical_equipment' && selectedSpecialty) {
      const catSpecialties = categorySpecialties[category.id] || [];
      return catSpecialties.includes(selectedSpecialty);
    }

    // If IT equipment is selected and an IT type is selected
    if (activeProductType === 'it_equipment' && selectedItType) {
      const catItTypes = categoryItTypes[category.id] || [];
      return catItTypes.includes(selectedItType);
    }
    
    // If a product type is selected
    if (activeProductType) {
      const productTypes = categoryProductTypes[category.id] || [];
      return productTypes.includes(activeProductType);
    }
    
    return true;
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
    setActiveProductType(itTypeId ? 'it_equipment' : null);
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

      {/* Categories grid */}
      {filteredCategories.length > 0 ? (
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
                  <span className="text-gray-300 text-xs">Pas d'image</span>
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
