'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import SupplierForm from '@/components/SupplierForm';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productCountMap, setProductCountMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        fetch('/api/admin/suppliers').then(r => r.json()),
        fetch('/api/admin/products/list').then(r => r.json()),
      ]);

      if (suppliersRes.success) {
        setSuppliers(suppliersRes.data || []);
        
        // Count products per supplier
        const counts: any = {};
        if (productsRes.success && productsRes.data) {
          productsRes.data.forEach((product: any) => {
            if (product.supplier_id) {
              counts[product.supplier_id] = (counts[product.supplier_id] || 0) + 1;
            }
          });
        }
        setProductCountMap(counts);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    // Only close modal if editing, keep open for new suppliers (mass creation)
    if (editingSupplier) {
      setIsModalOpen(false);
      setEditingSupplier(null);
    }
    loadSuppliers();
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
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Fournisseurs</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter un fournisseur
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un fournisseur"
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produits</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers && suppliers.length > 0 ? (
                suppliers.map((supplier: any) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{supplier.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.contact_email || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.contact_phone || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{supplier.address || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {productCountMap[supplier.id] || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-black hover:text-gray-700"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun fournisseur trouvé
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
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
      >
        <SupplierForm
          supplier={editingSupplier}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingSupplier(null);
          }}
        />
      </SideModal>
    </div>
  );
}
