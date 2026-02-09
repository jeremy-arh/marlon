'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import SpecialtyForm from '@/components/SpecialtyForm';

export default function SpecialtiesPage() {
  const router = useRouter();
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    try {
      const response = await fetch('/api/admin/specialties');
      const data = await response.json();
      if (data.success) {
        setSpecialties(data.data || []);
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSpecialty(null);
    setIsModalOpen(true);
  };

  const handleEdit = (specialty: any) => {
    setEditingSpecialty(specialty);
    setIsModalOpen(true);
  };

  const handleDelete = async (specialtyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette spécialité ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/specialties/${specialtyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
      }

      loadSpecialties();
      router.refresh();
    } catch (error) {
      alert('Une erreur est survenue');
    }
  };

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new specialties (mass creation)
    if (editingSpecialty) {
      setIsModalOpen(false);
      setEditingSpecialty(null);
    }
    loadSpecialties();
    router.refresh();
  };

  const filteredSpecialties = specialties.filter((specialty) =>
    specialty.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Spécialités</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter une spécialité
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher une spécialité"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Specialties Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSpecialties && filteredSpecialties.length > 0 ? (
                filteredSpecialties.map((specialty: any) => (
                  <tr key={specialty.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{specialty.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-md">
                      <div className="line-clamp-2">{specialty.description || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(specialty)}
                          className="text-black hover:text-gray-700"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(specialty.id)}
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
                    {searchTerm ? 'Aucune spécialité trouvée' : 'Aucune spécialité disponible'}
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
          setEditingSpecialty(null);
        }}
        title={editingSpecialty ? 'Modifier la spécialité' : 'Ajouter une spécialité'}
      >
        <SpecialtyForm
          specialty={editingSpecialty}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingSpecialty(null);
          }}
        />
      </SideModal>
    </div>
  );
}
