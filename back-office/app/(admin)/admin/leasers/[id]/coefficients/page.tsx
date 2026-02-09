'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import CoefficientForm from '@/components/CoefficientForm';

export default function LeaserCoefficientsPage() {
  const router = useRouter();
  const params = useParams();
  const leaserId = params.id as string;

  const [leaser, setLeaser] = useState<any>(null);
  const [coefficients, setCoefficients] = useState<any[]>([]);
  const [durations, setDurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoefficient, setEditingCoefficient] = useState<any | null>(null);

  useEffect(() => {
    if (leaserId) {
      loadData();
    }
  }, [leaserId]);

  const loadData = async () => {
    try {
      const [leaserRes, coefficientsRes, durationsRes] = await Promise.all([
        fetch(`/api/admin/leasers/${leaserId}`).then(r => r.json()),
        fetch(`/api/admin/leasers/${leaserId}/coefficients`).then(r => r.json()),
        fetch('/api/admin/leasing-durations').then(r => r.json()),
      ]);

      if (leaserRes.success) setLeaser(leaserRes.data);
      if (coefficientsRes.success) setCoefficients(coefficientsRes.data || []);
      if (durationsRes.success) setDurations(durationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCoefficient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (coefficient: any) => {
    setEditingCoefficient(coefficient);
    setIsModalOpen(true);
  };

  const handleDelete = async (coefficientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce coefficient ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/leaser-coefficients/${coefficientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erreur lors de la suppression');
        return;
      }

      loadData();
    } catch (error) {
      alert('Une erreur est survenue');
    }
  };

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new coefficients (mass creation)
    if (editingCoefficient) {
      setIsModalOpen(false);
      setEditingCoefficient(null);
    }
    loadData();
  };

  if (loading) {
    return (
      <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
        <div className="text-center text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!leaser) {
    return (
      <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
        <div className="text-center text-red-600">Leaser introuvable</div>
      </div>
    );
  }

  // Group coefficients by duration
  const coefficientsByDuration = durations.reduce((acc: any, duration: any) => {
    acc[duration.id] = {
      duration,
      coefficients: coefficients.filter((c: any) => c.duration_id === duration.id),
    };
    return acc;
  }, {});

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-black">
              Coefficients - {leaser.name}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez les coefficients de tarification par durée et tranche de montant
            </p>
          </div>
          <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
            Ajouter un coefficient
          </Button>
        </div>
      </div>

      {/* Coefficients by Duration */}
      <div className="space-y-6">
        {durations.length > 0 ? (
          durations.map((duration: any) => {
            const durationCoefficients = coefficientsByDuration[duration.id]?.coefficients || [];
            return (
              <div key={duration.id} className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-black">
                    Durée : {duration.months} mois
                  </h2>
                </div>
                {durationCoefficients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Montant min (€)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Montant max (€)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coefficient
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {durationCoefficients
                          .sort((a: any, b: any) => parseFloat(a.min_amount) - parseFloat(b.min_amount))
                          .map((coefficient: any) => (
                            <tr key={coefficient.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {parseFloat(coefficient.min_amount).toLocaleString('fr-FR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} €
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {coefficient.max_amount
                                  ? parseFloat(coefficient.max_amount).toLocaleString('fr-FR', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }) + ' €'
                                  : '∞'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {parseFloat(coefficient.coefficient).toFixed(4)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEdit(coefficient)}
                                    className="text-black hover:text-gray-700"
                                  >
                                    <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(coefficient.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    Aucun coefficient défini pour cette durée
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-lg bg-white border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">Aucune durée de leasing disponible</p>
          </div>
        )}
      </div>

      {/* Side Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCoefficient(null);
        }}
        title={editingCoefficient ? 'Modifier le coefficient' : 'Ajouter un coefficient'}
      >
        <CoefficientForm
          leaserId={leaserId}
          coefficient={editingCoefficient}
          durations={durations}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCoefficient(null);
          }}
        />
      </SideModal>
    </div>
  );
}
