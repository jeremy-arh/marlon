'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    specialty_ids: [] as string[],
  });

  useEffect(() => {
    fetch('/api/admin/specialties')
      .then(r => r.json())
      .then(data => {
        if (data.data) setSpecialties(data.data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création');
        setLoading(false);
        return;
      }

      router.push('/admin/categories');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const toggleSpecialty = (specialtyId: string) => {
    setFormData({
      ...formData,
      specialty_ids: formData.specialty_ids.includes(specialtyId)
        ? formData.specialty_ids.filter(id => id !== specialtyId)
        : [...formData.specialty_ids, specialtyId],
    });
  };

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Icon icon="mdi:arrow-left" className="h-5 w-5" />
          Retour
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Ajouter une catégorie</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Name */}
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

            {/* Description */}
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

            {/* Image URL */}
            <div>
              <label htmlFor="image_url" className="mb-2 block text-sm font-medium text-black">
                URL de l&apos;image
              </label>
              <input
                id="image_url"
                type="url"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Specialties */}
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Spécialités associées
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white p-4">
                {specialties.length > 0 ? (
                  specialties.map((specialty) => (
                    <label
                      key={specialty.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.specialty_ids.includes(specialty.id)}
                        onChange={() => toggleSpecialty(specialty.id)}
                        className="rounded border-gray-300 text-marlon-green focus:ring-marlon-green"
                      />
                      <span className="text-sm text-black">{specialty.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Aucune spécialité disponible</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              disabled={loading}
              icon="mdi:check"
              variant="primary"
              className="w-full sm:w-auto"
            >
              {loading ? 'Création...' : 'Créer la catégorie'}
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
