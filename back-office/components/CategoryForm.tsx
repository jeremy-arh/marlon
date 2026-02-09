'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';
import MultiSelect from '@/components/MultiSelect';
import ImageUpload from '@/components/ImageUpload';

interface CategoryFormProps {
  category?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [itTypes, setItTypes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
    product_type: category?.product_type || '',
    specialty_ids: category?.category_specialties?.map((cs: any) => cs.specialty_id) || [],
    it_type_ids: category?.category_it_types?.map((ct: any) => ct.it_type_id) || [],
  });

  useEffect(() => {
    // Load specialties
    fetch('/api/admin/specialties')
      .then(r => r.json())
      .then(data => {
        if (data.success) setSpecialties(data.data || []);
      });

    // Load IT equipment types
    fetch('/api/admin/it-types')
      .then(r => r.json())
      .then(data => {
        if (data.success) setItTypes(data.data || []);
      });

    // Load category data if editing
    if (category) {
      setFormData(prev => ({
        ...prev,
        image_url: category.image_url || '',
        product_type: category.product_type || '',
      }));
    }
  }, [category]);

  const handleImageUpload = (images: string[]) => {
    // For categories, we only use the first image
    if (images.length > 0) {
      setFormData({ ...formData, image_url: images[0] });
    } else {
      setFormData({ ...formData, image_url: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = category ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        setLoading(false);
        return;
      }

      // Reset form for mass creation
      if (!category) {
        setSuccessMessage('Catégorie créée avec succès !');
        setFormData({
          name: '',
          description: '',
          image_url: '',
          product_type: '',
          specialty_ids: [],
          it_type_ids: [],
        });
        setError(null);
        setLoading(false);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Keep modal open for mass creation
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-black">
            Nom de la catégorie <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-black">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Image de la catégorie
          </label>
          <ImageUpload
            images={formData.image_url ? [formData.image_url] : []}
            onChange={handleImageUpload}
            bucket="category-images"
            maxImages={1}
            label=""
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Type de produit <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={[
              { value: 'medical_equipment', label: 'Matériel médical' },
              { value: 'furniture', label: 'Mobilier' },
              { value: 'it_equipment', label: 'Informatique' },
            ]}
            value={formData.product_type}
            onChange={(value) => setFormData({ 
              ...formData, 
              product_type: value,
              specialty_ids: value !== 'medical_equipment' ? [] : formData.specialty_ids,
              it_type_ids: value !== 'it_equipment' ? [] : formData.it_type_ids,
            })}
            placeholder="Sélectionner un type"
            required
          />
        </div>

        {formData.product_type === 'medical_equipment' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
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

        {formData.product_type === 'it_equipment' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Types d&apos;équipement informatique
            </label>
            <MultiSelect
              options={itTypes.map((itType) => ({
                value: itType.id,
                label: itType.name,
              }))}
              value={formData.it_type_ids}
              onChange={(values) => setFormData({ ...formData, it_type_ids: values })}
              placeholder="Sélectionner des types (téléphone, ordinateur, etc.)"
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-col sm:flex-row gap-4 border-t border-gray-200 bg-white pt-6 -mx-6 px-6">
        <Button
          type="submit"
          disabled={loading}
          icon="mdi:check"
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? 'Sauvegarde...' : category ? 'Modifier' : 'Créer'}
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
