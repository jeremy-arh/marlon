'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface Employee {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
}

interface Equipment {
  id: string;
  order_item_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  serial_number?: string;
  delivery_date?: string;
  contract_end_date?: string;
  status: string;
  assigned_to_user_id?: string | null;
  assigned_to?: Employee | null;
  product: {
    id: string;
    name: string;
    reference?: string;
    product_images?: Array<{ image_url: string; order_index: number }>;
  };
  order: {
    id: string;
    leasing_duration_months: number;
    created_at: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: 'mdi:clock-outline' },
  delivered: { label: 'Livré', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: 'mdi:truck-check' },
  shipped: { label: 'Expédié', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: 'mdi:truck-delivery' },
  active: { label: 'En service', color: 'text-green-700', bgColor: 'bg-green-100', icon: 'mdi:check-circle' },
  maintenance: { label: 'En maintenance', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: 'mdi:wrench' },
  returned: { label: 'Retourné', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: 'mdi:package-variant-closed' },
};

interface EquipmentsClientProps {
  initialEquipments: Equipment[];
  initialEmployees: Employee[];
  isAdmin: boolean;
}

export default function EquipmentsClient({ initialEquipments, initialEmployees, isAdmin }: EquipmentsClientProps) {
  const router = useRouter();
  const [equipments, setEquipments] = useState<Equipment[]>(initialEquipments);
  const [employees] = useState<Employee[]>(initialEmployees);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'maintenance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedEquipment) return;

    setAssignLoading(true);
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ assigned_to_user_id: selectedEmployee || null })
        .eq('id', selectedEquipment.order_item_id);

      if (error) throw error;

      // Update local state
      setEquipments(prev => prev.map(eq => {
        if (eq.id === selectedEquipment.id) {
          const assignedEmployee = employees.find(emp => emp.user_id === selectedEmployee);
          return {
            ...eq,
            assigned_to_user_id: selectedEmployee || null,
            assigned_to: assignedEmployee || null,
          };
        }
        return eq;
      }));

      setShowAssignModal(false);
      setSelectedEquipment(null);
      setSelectedEmployee('');
      
      // Refresh server data
      router.refresh();
    } catch (error) {
      console.error('Error assigning equipment:', error);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusChange = async (equipment: Equipment, newStatus: string) => {
    setMaintenanceLoading(equipment.id);
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', equipment.order_item_id);

      if (error) throw error;

      // Update local state
      setEquipments(prev => prev.map(eq => {
        if (eq.id === equipment.id) {
          return { ...eq, status: newStatus };
        }
        return eq;
      }));

      router.refresh();
    } catch (error) {
      console.error('Error updating equipment status:', error);
    } finally {
      setMaintenanceLoading(null);
    }
  };

  const openAssignModal = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setSelectedEmployee(equipment.assigned_to_user_id || '');
    setShowAssignModal(true);
  };

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    return employee.email?.split('@')[0] || 'Utilisateur';
  };

  const getStatusInfo = (status: string) => {
    return STATUS_LABELS[status] || STATUS_LABELS.pending;
  };

  const filteredEquipments = equipments.filter((equipment) => {
    // Status filter
    let matchesFilter = true;
    if (filter === 'active') matchesFilter = equipment.status === 'active';
    else if (filter === 'pending') matchesFilter = equipment.status === 'pending' || equipment.status === 'delivered' || equipment.status === 'shipped';
    else if (filter === 'maintenance') matchesFilter = equipment.status === 'maintenance';
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const statusInfo = getStatusInfo(equipment.status);
      const statusLabel = statusInfo.label.toLowerCase();
      const matchesSearch = 
        equipment.product?.name?.toLowerCase().includes(query) ||
        equipment.product?.reference?.toLowerCase().includes(query) ||
        equipment.assigned_to?.first_name?.toLowerCase().includes(query) ||
        equipment.assigned_to?.last_name?.toLowerCase().includes(query) ||
        equipment.assigned_to?.email?.toLowerCase().includes(query) ||
        statusLabel.includes(query) ||
        equipment.status.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    }
    
    return matchesFilter;
  });

  const getProductImage = (equipment: Equipment) => {
    if (equipment.product?.product_images?.length) {
      const sortedImages = [...equipment.product.product_images].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );
      return sortedImages[0]?.image_url;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 lg:p-8">
      <PageHeader title="Mes équipements" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-marlon-green/10 rounded-lg">
              <Icon icon="mdi:package-variant" className="h-6 w-6 text-marlon-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">{equipments.length}</p>
              <p className="text-sm text-gray-500">Total équipements</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Icon icon="mdi:clock-outline" className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">
                {equipments.filter((e) => e.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-500">En attente</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon icon="mdi:truck-delivery" className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">
                {equipments.filter((e) => e.status === 'delivered' || e.status === 'shipped').length}
              </p>
              <p className="text-sm text-gray-500">Livrés/Expédiés</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Icon icon="mdi:check-circle" className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">
                {equipments.filter((e) => e.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">En service</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Icon icon="mdi:wrench" className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">
                {equipments.filter((e) => e.status === 'maintenance').length}
              </p>
              <p className="text-sm text-gray-500">En maintenance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-marlon-green text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-marlon-green text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          En service
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-marlon-green text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          En attente
        </button>
        <button
          onClick={() => setFilter('maintenance')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'maintenance'
              ? 'bg-marlon-green text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          En maintenance
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative w-full">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un équipement, référence, employé ou statut..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Equipment list */}
      {filteredEquipments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Icon icon="mdi:package-variant-closed" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun équipement</h3>
          <p className="text-gray-500 mb-6">
            Vous n'avez pas encore d'équipements en leasing.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors"
          >
            <Icon icon="mdi:shopping" className="h-5 w-5" />
            Découvrir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEquipments.map((equipment) => {
            const statusInfo = getStatusInfo(equipment.status);
            const image = getProductImage(equipment);

            return (
              <div
                key={equipment.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image - clickable */}
                <Link href={`/equipments/${equipment.id}`} className="block">
                  <div className="relative h-40 bg-gray-50 border-b border-gray-100">
                    {image ? (
                      <Image
                        src={image}
                        alt={equipment.product?.name || ''}
                        fill
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Icon icon="mdi:image-off" className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div
                      className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                    >
                      <Icon icon={statusInfo.icon} className="h-3 w-3" />
                      {statusInfo.label}
                    </div>
                  </div>
                </Link>

                {/* Content */}
                <Link href={`/equipments/${equipment.id}`} className="block p-4 hover:bg-gray-50">
                  <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                    {equipment.product?.name}
                  </h3>
                  {equipment.product?.reference && (
                    <p className="text-xs text-gray-500 mb-2">Réf: {equipment.product.reference}</p>
                  )}

                  {/* Assigned to */}
                  <div className="mb-3">
                    {equipment.assigned_to ? (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Icon icon="mdi:account" className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-blue-700 font-medium truncate">
                          {getEmployeeName(equipment.assigned_to)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Icon icon="mdi:account-question" className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Non attribué</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:calendar" className="h-3.5 w-3.5" />
                      {formatDate(equipment.order.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:clock-outline" className="h-3.5 w-3.5" />
                      {equipment.order.leasing_duration_months} mois
                    </span>
                  </div>
                </Link>

                {/* Actions - only for admins */}
                {isAdmin && (
                  <div className="px-4 pb-4 space-y-2">
                    <button
                      onClick={() => openAssignModal(equipment)}
                      className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-marlon-green rounded-lg hover:bg-marlon-green/90 transition-colors"
                    >
                      <Icon icon="mdi:account-plus" className="h-4 w-4" />
                      {equipment.assigned_to ? 'Modifier l\'attribution' : 'Attribuer'}
                    </button>
                    {/* Status change buttons based on current status */}
                    {equipment.status === 'delivered' && (
                      <button
                        onClick={() => handleStatusChange(equipment, 'active')}
                        disabled={maintenanceLoading === equipment.id}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-marlon-green rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50"
                      >
                        {maintenanceLoading === equipment.id ? (
                          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon icon="mdi:check-circle" className="h-4 w-4" />
                        )}
                        Mettre en service
                      </button>
                    )}
                    {equipment.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(equipment, 'maintenance')}
                        disabled={maintenanceLoading === equipment.id}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-orange-700 border border-orange-300 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {maintenanceLoading === equipment.id ? (
                          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon icon="mdi:wrench" className="h-4 w-4" />
                        )}
                        Mettre en maintenance
                      </button>
                    )}
                    {equipment.status === 'maintenance' && (
                      <button
                        onClick={() => handleStatusChange(equipment, 'active')}
                        disabled={maintenanceLoading === equipment.id}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {maintenanceLoading === equipment.id ? (
                          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon icon="mdi:check-circle" className="h-4 w-4" />
                        )}
                        Remettre en service
                      </button>
                    )}
                    <Link
                      href={`/orders/${equipment.order_id}`}
                      className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Voir la commande
                      <Icon icon="mdi:chevron-right" className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedEquipment && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowAssignModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1a365d]">Attribuer l'équipement</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                {/* Equipment info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedEquipment.product?.product_images?.[0]?.image_url ? (
                      <Image
                        src={selectedEquipment.product.product_images[0].image_url}
                        alt=""
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    ) : (
                      <Icon icon="mdi:package-variant" className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{selectedEquipment.product?.name}</p>
                    {selectedEquipment.product?.reference && (
                      <p className="text-xs text-gray-500">Réf: {selectedEquipment.product.reference}</p>
                    )}
                  </div>
                </div>

                {/* Employee select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attribuer à
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-marlon-green"
                  >
                    <option value="">Non attribué</option>
                    {employees.map((employee) => (
                      <option key={employee.user_id} value={employee.user_id}>
                        {getEmployeeName(employee)} - {employee.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 px-4 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={assignLoading}
                    className="flex-1 px-4 py-2.5 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {assignLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
