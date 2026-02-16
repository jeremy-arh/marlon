'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import CategoryForm from '@/components/CategoryForm';
import { supabase } from '@/lib/supabase/client';

interface CategoriesClientProps {
  initialCategories: any[];
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/categories/list', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  // Realtime subscription: auto-refresh on INSERT, UPDATE, DELETE
  useEffect(() => {
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCategories]);

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
      }

      loadCategories();
      router.refresh();
    } catch (error) {
      alert('Une erreur est survenue lors de la suppression');
    }
  };

  const handleSuccess = () => {
    if (editingCategory) {
      setIsModalOpen(false);
      setEditingCategory(null);
    }
    loadCategories();
    router.refresh();
  };

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Catégories</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter une catégorie
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher une catégorie"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spécialités / Types IT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                const filtered = categories.filter(c => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.description || '').toLowerCase().includes(q) ||
                    (c.product_type || '').toLowerCase().includes(q)
                  );
                });
                return filtered.length > 0 ? (
                filtered.map((category: any) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="h-12 w-12 rounded-md object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{category.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category.product_type === 'medical_equipment' && (
                        <span className="inline-flex rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                          Matériel médical
                        </span>
                      )}
                      {category.product_type === 'furniture' && (
                        <span className="inline-flex rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
                          Mobilier
                        </span>
                      )}
                      {category.product_type === 'it_equipment' && (
                        <span className="inline-flex rounded bg-purple-100 px-2 py-1 text-xs text-purple-700">
                          Informatique
                        </span>
                      )}
                      {!category.product_type && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="line-clamp-2">{category.description || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {category.product_type === 'medical_equipment' && category.category_specialties && category.category_specialties.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {category.category_specialties.map((cs: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex rounded bg-marlon-green-light px-2 py-1 text-xs text-marlon-green"
                            >
                              {cs.specialty?.name}
                            </span>
                          ))}
                        </div>
                      ) : category.product_type === 'it_equipment' && category.category_it_types && category.category_it_types.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {category.category_it_types.map((ct: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex rounded bg-purple-100 px-2 py-1 text-xs text-purple-700"
                            >
                              {ct.it_type?.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-black hover:text-gray-700"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucune catégorie trouvée
                  </td>
                </tr>
              );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
      >
        <CategoryForm
          category={editingCategory}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCategory(null);
          }}
        />
      </SideModal>
    </>
  );
}
