'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  className = '',
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-left text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green flex items-center justify-between ${
          !selectedOption ? 'text-[#525C6B]' : ''
        }`}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <Icon
          icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          className="h-5 w-5 text-gray-400"
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Icon
                icon="mdi:magnify"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm text-black placeholder-gray-400 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    value === option.value
                      ? 'bg-marlon-green-light text-marlon-green'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">Aucun résultat</div>
            )}
          </div>
        </div>
      )}

      {required && !value && (
        <input
          type="text"
          value=""
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
