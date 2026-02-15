'use client';

import { useState, useMemo, useRef, useEffect, Fragment, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import ProductForm from '@/components/ProductForm';

// ============================================================
// Composant réutilisable : Select avec recherche
// ============================================================
interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fermer quand on clique ailleurs
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-sm border rounded-md px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[140px] text-left ${
          value ? 'border-marlon-green text-black' : 'border-gray-300 text-gray-500'
        }`}
      >
        <span className="truncate flex-1">{selectedLabel || placeholder}</span>
        <Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-black placeholder-gray-400 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {/* Option "Tout" pour réinitialiser */}
            <button
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                !value ? 'bg-green-50 text-marlon-green font-medium' : 'text-gray-500'
              }`}
            >
              {placeholder}
            </button>

            {filtered.length > 0 ? (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    opt.value === value ? 'bg-green-50 text-marlon-green font-medium' : 'text-gray-700'
                  }`}
                >
                  {opt.value === value && (
                    <Icon icon="mdi:check" className="h-3.5 w-3.5 text-marlon-green flex-shrink-0" />
                  )}
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${opt.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Composant compact pour les lignes du tableau (searchable)
// ============================================================
function InlineSearchableSelect({
  options,
  value,
  onChange,
  placeholder = '— Aucun —',
  maxWidth = 'max-w-[130px]',
}: {
  options: { value: string; label: string; badge?: string; badgeColor?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxWidth?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-xs border rounded px-1.5 py-1 bg-white text-gray-800 hover:border-gray-300 focus:border-marlon-green focus:ring-1 focus:ring-marlon-green focus:outline-none cursor-pointer ${maxWidth} w-full text-left ${
          value ? 'border-gray-300' : 'border-gray-200'
        }`}
      >
        <span className="truncate flex-1">{selectedLabel || placeholder}</span>
        <Icon icon="mdi:chevron-down" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Barre de recherche */}
          {options.length > 5 && (
            <div className="p-1.5 border-b border-gray-100">
              <div className="relative">
                <Icon icon="mdi:magnify" className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-black placeholder-gray-400 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {/* Option placeholder / reset */}
            <button
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                !value ? 'bg-green-50 text-marlon-green font-medium' : 'text-gray-400'
              }`}
            >
              {placeholder}
            </button>

            {filtered.length > 0 ? (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-1.5 ${
                    opt.value === value ? 'bg-green-50 text-marlon-green font-medium' : 'text-gray-700'
                  }`}
                >
                  {opt.value === value && <Icon icon="mdi:check" className="h-3 w-3 text-marlon-green flex-shrink-0" />}
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className={`ml-auto text-[9px] px-1 py-0.5 rounded-full flex-shrink-0 ${opt.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-[10px] text-gray-400 text-center">Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Leaser {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  product_type?: string;
}

interface ProductsClientProps {
  initialProducts: any[];
  durations: Array<{ id: string; months: number }>;
  leasers: Leaser[];
  categories: Category[];
}

const PRODUCT_TYPES = [
  { value: 'medical_equipment', label: 'Médical' },
  { value: 'it_equipment', label: 'IT' },
  { value: 'furniture', label: 'Mobilier' },
];

const MARGIN_OPTIONS = [5, 10, 15, 17, 20, 25, 30, 35, 40, 45, 50];

export default function ProductsClient({ initialProducts, durations, leasers, categories }: ProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [savingFields, setSavingFields] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // --- Filtres ---
  const [filterType, setFilterType] = useState('');
  const [filterLeaser, setFilterLeaser] = useState('');
  const [filterMargin, setFilterMargin] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  // Extraire les marques uniques depuis les produits
  const uniqueBrands = useMemo(() => {
    const brands = new Map<string, string>();
    products.forEach(p => {
      if (p.brand?.name) {
        brands.set(p.brand.name.toLowerCase(), p.brand.name);
      }
    });
    return Array.from(brands.values()).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Extraire les marges uniques depuis les produits
  const uniqueMargins = useMemo(() => {
    const margins = new Set<number>();
    products.forEach(p => {
      if (p.marlon_margin_percent != null) {
        margins.add(parseFloat(p.marlon_margin_percent.toString()));
      }
    });
    return Array.from(margins).sort((a, b) => a - b);
  }, [products]);

  const hasActiveFilters = filterType || filterLeaser || filterMargin || filterCategory || filterBrand;

  const clearAllFilters = () => {
    setFilterType('');
    setFilterLeaser('');
    setFilterMargin('');
    setFilterCategory('');
    setFilterBrand('');
    setSearchQuery('');
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/list', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (product: any) => {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`);
      const data = await response.json();
      if (data.success) {
        setEditingProduct(data.data);
        setIsModalOpen(true);
      } else {
        setEditingProduct(product);
        setIsModalOpen(true);
      }
    } catch (error) {
      setEditingProduct(product);
      setIsModalOpen(true);
    }
  };

  const handleSuccess = () => {
    if (editingProduct) {
      setIsModalOpen(false);
      setEditingProduct(null);
    }
    loadProducts();
    router.refresh();
  };

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // ---- Mise à jour rapide inline via PATCH ----
  const patchProduct = useCallback(async (productId: string, field: string, body: Record<string, any>) => {
    const savingKey = `${productId}-${field}`;
    setSavingFields(prev => ({ ...prev, [savingKey]: 'saving' }));

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      setSavingFields(prev => ({ ...prev, [savingKey]: 'saved' }));
      setTimeout(() => {
        setSavingFields(prev => {
          const next = { ...prev };
          delete next[savingKey];
          return next;
        });
      }, 1500);

      return true;
    } catch (error) {
      console.error('Erreur PATCH:', error);
      setSavingFields(prev => ({ ...prev, [savingKey]: 'error' }));
      setTimeout(() => {
        setSavingFields(prev => {
          const next = { ...prev };
          delete next[savingKey];
          return next;
        });
      }, 3000);
      return false;
    }
  }, []);

  const handleLeaserChange = async (productId: string, leaserId: string) => {
    // Mise à jour locale optimiste
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, default_leaser_id: leaserId || null, default_leaser: leasers.find(l => l.id === leaserId) || null }
        : p
    ));
    await patchProduct(productId, 'leaser', { default_leaser_id: leaserId || null });
  };

  const handleMarginChange = async (productId: string, margin: string) => {
    const value = parseFloat(margin);
    if (isNaN(value)) return;
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, marlon_margin_percent: value } : p
    ));
    await patchProduct(productId, 'margin', { marlon_margin_percent: value });
  };

  const handleProductTypeChange = async (productId: string, productType: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, product_type: productType } : p
    ));
    await patchProduct(productId, 'type', { product_type: productType });
  };

  const handleCategoriesChange = async (productId: string, categoryIds: string[]) => {
    // Mise à jour locale optimiste
    const newCategories = categoryIds.map(cid => {
      const cat = categories.find(c => c.id === cid);
      return { product_id: productId, category_id: cid, category: cat ? { name: cat.name } : null };
    });
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, product_categories: newCategories } : p
    ));
    await patchProduct(productId, 'categories', { category_ids: categoryIds });
  };

  // Helper : statut de sauvegarde
  const getSaveIndicator = (productId: string, field: string) => {
    const status = savingFields[`${productId}-${field}`];
    if (status === 'saving') return <Icon icon="mdi:loading" className="h-3 w-3 text-gray-400 animate-spin" />;
    if (status === 'saved') return <Icon icon="mdi:check" className="h-3 w-3 text-green-500" />;
    if (status === 'error') return <Icon icon="mdi:alert-circle" className="h-3 w-3 text-red-500" />;
    return null;
  };

  // Filtre de recherche + filtres dropdown
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (p.name || '').toLowerCase().includes(q) ||
          (p.reference || '').toLowerCase().includes(q) ||
          (p.brand?.name || '').toLowerCase().includes(q) ||
          (p.serial_number || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Filtre type
      if (filterType && p.product_type !== filterType) return false;

      // Filtre leaser
      if (filterLeaser) {
        if (filterLeaser === '__none__') {
          if (p.default_leaser_id) return false;
        } else {
          if (p.default_leaser_id !== filterLeaser) return false;
        }
      }

      // Filtre marge
      if (filterMargin) {
        const marginVal = parseFloat(filterMargin);
        if (parseFloat(p.marlon_margin_percent?.toString() || '0') !== marginVal) return false;
      }

      // Filtre catégorie
      if (filterCategory) {
        const productCatIds = (p.product_categories || []).map((pc: any) => pc.category_id);
        if (!productCatIds.includes(filterCategory)) return false;
      }

      // Filtre marque
      if (filterBrand) {
        if ((p.brand?.name || '').toLowerCase() !== filterBrand.toLowerCase()) return false;
      }

      return true;
    });
  }, [products, searchQuery, filterType, filterLeaser, filterMargin, filterCategory, filterBrand]);

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Produits</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter un produit
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un produit"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Filter Dropdowns — Searchable */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchableSelect
          placeholder="Tous les types"
          value={filterType}
          onChange={(val) => {
            setFilterType(val);
            // Réinitialiser la catégorie si elle n'est plus compatible avec le nouveau type
            if (val && filterCategory) {
              const cat = categories.find(c => c.id === filterCategory);
              if (cat && cat.product_type !== val) setFilterCategory('');
            }
          }}
          options={PRODUCT_TYPES.map(pt => ({ value: pt.value, label: pt.label }))}
        />

        <SearchableSelect
          placeholder="Toutes les marques"
          value={filterBrand}
          onChange={setFilterBrand}
          options={uniqueBrands.map(b => ({ value: b, label: b }))}
        />

        <SearchableSelect
          placeholder="Tous les leasers"
          value={filterLeaser}
          onChange={setFilterLeaser}
          options={[
            { value: '__none__', label: 'Sans leaser' },
            ...leasers.map(l => ({ value: l.id, label: l.name })),
          ]}
        />

        <SearchableSelect
          placeholder="Toutes les marges"
          value={filterMargin}
          onChange={setFilterMargin}
          options={uniqueMargins.map(m => ({ value: String(m), label: `${m}%` }))}
        />

        <SearchableSelect
          placeholder="Toutes les catégories"
          value={filterCategory}
          onChange={setFilterCategory}
          options={(filterType
            ? categories.filter(c => c.product_type === filterType)
            : categories
          ).map(c => ({
            value: c.id,
            label: c.name,
            badge: c.product_type === 'it_equipment' ? 'IT' : c.product_type === 'furniture' ? 'Mob.' : 'Méd.',
            badgeColor: c.product_type === 'it_equipment'
              ? 'bg-blue-100 text-blue-700'
              : c.product_type === 'furniture'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700',
          }))}
        />

        {/* Réinitialiser + compteur */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-2"
          >
            <Icon icon="mdi:close-circle" className="h-4 w-4" />
            Réinitialiser
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filteredProducts.length} / {products.length} produits
        </span>
      </div>

      {/* Products Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14">Image</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Réf.</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marque</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix achat HT</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marge %</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaser</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégories</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product: any) => {
                  const firstImage = product.product_images && product.product_images.length > 0
                    ? product.product_images.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))[0]?.image_url
                    : null;

                  const isExpanded = expandedProducts.has(product.id);
                  const productCategoryIds = (product.product_categories || []).map((pc: any) => pc.category_id);

                  return (
                    <Fragment key={product.id}>
                      <tr className="hover:bg-gray-50">
                        {/* Chevron expand */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Icon
                              icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                              className="h-5 w-5"
                            />
                          </button>
                        </td>

                        {/* Image */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <Icon icon="mdi:image-off" className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </td>

                        {/* Nom */}
                        <td className="px-3 py-3 text-sm font-medium text-black max-w-[200px] truncate" title={product.name}>
                          {product.name}
                        </td>

                        {/* Référence */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">{product.reference || '-'}</td>

                        {/* Marque */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">{product.brand?.name || '-'}</td>

                        {/* Prix achat HT */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">
                          {parseFloat(product.purchase_price_ht?.toString() || '0').toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>

                        {/* --- DROPDOWN : Type de produit --- */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <InlineSearchableSelect
                              value={product.product_type || ''}
                              onChange={(val) => handleProductTypeChange(product.id, val)}
                              placeholder="— Type —"
                              maxWidth="max-w-[100px]"
                              options={PRODUCT_TYPES.map(pt => ({ value: pt.value, label: pt.label }))}
                            />
                            {getSaveIndicator(product.id, 'type')}
                          </div>
                        </td>

                        {/* --- DROPDOWN : Marge % --- */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <InlineSearchableSelect
                              value={String(parseFloat(product.marlon_margin_percent?.toString() || '30'))}
                              onChange={(val) => handleMarginChange(product.id, val)}
                              placeholder="— Marge —"
                              maxWidth="max-w-[80px]"
                              options={(() => {
                                const currentMargin = parseFloat(product.marlon_margin_percent?.toString() || '30');
                                const allMargins = [...MARGIN_OPTIONS];
                                if (!allMargins.includes(currentMargin)) allMargins.push(currentMargin);
                                allMargins.sort((a, b) => a - b);
                                return allMargins.map(m => ({ value: String(m), label: `${m}%` }));
                              })()}
                            />
                            {getSaveIndicator(product.id, 'margin')}
                          </div>
                        </td>

                        {/* --- DROPDOWN : Leaser par défaut --- */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <InlineSearchableSelect
                              value={product.default_leaser_id || ''}
                              onChange={(val) => handleLeaserChange(product.id, val)}
                              placeholder="— Aucun —"
                              maxWidth="max-w-[130px]"
                              options={leasers.map(l => ({ value: l.id, label: l.name }))}
                            />
                            {getSaveIndicator(product.id, 'leaser')}
                          </div>
                        </td>

                        {/* --- DROPDOWN MULTI : Catégories (filtrées par type du produit) --- */}
                        <td className="px-3 py-3">
                          <CategoriesDropdown
                            productId={product.id}
                            selectedIds={productCategoryIds}
                            categories={categories}
                            productType={product.product_type || ''}
                            onChange={handleCategoriesChange}
                            saveIndicator={getSaveIndicator(product.id, 'categories')}
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => router.push(`/admin/products/${product.id}`)}
                              className="text-marlon-green hover:text-marlon-green/80"
                              title="Voir la fiche"
                            >
                              <Icon icon="mdi:file-document-outline" className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-black hover:text-gray-700"
                              title="Modifier"
                            >
                              <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                            </button>
                            <button className="text-red-600 hover:text-red-800" title="Supprimer">
                              <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${product.id}-details`} className="bg-gray-50">
                          <td colSpan={11} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Prix par durée de leasing */}
                              <div className="bg-white rounded-md border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-black mb-3">Prix par durée de leasing</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {durations.map((duration) => {
                                    const price = product.pricesByDuration?.[duration.months];
                                    return (
                                      <div
                                        key={duration.id}
                                        className="rounded-md border border-gray-200 bg-gray-50 p-3"
                                      >
                                        <div className="text-xs font-medium text-gray-500 mb-2">
                                          {duration.months} mois
                                        </div>
                                        {price ? (
                                          <div className="space-y-1">
                                            <div className="text-sm font-semibold text-black">
                                              {price.monthly.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT/mois
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Total: {price.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-400">Non disponible</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Variantes */}
                              {product.product_type === 'it_equipment' && product.variantCount > 0 && (
                                <div className="bg-white rounded-md border border-gray-200 p-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-black">
                                      {product.variantCount} variante{product.variantCount > 1 ? 's' : ''}
                                    </h4>
                                    <button
                                      onClick={() => router.push(`/admin/products/${product.id}`)}
                                      className="text-sm text-marlon-green hover:underline"
                                    >
                                      Gérer les variantes →
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
      >
        <ProductForm
          product={editingProduct}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
        />
      </SideModal>
    </>
  );
}


// ============================================================
// Composant séparé : Dropdown multi-sélection pour catégories
// ============================================================
function CategoriesDropdown({
  productId,
  selectedIds,
  categories,
  productType,
  onChange,
  saveIndicator,
}: {
  productId: string;
  selectedIds: string[];
  categories: Category[];
  productType: string;
  onChange: (productId: string, categoryIds: string[]) => void;
  saveIndicator: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrer les catégories par type de produit
  const categoriesForType = useMemo(() => {
    if (!productType) return categories;
    return categories.filter(c => c.product_type === productType);
  }, [categories, productType]);

  const selectedNames = selectedIds
    .map(id => categoriesForType.find(c => c.id === id)?.name || categories.find(c => c.id === id)?.name)
    .filter(Boolean);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoriesForType;
    const q = search.toLowerCase();
    return categoriesForType.filter(c => c.name.toLowerCase().includes(q));
  }, [categoriesForType, search]);

  const toggleCategory = (categoryId: string) => {
    const newIds = selectedIds.includes(categoryId)
      ? selectedIds.filter(id => id !== categoryId)
      : [...selectedIds, categoryId];
    onChange(productId, newIds);
  };

  useEffect(() => {
    if (isOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-800 hover:border-gray-300 focus:border-marlon-green focus:ring-1 focus:ring-marlon-green focus:outline-none cursor-pointer max-w-[180px] w-full text-left"
      >
        <span className="truncate flex-1">
          {selectedNames.length > 0
            ? selectedNames.length <= 2
              ? selectedNames.join(', ')
              : `${selectedNames.length} catégories`
            : '— Aucune —'
          }
        </span>
        <Icon icon="mdi:chevron-down" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        {saveIndicator}
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-1.5 border-b border-gray-100">
            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une catégorie..."
                className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-black placeholder-gray-400 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              />
            </div>
          </div>

          {/* Liste des catégories */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded border-gray-300 text-marlon-green focus:ring-marlon-green h-3.5 w-3.5"
                  />
                  <span className="truncate">{cat.name}</span>
                  {cat.product_type && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      cat.product_type === 'it_equipment'
                        ? 'bg-blue-100 text-blue-700'
                        : cat.product_type === 'furniture'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {cat.product_type === 'it_equipment' ? 'IT' : cat.product_type === 'furniture' ? 'Mob.' : 'Méd.'}
                    </span>
                  )}
                </label>
              ))
            ) : (
              <div className="px-3 py-2 text-[10px] text-gray-400 text-center">Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
