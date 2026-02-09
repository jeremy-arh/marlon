'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import BrandForm from '@/components/BrandForm';

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands');
      const data = await response.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const handleEdit = (brand: any) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  const handleDelete = async (brandId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette marque ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
      }

      loadBrands();
      router.refresh();
    } catch (error) {
      alert('Une erreur est survenue');
    }
  };

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new brands (mass creation)
    if (editingBrand) {
      setIsModalOpen(false);
      setEditingBrand(null);
    }
    loadBrands();
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
        <div className="text-center text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Marques</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter une marque
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher une marque"
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Brands Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {brands && brands.length > 0 ? (
                brands.map((brand: any) => (
                  <tr key={brand.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">
                      {brand.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(brand.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(brand)}
                          className="text-black hover:text-gray-700"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(brand.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucune marque trouvée
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
          setEditingBrand(null);
        }}
        title={editingBrand ? 'Modifier la marque' : 'Ajouter une marque'}
      >
        <BrandForm
          brand={editingBrand}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingBrand(null);
          }}
        />
      </SideModal>
    </div>
  );
}
