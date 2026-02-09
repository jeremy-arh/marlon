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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const [orgsRes, rolesRes] = await Promise.all([
        fetch('/api/admin/customers/list').then(r => r.json()),
        fetch('/api/admin/user-roles').then(r => r.json()),
      ]);

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

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new customers (mass creation)
    if (editingCustomer) {
      setIsModalOpen(false);
      setEditingCustomer(null);
    }
    loadCustomers();
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIRET</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateurs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizations && organizations.length > 0 ? (
                organizations.map((org: any) => (
                  <tr 
                    key={org.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/customers/${org.id}`)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{org.name}</td>
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
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
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
