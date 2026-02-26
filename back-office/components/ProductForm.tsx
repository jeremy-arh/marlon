'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';
import MultiSelect from '@/components/MultiSelect';
import RichTextEditor from '@/components/RichTextEditor';
import ImageUpload from '@/components/ImageUpload';

interface ProductDocument {
  id?: string;
  name: string;
  file_url: string;
  file_type: string;
  description?: string;
  isNew?: boolean;
}

interface ProductFormProps {
  product?: any;
  parentProduct?: any; // When creating a variant, the parent product is provided
  duplicateFrom?: any; // When duplicating a variant, pre-fill form with this variant's data
  onSuccess: () => void;
  onCancel: () => void;
}

const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'manual', label: 'Manuel utilisateur' },
  { value: 'guide', label: 'Guide de démarrage' },
  { value: 'warranty', label: 'Garantie' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'datasheet', label: 'Fiche technique' },
];

export default function ProductForm({ product, parentProduct, duplicateFrom, onSuccess, onCancel }: ProductFormProps) {
  const isVariantMode = !!parentProduct;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [leasers, setLeasers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ name: '', file_url: '', file_type: 'pdf', description: '' });
  const [variantFilters, setVariantFilters] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const [leaserDurations, setLeaserDurations] = useState<any[]>([]);
  // Source for initial values: product (edit mode), duplicateFrom (duplication), or parentProduct (variant creation)
  const initSource = product || duplicateFrom || parentProduct;
  // product_type: variants don't include it in API response, so use parentProduct when duplicating
  const initialProductType = product?.product_type || duplicateFrom?.product_type || parentProduct?.product_type || '';
  const [formData, setFormData] = useState({
    name: product?.name || (duplicateFrom?.name ? `${duplicateFrom.name} (copie)` : ''),
    reference: product?.reference ?? '', // Empty when creating/duplicating to avoid unique constraint
    description: product?.description || duplicateFrom?.description || '',
    technical_info: product?.technical_info || duplicateFrom?.technical_info || '',
    product_type: initialProductType,
    serial_number: product?.serial_number || duplicateFrom?.serial_number || '',
    purchase_price_ht: product?.purchase_price_ht?.toString() || duplicateFrom?.purchase_price_ht?.toString() || '',
    marlon_margin_percent: product?.marlon_margin_percent?.toString() || duplicateFrom?.marlon_margin_percent?.toString() || initSource?.marlon_margin_percent?.toString() || '',
    supplier_id: initSource?.supplier_id || '',
    brand_id: initSource?.brand_id || '',
    default_leaser_id: initSource?.default_leaser_id || '',
    category_ids: [],
    specialty_ids: [],
    images: [],
    variant_filter_ids: [],
    variant_data: product?.variant_data || duplicateFrom?.variant_data || {},
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/brands').then(r => r.json()),
      fetch('/api/admin/suppliers').then(r => r.json()),
      fetch('/api/admin/leasers').then(r => r.json()),
      fetch('/api/admin/categories/list').then(r => r.json()),
      fetch('/api/admin/specialties').then(r => r.json()),
      fetch('/api/admin/product-variant-filters').then(r => r.json()),
      fetch('/api/admin/leasing-durations').then(r => r.json()),
    ]).then(([brandsData, suppliersData, leasersData, categoriesData, specialtiesData, filtersData, durationsData]) => {
      if (brandsData.success) setBrands(brandsData.data || []);
      if (suppliersData.success) setSuppliers(suppliersData.data || []);
      if (leasersData.success) setLeasers(leasersData.data || []);
      if (categoriesData.success) {
        const allCategories = categoriesData.data || [];
        setCategories(allCategories);
        // Filtrer selon le type de produit initial
        if (product?.product_type) {
          setFilteredCategories(allCategories.filter((cat: any) => cat.product_type === product.product_type));
        } else {
          setFilteredCategories(allCategories);
        }
      }
      if (specialtiesData.success) setSpecialties(specialtiesData.data || []);
      if (filtersData.success) setVariantFilters(filtersData.data || []);
      if (durationsData.success) setLeaserDurations(durationsData.data || []);
    });

    // Load product data if editing
    if (product) {
      // Load product images
      if (product.product_images && Array.isArray(product.product_images)) {
        const sortedImages = [...product.product_images]
          .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          .map((img: any) => img.image_url);
        setFormData(prev => ({ ...prev, images: sortedImages }));
      }

      // Load product categories
      if (product.product_categories && Array.isArray(product.product_categories)) {
        const categoryIds = product.product_categories.map((pc: any) => pc.category_id);
        setFormData(prev => ({ ...prev, category_ids: categoryIds }));
      }

      // Load product specialties
      if (product.product_specialties && Array.isArray(product.product_specialties)) {
        const specialtyIds = product.product_specialties.map((ps: any) => ps.specialty_id);
        setFormData(prev => ({ ...prev, specialty_ids: specialtyIds }));
      }

      // Load product documents
      loadProductDocuments(product.id);

      // Load product variants
      if (product.product_type === 'it_equipment') {
        loadProductVariants(product.id);
      }

      // Load variant filter IDs
      if (product.variant_filter_ids && Array.isArray(product.variant_filter_ids)) {
        setFormData(prev => ({ ...prev, variant_filter_ids: product.variant_filter_ids }));
      }

      // Load variant data (filter values for the main product)
      if (product.variant_data && typeof product.variant_data === 'object') {
        setFormData(prev => ({ ...prev, variant_data: product.variant_data }));
      }
    }

    // Pre-fill from parent product when creating a variant
    if (isVariantMode && parentProduct) {
      // Load parent's categories
      if (parentProduct.product_categories && Array.isArray(parentProduct.product_categories)) {
        const categoryIds = parentProduct.product_categories.map((pc: any) => pc.category_id);
        setFormData(prev => ({ ...prev, category_ids: categoryIds }));
      }
      // Load parent's specialties
      if (parentProduct.product_specialties && Array.isArray(parentProduct.product_specialties)) {
        const specialtyIds = parentProduct.product_specialties.map((ps: any) => ps.specialty_id);
        setFormData(prev => ({ ...prev, specialty_ids: specialtyIds }));
      }
      // Load parent's variant filter IDs
      if (parentProduct.variant_filter_ids && Array.isArray(parentProduct.variant_filter_ids)) {
        setFormData(prev => ({ ...prev, variant_filter_ids: parentProduct.variant_filter_ids }));
      }
    }

    // Pre-fill images when duplicating a variant
    if (duplicateFrom?.product_images && Array.isArray(duplicateFrom.product_images)) {
      const sortedImages = [...duplicateFrom.product_images]
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((img: any) => img.image_url);
      setFormData(prev => ({ ...prev, images: sortedImages }));
    }
  }, [product, parentProduct, duplicateFrom]);

  // Filtrer les catégories selon le type de produit
  useEffect(() => {
    if (formData.product_type) {
      const filtered = categories.filter((cat: any) => cat.product_type === formData.product_type);
      setFilteredCategories(filtered);
      // Désélectionner les catégories qui ne correspondent plus au type
      const validCategoryIds = filtered.map((cat: any) => cat.id);
      const updatedCategoryIds = formData.category_ids.filter((id: string) => validCategoryIds.includes(id));
      if (updatedCategoryIds.length !== formData.category_ids.length) {
        setFormData(prev => ({ ...prev, category_ids: updatedCategoryIds }));
      }
    } else {
      setFilteredCategories(categories);
    }
  }, [formData.product_type, categories]);

  // Recalculer les prix des variantes quand le leaser change
  useEffect(() => {
    if (formData.product_type === 'it_equipment' && formData.default_leaser_id && productVariants.length > 0) {
      productVariants.forEach((variant, index) => {
        if (variant.purchase_price_ht && variant.marlon_margin_percent) {
          setTimeout(() => {
            calculateVariantPrice(index, variant.purchase_price_ht, variant.marlon_margin_percent);
          }, 500);
        }
      });
    }
  }, [formData.default_leaser_id]);

  const loadProductDocuments = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/documents`);
      const data = await response.json();
      if (data.success && data.data) {
        setDocuments(data.data.map((doc: any) => ({ ...doc, isNew: false })));
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const loadProductVariants = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/variants`);
      const data = await response.json();
      if (data.success && data.data) {
        // S'assurer que les images sont un tableau
        const variantsWithImages = data.data.map((variant: any) => ({
          ...variant,
          images: Array.isArray(variant.images) ? variant.images : [],
          stock_quantity: variant.stock_quantity !== null && variant.stock_quantity !== undefined ? variant.stock_quantity : 0,
        }));
        setProductVariants(variantsWithImages);
      }
    } catch (err) {
      console.error('Error loading variants:', err);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'pdf';
    const uniqueFilename = `${timestamp}-${randomStr}.${extension}`;
    const tempPath = `temp/${uniqueFilename}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'product-documents');
    formData.append('path', tempPath);

    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        setNewDocForm(prev => ({
          ...prev,
          file_url: data.url,
          name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
        }));
      } else {
        alert('Erreur lors de l\'upload: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erreur lors de l\'upload du fichier');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAddDocument = () => {
    if (!newDocForm.name || !newDocForm.file_url) return;

    setDocuments(prev => [...prev, { ...newDocForm, isNew: true }]);
    setNewDocForm({ name: '', file_url: '', file_type: 'pdf', description: '' });
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const saveDocuments = async (productId: string) => {
    // Save new documents
    const newDocs = documents.filter(doc => doc.isNew);
    for (const doc of newDocs) {
      await fetch(`/api/admin/products/${productId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: doc.name,
          file_url: doc.file_url,
          file_type: doc.file_type,
          description: doc.description,
        }),
      });
    }
  };

  const saveVariants = async (productId: string) => {
    // Save/update variants
    for (const variant of productVariants) {
      const variantPayload: any = {
        sku: variant.sku,
        purchase_price_ht: variant.purchase_price_ht ? parseFloat(variant.purchase_price_ht.toString()) : null,
        marlon_margin_percent: variant.marlon_margin_percent ? parseFloat(variant.marlon_margin_percent.toString()) : null,
        is_active: variant.is_active !== undefined ? variant.is_active : true,
        stock_quantity: variant.stock_quantity !== undefined ? variant.stock_quantity : 0,
        images: Array.isArray(variant.images) ? variant.images : [],
        variant_data: variant.variant_data || {},
      };

      if (variant.id) {
        // Update existing variant
        await fetch(`/api/admin/products/${productId}/variants`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variant_id: variant.id,
            ...variantPayload,
          }),
        });
      } else {
        // Create new variant
        await fetch(`/api/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variantPayload),
        });
      }
    }
  };

  const handleAddVariant = () => {
    setProductVariants(prev => [...prev, {
      variant_data: {},
      sku: '',
      purchase_price_ht: '',
      marlon_margin_percent: formData.marlon_margin_percent || '',
      is_active: true,
      stock_quantity: 0,
      images: [],
      calculated_monthly_price: null,
      calculated_total_price: null,
      coefficient_used: null,
    }]);
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    setProductVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Si on modifie le prix HT ou la marge, recalculer le prix mensuel
      if (field === 'purchase_price_ht' || field === 'marlon_margin_percent') {
        const variant = updated[index];
        const purchasePrice = variant.purchase_price_ht || '';
        const marginPercent = variant.marlon_margin_percent || formData.marlon_margin_percent || '';
        
        if (purchasePrice && marginPercent && formData.default_leaser_id) {
          // Délai pour éviter trop de calculs
          setTimeout(() => {
            calculateVariantPrice(index, purchasePrice, marginPercent);
          }, 500);
        } else {
          // Réinitialiser si les données manquent
          updated[index] = {
            ...updated[index],
            calculated_monthly_price: null,
            calculated_total_price: null,
            coefficient_used: null,
          };
        }
      }
      
      return updated;
    });
  };

  const handleUpdateVariantFilter = (variantIndex: number, filterId: string, optionValue: string) => {
    setProductVariants(prev => {
      const updated = [...prev];
      const variant = updated[variantIndex];
      const filter = variantFilters.find(f => f.id === filterId);
      
      if (filter) {
        variant.variant_data = {
          ...variant.variant_data,
          [filter.name]: optionValue,
        };
      }
      
      return updated;
    });
  };

  const calculateVariantPrice = async (index: number, purchasePrice: number, marginPercent: number) => {
    if (!formData.default_leaser_id || !purchasePrice || !marginPercent) {
      // Réinitialiser les prix calculés si les données manquent
      setProductVariants(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          calculated_monthly_price: null,
          calculated_total_price: null,
          coefficient_used: null,
        };
        return updated;
      });
      return;
    }

    try {
      const sellingPrice = parseFloat(purchasePrice.toString()) * (1 + parseFloat(marginPercent.toString()) / 100);
      
      // Utiliser la durée la plus longue par défaut (60 mois)
      const defaultDuration = leaserDurations.find(d => d.months === 60) || leaserDurations[leaserDurations.length - 1];
      if (!defaultDuration) return;

      // Utiliser la fonction de calcul côté serveur
      const response = await fetch('/api/admin/products/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_price_ht: parseFloat(purchasePrice.toString()),
          marlon_margin_percent: parseFloat(marginPercent.toString()),
          leaser_id: formData.default_leaser_id,
          duration_months: defaultDuration.months,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const { monthlyPrice, totalPrice, coefficient } = data.data;

        setProductVariants(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            calculated_monthly_price: monthlyPrice,
            calculated_total_price: totalPrice,
            coefficient_used: coefficient,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Error calculating variant price:', err);
    }
  };

  const handleRemoveVariant = (index: number) => {
    setProductVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          purchase_price_ht: parseFloat(formData.purchase_price_ht),
          marlon_margin_percent: parseFloat(formData.marlon_margin_percent),
          supplier_id: formData.supplier_id || null,
          brand_id: formData.brand_id || null,
          default_leaser_id: formData.default_leaser_id || null,
          product_type: formData.product_type || null,
          serial_number: formData.serial_number || null,
          technical_info: formData.technical_info || null,
          category_ids: formData.category_ids,
          specialty_ids: formData.product_type === 'medical_equipment' ? formData.specialty_ids : [],
          images: formData.images,
          variant_filter_ids: formData.product_type === 'it_equipment' ? formData.variant_filter_ids : [],
          variant_data: formData.product_type === 'it_equipment' ? formData.variant_data : {},
          parent_product_id: isVariantMode ? parentProduct.id : (product?.parent_product_id || null),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        setLoading(false);
        return;
      }

      // Save documents
      const productId = product?.id || data.data?.id;
      if (productId) {
        await saveDocuments(productId);
      }

      // Reset form for mass creation
      if (!product) {
        setSuccessMessage(isVariantMode ? 'Variante créée avec succès !' : 'Produit créé avec succès !');
        if (isVariantMode) {
          // En mode variante, garder les champs hérités du parent, reset seulement les champs spécifiques
          setFormData(prev => ({
            ...prev,
            name: '',
            reference: '',
            purchase_price_ht: '',
            images: [],
            variant_data: {},
          }));
        } else {
          setFormData({
            name: '',
            reference: '',
            description: '',
            technical_info: '',
            product_type: '',
            serial_number: '',
            purchase_price_ht: '',
            marlon_margin_percent: '',
            supplier_id: '',
            brand_id: '',
            default_leaser_id: '',
            category_ids: [],
            specialty_ids: [],
            images: [],
            variant_filter_ids: [],
            variant_data: {},
          });
        }
        setDocuments([]);
        setNewDocForm({ name: '', file_url: '', file_type: 'pdf', description: '' });
        setError(null);
        setLoading(false);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh list so new product appears (modal stays open for mass creation)
        onSuccess();
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-2.5">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-2.5">
          <p className="text-xs text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Bandeau info variante */}
        {isVariantMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-800">
              <Icon icon="mdi:information" className="inline w-4 h-4 mr-1" />
              {duplicateFrom ? (
                <>Duplication de la variante &quot;{duplicateFrom.name}&quot; — Modifiez les champs si nécessaire avant de créer.</>
              ) : (
                <>Création d&apos;une variante de &quot;{parentProduct.name}&quot; — Renseignez le nom, prix, marge, images et les valeurs de filtres.</>
              )}
            </p>
          </div>
        )}

        {/* Section: Informations générales */}
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Informations générales</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-black">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                className="w-full rounded-md border border-[#525C6B] bg-white px-3 py-2 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reference" className="mb-1 block text-xs font-medium text-black">
              Référence
            </label>
            <input
              id="reference"
              type="text"
              className="w-full rounded-md border border-[#525C6B] bg-white px-3 py-2 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="serial_number" className="mb-1 block text-xs font-medium text-black">
              Numéro de série
            </label>
            <input
              id="serial_number"
              type="text"
              className="w-full rounded-md border border-[#525C6B] bg-white px-3 py-2 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            />
            </div>
            </div>

            {/* Type, catégories, spécialités — masqués en mode variante (hérité du parent) */}
            {!isVariantMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="product_type" className="mb-1 block text-xs font-medium text-black">
                  Type de produit <span className="text-red-500">*</span>
                </label>
            <SearchableSelect
              options={[
                { value: 'medical_equipment', label: 'Matériel médical' },
                { value: 'furniture', label: 'Mobilier' },
                { value: 'it_equipment', label: 'Informatique' },
              ]}
              value={formData.product_type}
              onChange={(value) => {
                setFormData({ ...formData, product_type: value, specialty_ids: value !== 'medical_equipment' ? [] : formData.specialty_ids });
                if (value !== 'it_equipment') {
                  setProductVariants([]);
                } else if (product && product.product_type === 'it_equipment') {
                  loadProductVariants(product.id);
                }
              }}
                placeholder="Sélectionner un type"
                required
              />
              </div>

              {formData.product_type === 'medical_equipment' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">
                    Spécialités associées
                  </label>
                  <MultiSelect
                    options={specialties.map((specialty) => ({
                      value: specialty.id,
                      label: specialty.name,
                    }))}
                    value={formData.specialty_ids}
                    onChange={(values) => setFormData({ ...formData, specialty_ids: values })}
                    placeholder="Sélectionner des spécialités"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-black">
                  Catégories associées
                </label>
                <MultiSelect
                  options={filteredCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  value={formData.category_ids}
                  onChange={(values) => setFormData({ ...formData, category_ids: values })}
                  placeholder={formData.product_type ? "Sélectionner des catégories" : "Sélectionnez d&apos;abord un type de produit"}
                  disabled={!formData.product_type}
                />
              </div>
            </div>
            )}

            {/* Filtres de variantes - sélection des filtres pour le parent */}
            {formData.product_type === 'it_equipment' && variantFilters.length > 0 && !isVariantMode && (
              <div>
                <label className="mb-1 block text-xs font-medium text-black">
                  Filtres disponibles pour ce produit
                </label>
                <MultiSelect
                  options={variantFilters.map((filter) => ({
                    value: filter.id,
                    label: filter.display_name || filter.label || filter.name,
                  }))}
                  value={formData.variant_filter_ids}
                  onChange={(values) => setFormData({ ...formData, variant_filter_ids: values })}
                  placeholder="Sélectionner les filtres à utiliser pour ce produit"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Sélectionnez les filtres (ex: Couleur, Stockage) qui seront proposés au client sur ce produit
                </p>
              </div>
            )}

            {/* Valeurs des filtres — visible pour parent ET variante */}
            {formData.product_type === 'it_equipment' && formData.variant_filter_ids.length > 0 && variantFilters.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="mb-2 block text-xs font-semibold text-gray-900">
                  {isVariantMode ? 'Valeurs des filtres pour cette variante' : 'Paramètres du produit principal'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {variantFilters
                    .filter((filter) => formData.variant_filter_ids.includes(filter.id))
                    .map((filter) => {
                      const options = filter.product_variant_filter_options || [];
                      return (
                        <div key={filter.id}>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                            {filter.display_name || filter.label || filter.name}
                          </label>
                          <select
                            value={formData.variant_data?.[filter.name] || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              variant_data: {
                                ...prev.variant_data,
                                [filter.name]: e.target.value,
                              },
                            }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                          >
                            <option value="">Sélectionner...</option>
                            {options
                              .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                              .map((option: any) => (
                              <option key={option.id} value={option.value}>
                                {option.label || option.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: Description et contenu */}
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Description et contenu</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="description" className="mb-1 block text-xs font-medium text-black">
                  Description
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Description du produit..."
                />
              </div>

              <div>
                <label htmlFor="technical_info" className="mb-1 block text-xs font-medium text-black">
                  Informations techniques
                </label>
                <RichTextEditor
                  value={formData.technical_info}
                  onChange={(value) => setFormData({ ...formData, technical_info: value })}
                  placeholder="Infos techniques..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Images */}
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Images</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-black">
              Images du produit
            </label>
            <ImageUpload
              images={formData.images}
              onChange={(images) => setFormData({ ...formData, images })}
              bucket="product-images"
              maxImages={10}
            />
          </div>
        </div>

        {/* Section: Tarification et fournisseurs */}
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Tarification et fournisseurs</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="purchase_price_ht" className="mb-1 block text-xs font-medium text-black">
                  Prix d&apos;achat HT (€) <span className="text-red-500">*</span>
                </label>
                <input
                  id="purchase_price_ht"
                  type="number"
                  step="0.01"
                  required
                  className="w-full rounded-md border border-[#525C6B] bg-white px-3 py-2 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                  value={formData.purchase_price_ht}
                  onChange={(e) => setFormData({ ...formData, purchase_price_ht: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="marlon_margin_percent" className="mb-1 block text-xs font-medium text-black">
                  Marge MARLON (%) <span className="text-red-500">*</span>
                </label>
                <input
                  id="marlon_margin_percent"
                  type="number"
                  step="0.01"
                  required
                  className="w-full rounded-md border border-[#525C6B] bg-white px-3 py-2 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                  value={formData.marlon_margin_percent}
                  onChange={(e) => setFormData({ ...formData, marlon_margin_percent: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="brand_id" className="mb-1 block text-xs font-medium text-black">
                  Marque
                </label>
                <SearchableSelect
                  options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                  value={formData.brand_id}
                  onChange={(value) => setFormData({ ...formData, brand_id: value })}
                  placeholder="Sélectionner une marque"
                />
              </div>

              <div>
                <label htmlFor="supplier_id" className="mb-1 block text-xs font-medium text-black">
                  Fournisseur
                </label>
                <SearchableSelect
                  options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                  value={formData.supplier_id}
                  onChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  placeholder="Sélectionner un fournisseur"
                />
              </div>

              <div>
                <label htmlFor="default_leaser_id" className="mb-1 block text-xs font-medium text-black">
                  Leaser par défaut
                </label>
                <SearchableSelect
                  options={leasers.map((leaser) => ({ value: leaser.id, label: leaser.name }))}
                  value={formData.default_leaser_id}
                  onChange={(value) => {
                    setFormData({ ...formData, default_leaser_id: value });
                    // Recalculer les prix des variantes si le leaser change
                    if (formData.product_type === 'it_equipment') {
                      productVariants.forEach((variant, index) => {
                        if (variant.purchase_price_ht && variant.marlon_margin_percent && value) {
                          setTimeout(() => {
                            calculateVariantPrice(index, variant.purchase_price_ht, variant.marlon_margin_percent);
                          }, 500);
                        }
                      });
                    }
                  }}
                  placeholder="Sélectionner un leaser"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Variantes info - Only for IT Equipment parent products (not when creating variant) */}
        {formData.product_type === 'it_equipment' && product && !isVariantMode && !product.parent_product_id && (
          <div className="border-b border-gray-200 pb-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <Icon icon="mdi:information" className="inline w-4 h-4 mr-1" />
                Les variantes sont gérées depuis la fiche produit. Enregistrez ce produit puis ajoutez des variantes depuis sa fiche.
              </p>
            </div>
          </div>
        )}

        {/* Section: Documents */}
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Documents ({documents.length})</h2>
          
          {/* Existing Documents */}
          {documents.length > 0 && (
            <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Icon icon="mdi:file-pdf-box" className="w-4 h-4 text-marlon-green flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-[10px] text-gray-500">{doc.file_type?.toUpperCase()}</p>
                  </div>
                  {doc.isNew && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded">Nouveau</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(index)}
                    className="p-0.5 text-gray-400 hover:text-red-600"
                  >
                    <Icon icon="mdi:close" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Document */}
          <div className="bg-gray-50 rounded-lg p-2.5 space-y-2">
            <p className="text-xs font-medium text-gray-700">Ajouter un document</p>
            
            {/* File Upload */}
            {newDocForm.file_url ? (
              <div className="flex items-center gap-2 p-1.5 bg-green-50 rounded-lg">
                <Icon icon="mdi:check-circle" className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[10px] text-green-700 truncate flex-1">Fichier uploadé</span>
                <button
                  type="button"
                  onClick={() => setNewDocForm(prev => ({ ...prev, file_url: '' }))}
                  className="text-gray-500 hover:text-red-600"
                >
                  <Icon icon="mdi:close" className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-1.5 p-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-marlon-green hover:bg-white transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploadingDoc}
                />
                {uploadingDoc ? (
                  <Icon icon="mdi:loading" className="w-3.5 h-3.5 animate-spin text-marlon-green" />
                ) : (
                  <>
                    <Icon icon="mdi:upload" className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-500">Cliquez pour uploader</span>
                  </>
                )}
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nom du document"
                value={newDocForm.name}
                onChange={(e) => setNewDocForm(prev => ({ ...prev, name: e.target.value }))}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
              />
              <select
                value={newDocForm.file_type}
                onChange={(e) => setNewDocForm(prev => ({ ...prev, file_type: e.target.value }))}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
              >
                {FILE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddDocument}
              disabled={!newDocForm.name || !newDocForm.file_url}
              className="w-full px-2 py-1.5 text-xs bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
              Ajouter ce document
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-col sm:flex-row gap-3 border-t border-gray-200 bg-white pt-4 -mx-6 px-6">
        <Button
          type="submit"
          disabled={loading}
          icon="mdi:check"
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? 'Sauvegarde...' : product ? 'Modifier' : 'Créer'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
