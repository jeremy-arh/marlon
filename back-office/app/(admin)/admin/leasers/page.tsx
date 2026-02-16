'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import LeaserForm from '@/components/LeaserForm';

export default function LeasersPage() {
  const router = useRouter();
  const [leasers, setLeasers] = useState<any[]>([]);
  const [coefficientCountMap, setCoefficientCountMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeaser, setEditingLeaser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLeasers();
  }, []);

  const loadLeasers = async () => {
    try {
      const [leasersRes, coefficientsRes] = await Promise.all([
        fetch('/api/admin/leasers').then(r => r.json()),
        fetch('/api/admin/leaser-coefficients').then(r => r.json()),
      ]);

      if (leasersRes.success) {
        setLeasers(leasersRes.data || []);
        
        // Count coefficients per leaser
        const counts: any = {};
        if (coefficientsRes.success && coefficientsRes.data) {
          coefficientsRes.data.forEach((coeff: any) => {
            counts[coeff.leaser_id] = (counts[coeff.leaser_id] || 0) + 1;
          });
        }
        setCoefficientCountMap(counts);
      }
    } catch (error) {
      console.error('Error loading leasers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLeaser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (leaser: any) => {
    setEditingLeaser(leaser);
    setIsModalOpen(true);
  };

  const handleDelete = async (leaser: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le leaser "${leaser.name}" ? Ses coefficients seront également supprimés.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/leasers/${leaser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
      }

      loadLeasers();
      router.refresh();
    } catch (error) {
      alert('Une erreur est survenue lors de la suppression');
    }
  };

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new leasers (mass creation)
    if (editingLeaser) {
      setIsModalOpen(false);
      setEditingLeaser(null);
    }
    loadLeasers();
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
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Leasers</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter un leaser
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un leaser"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Leasers Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coefficients</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                const filtered = leasers.filter(l => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    (l.name || '').toLowerCase().includes(q) ||
                    (l.contact_email || '').toLowerCase().includes(q) ||
                    (l.contact_phone || '').toLowerCase().includes(q)
                  );
                });
                return filtered.length > 0 ? (
                filtered.map((leaser: any) => (
                  <tr key={leaser.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{leaser.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{leaser.contact_email || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{leaser.contact_phone || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coefficientCountMap[leaser.id] || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(leaser)}
                          className="text-black hover:text-gray-700"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/leasers/${leaser.id}/coefficients`)}
                          className="text-black hover:text-gray-700"
                          title="Gérer les coefficients"
                        >
                          <Icon icon="mingcute:chart-bar-line" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(leaser)}
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
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun leaser trouvé
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
          setEditingLeaser(null);
        }}
        title={editingLeaser ? 'Modifier le leaser' : 'Ajouter un leaser'}
      >
        <LeaserForm
          leaser={editingLeaser}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingLeaser(null);
          }}
        />
      </SideModal>
    </div>
  );
}
