'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import CustomerForm from '@/components/CustomerForm';

export default function CustomersPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [userCountMap, setUserCountMap] = useState<any>({});
  const [specialtyMap, setSpecialtyMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const [orgsRes, rolesRes, specialtiesRes] = await Promise.all([
        fetch('/api/admin/customers/list').then(r => r.json()),
        fetch('/api/admin/user-roles').then(r => r.json()),
        fetch('/api/admin/specialties').then(r => r.json()),
      ]);

      if (specialtiesRes.success && specialtiesRes.data) {
        const map: Record<string, string> = {};
        specialtiesRes.data.forEach((s: { id: string; name: string }) => { map[s.id] = s.name; });
        setSpecialtyMap(map);
      }

      if (orgsRes.success) {
        setOrganizations(orgsRes.data || []);
        
        // Count users per organization
        const counts: any = {};
        if (rolesRes.success && rolesRes.data) {
          rolesRes.data.forEach((role: any) => {
            counts[role.organization_id] = (counts[role.organization_id] || 0) + 1;
          });
        }
        setUserCountMap(counts);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new customers (mass creation)
    if (editingCustomer) {
      setIsModalOpen(false);
      setEditingCustomer(null);
    }
    loadCustomers();
    router.refresh();
  };

  const handleDelete = async (e: React.MouseEvent, org: any) => {
    e.stopPropagation();
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le client "${org.name}" ? Cette action supprimera également toutes ses commandes et est irréversible.`)) return;
    setDeletingId(org.id);
    try {
      const res = await fetch(`/api/admin/customers/${org.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      loadCustomers();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredOrganizations = organizations.filter((org: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const contactName = [org.contact_first_name, org.contact_last_name].filter(Boolean).join(' ').toLowerCase();
    const specialtyName = (org.contact_specialty?.name || specialtyMap[org.contact_specialty_id] || '').toLowerCase();
    return (
      org.name?.toLowerCase().includes(q) ||
      org.siret?.toLowerCase().includes(q) ||
      org.email?.toLowerCase().includes(q) ||
      org.phone?.toLowerCase().includes(q) ||
      org.address?.toLowerCase().includes(q) ||
      org.city?.toLowerCase().includes(q) ||
      org.postal_code?.toLowerCase().includes(q) ||
      contactName.includes(q) ||
      specialtyName.includes(q)
    );
  });

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
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Clients</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter un client
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un client"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spécialité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIRET</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateurs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrganizations && filteredOrganizations.length > 0 ? (
                filteredOrganizations.map((org: any) => (
                  <tr 
                    key={org.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/customers/${org.id}`)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{org.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {[org.contact_first_name, org.contact_last_name].filter(Boolean).join(' ') || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {org.contact_specialty?.name || specialtyMap[org.contact_specialty_id] || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{org.siret || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{org.email || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{org.phone || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {org.address ? `${org.address}, ${org.postal_code} ${org.city}` : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userCountMap[org.id] || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(org)}
                          className="text-black hover:text-gray-700"
                          title="Modifier"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, org)}
                          disabled={deletingId === org.id}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deletingId === org.id ? (
                            <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                          ) : (
                            <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun client trouvé
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
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Modifier le client' : 'Ajouter un client'}
      >
        <CustomerForm
          customer={editingCustomer}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
          }}
        />
      </SideModal>
    </div>
  );
}
