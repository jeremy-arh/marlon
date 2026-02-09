'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from './Icon';

interface AddressComponents {
  address: string;
  city: string;
  postal_code: string;
  country: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (components: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

interface AddressSuggestion {
  label: string;
  housenumber?: string;
  street?: string;
  name?: string;
  postcode?: string;
  city?: string;
  context?: string;
}

// Simple cache for API results
const cache = new Map<string, AddressSuggestion[]>();

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Rechercher une adresse...',
  className = '',
  error = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions from French government API
  const fetchSuggestions = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      setSuggestions(cached);
      setShowDropdown(cached.length > 0);
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6&autocomplete=1`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      
      const formattedSuggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
        label: feature.properties.label,
        housenumber: feature.properties.housenumber,
        street: feature.properties.street,
        name: feature.properties.name,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        context: feature.properties.context,
      }));

      // Store in cache
      cache.set(cacheKey, formattedSuggestions);
      
      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }

      setSuggestions(formattedSuggestions);
      setShowDropdown(formattedSuggestions.length > 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching address suggestions:', err);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search - fast debounce (150ms)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Quick debounce for responsive feel
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 150);
  }, [onChange, fetchSuggestions]);

  // Handle suggestion selection
  const handleSelect = useCallback((suggestion: AddressSuggestion) => {
    // Build address string
    const address = suggestion.housenumber 
      ? `${suggestion.housenumber} ${suggestion.street || suggestion.name || ''}`
      : suggestion.street || suggestion.name || suggestion.label;

    onChange(address.trim());
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    if (onAddressSelect) {
      onAddressSelect({
        address: address.trim(),
        city: suggestion.city || '',
        postal_code: suggestion.postcode || '',
        country: 'France',
      });
    }
  }, [onChange, onAddressSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        setShowDropdown(false);
        break;
    }
  }, [showDropdown, suggestions, selectedIndex, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= 3) {
              fetchSuggestions(value);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent transition-shadow ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${className}`}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Icon icon="mdi:loading" className="h-5 w-5 animate-spin text-marlon-green" />
          ) : (
            <Icon icon="mdi:map-marker" className="h-5 w-5 text-gray-400" />
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setShowDropdown(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <Icon icon="mdi:close" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.label}-${index}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                index === selectedIndex 
                  ? 'bg-marlon-green/10 text-marlon-green' 
                  : 'hover:bg-gray-50'
              } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <Icon 
                icon="mdi:map-marker" 
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  index === selectedIndex ? 'text-marlon-green' : 'text-gray-400'
                }`} 
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  index === selectedIndex ? 'text-marlon-green' : 'text-gray-900'
                }`}>
                  {suggestion.label}
                </p>
                {suggestion.context && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {suggestion.context}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading state when no results yet */}
      {showDropdown && isLoading && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
            <span className="text-sm">Recherche en cours...</span>
          </div>
        </div>
      )}
    </div>
  );
}
