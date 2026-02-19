'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  created_at: string;
}

interface Equipment {
  id: string;
  order_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    reference?: string;
    product_images?: Array<{ image_url: string; order_index: number }>;
  };
  order: {
    id: string;
    status: string;
    leasing_duration_months: number;
    created_at: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  employee: 'Employé',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Actif', color: 'text-green-700', bgColor: 'bg-green-100' },
  inactive: { label: 'Inactif', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Edit states
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadEmployee(params.id as string);
    }
  }, [params.id]);

  const loadEmployee = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      // Get current user's organization and role
      const { data: currentUserRole } = await supabase
        .from('user_roles')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!currentUserRole) {
        router.push('/employees');
        return;
      }

      setOrganizationId(currentUserRole.organization_id);
      setIsAdmin(currentUserRole.role === 'admin');

      // Get employee details using RPC
      const { data: employeesData, error: employeesError } = await supabase
        .rpc('get_organization_users', { org_id: currentUserRole.organization_id });

      if (employeesError) {
        console.error('Error loading employee:', employeesError);
        router.push('/employees');
        return;
      }

      const employeeData = employeesData?.find((e: Employee) => e.user_id === userId);
      if (!employeeData) {
        router.push('/employees');
        return;
      }

      setEmployee(employeeData);
      setNewRole(employeeData.role);

      // Load assigned equipments
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          leasing_duration_months,
          created_at,
          order_items!inner(
            id,
            quantity,
            assigned_to_user_id,
            product:products(
              id,
              name,
              reference,
              product_images(image_url, order_index)
            )
          )
        `)
        .eq('organization_id', currentUserRole.organization_id)
        .not('status', 'in', '(cancelled,completed)');

      // Filter items assigned to this employee
      const assignedEquipments: Equipment[] = [];
      ordersData?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          if (item.assigned_to_user_id === userId) {
            assignedEquipments.push({
              id: item.id,
              order_id: order.id,
              quantity: item.quantity,
              product: item.product,
              order: {
                id: order.id,
                status: order.status,
                leasing_duration_months: order.leasing_duration_months,
                created_at: order.created_at,
              },
            });
          }
        });
      });

      setEquipments(assignedEquipments);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!employee) return;

    setDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/employees/${employee.user_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur inconnue');

      router.push('/employees');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setErrorMessage(error.message || 'Erreur lors de la suppression');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveRole = async () => {
    if (!employee || !organizationId || !newRole) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', employee.user_id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      setEmployee({ ...employee, role: newRole });
      setIsEditingRole(false);
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getEmployeeName = () => {
    if (!employee) return '';
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    return employee.email?.split('@')[0] || 'Utilisateur';
  };

  const getProductImage = (equipment: Equipment) => {
    if (equipment.product?.product_images?.length) {
      const sortedImages = [...equipment.product.product_images].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );
      return sortedImages[0]?.image_url;
    }
    return null;
  };

  const isCurrentUser = employee?.user_id === currentUserId;

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <PageHeader title="Fiche employé" />
        <div className="flex items-center justify-center py-12">
          <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
          <span className="ml-2 text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4 lg:p-8">
        <PageHeader title="Employé introuvable" />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="mdi:account-off" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Employé introuvable</h3>
          <Link
            href="/employees"
            className="inline-flex items-center gap-2 px-6 py-3 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[employee.status] || STATUS_LABELS.inactive;

  return (
    <div className="p-4 lg:p-8">
      <PageHeader title="Fiche employé" />

      {/* Back button */}
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-marlon-green mb-6"
      >
        <Icon icon="mdi:chevron-left" className="h-5 w-5" />
        Retour aux employés
      </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee info card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Avatar and name */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-marlon-green/10 flex items-center justify-center mx-auto mb-4">
                  <Icon icon="mdi:account" className="h-10 w-10 text-marlon-green" />
                </div>
                <h2 className="text-xl font-bold text-[#1a365d] flex items-center justify-center gap-2">
                  {getEmployeeName()}
                  {isCurrentUser && (
                    <span className="text-xs bg-marlon-green/10 text-marlon-green px-2 py-0.5 rounded-full">
                      Vous
                    </span>
                  )}
                </h2>
                <p className="text-gray-500">{employee.email}</p>
              </div>

              {/* Status */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Statut</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Role */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rôle</span>
                  {isEditingRole ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-marlon-green"
                      >
                        <option value="admin">Administrateur</option>
                        <option value="employee">Employé</option>
                      </select>
                      <button
                        onClick={handleSaveRole}
                        disabled={saving}
                        className="text-marlon-green hover:text-marlon-green/80"
                      >
                        <Icon icon="mdi:check" className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingRole(false);
                          setNewRole(employee.role);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Icon icon="mdi:close" className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ROLE_LABELS[employee.role]}</span>
                      {isAdmin && !isCurrentUser && (
                        <button
                          onClick={() => setIsEditingRole(true)}
                          className="text-gray-400 hover:text-marlon-green"
                        >
                          <Icon icon="mdi:pencil" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Member since */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Membre depuis</span>
                  <span className="text-sm font-medium">{formatDate(employee.created_at)}</span>
                </div>

                {/* Equipments count */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Équipements attribués</span>
                  <span className="text-sm font-medium">{equipments.length}</span>
                </div>
              </div>

              {/* Actions */}
              {isAdmin && !isCurrentUser && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <Icon icon="mdi:alert-circle" className="h-4 w-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Icon icon="mdi:delete" className="h-5 w-5" />
                      Supprimer le compte
                    </button>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium mb-1">
                        Confirmer la suppression ?
                      </p>
                      <p className="text-xs text-red-600 mb-3">
                        Cette action est irréversible. L&apos;utilisateur sera supprimé de l&apos;organisation.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteUser}
                          disabled={deleting}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {deleting ? (
                            <>
                              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                              Suppression...
                            </>
                          ) : (
                            'Confirmer'
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deleting}
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Assigned equipments */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-[#1a365d] flex items-center gap-2">
                  <Icon icon="mdi:package-variant" className="h-5 w-5 text-marlon-green" />
                  Équipements attribués ({equipments.length})
                </h3>
              </div>

              {equipments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Icon icon="mdi:package-variant-closed" className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun équipement attribué à cet employé</p>
                  <Link
                    href="/equipments"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-marlon-green hover:underline"
                  >
                    Attribuer un équipement
                    <Icon icon="mdi:chevron-right" className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {equipments.map((equipment) => {
                    const image = getProductImage(equipment);
                    return (
                      <div key={equipment.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {image ? (
                            <Image
                              src={image}
                              alt={equipment.product?.name || ''}
                              fill
                              className="object-contain p-2"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {equipment.product?.name}
                          </h4>
                          {equipment.product?.reference && (
                            <p className="text-xs text-gray-500">Réf: {equipment.product.reference}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Commandé le {formatDate(equipment.order.created_at)} • {equipment.order.leasing_duration_months} mois
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {equipment.quantity > 1 && (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-marlon-green text-white text-xs font-bold mr-2">
                              x{equipment.quantity}
                            </span>
                          )}
                          <Link
                            href={`/orders/${equipment.order_id}`}
                            className="inline-flex items-center gap-1 text-sm text-marlon-green hover:underline"
                          >
                            Voir
                            <Icon icon="mdi:chevron-right" className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
