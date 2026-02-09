'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  className = '',
  disabled = false,
}: MultiSelectProps) {
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

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-left text-sm text-black focus-within:border-marlon-green focus-within:outline-none focus-within:ring-1 focus-within:ring-marlon-green min-h-[42px] flex items-center flex-wrap gap-2 ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          selectedOptions.length === 0 ? 'text-[#525C6B]' : ''
        }`}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded bg-marlon-green-light px-2 py-1 text-xs text-marlon-green"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(option.value, e);
                  }}
                  className="hover:text-marlon-green/80"
                >
                  <Icon icon="mdi:close" className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span>{placeholder}</span>
        )}
        <Icon
          icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          className="h-5 w-5 text-gray-400 flex-shrink-0"
        />
      </div>

      {isOpen && !disabled && (
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
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'bg-marlon-green-light text-marlon-green'
                        : 'text-black hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-marlon-green bg-marlon-green'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <Icon icon="mdi:check" className="h-3 w-3 text-white" />
                      )}
                    </div>
                    {option.label}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
