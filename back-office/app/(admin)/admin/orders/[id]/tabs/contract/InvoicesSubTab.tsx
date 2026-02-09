'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Icon from '@/components/Icon';
import SideModal from '@/components/SideModal';

interface InvoicesSubTabProps {
  orderId: string;
  initialInvoices?: any[];
}

export default function InvoicesSubTab({ orderId, initialInvoices = [] }: InvoicesSubTabProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  const loadInvoices = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/invoices`);
      const data = await response.json();
      if (data.success) {
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadAllInvoices = async () => {
    try {
      const response = await fetch('/api/admin/invoices');
      const data = await response.json();
      if (data.success) {
        setAllInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error loading all invoices:', error);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadAllInvoices();
  }, [orderId]);

  const handleAddInvoice = async () => {
    if (!selectedInvoiceId) {
      setError('Veuillez sélectionner une facture');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: selectedInvoiceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'ajout');
        return;
      }

      await loadInvoices();
      setIsModalOpen(false);
      setSelectedInvoiceId('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInvoice = async (orderInvoiceId: string, invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette facture ?')) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      await loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const availableInvoices = allInvoices.filter(
    (inv) => !invoices.some((oi) => oi.invoice_id === inv.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-black">Factures</h3>
        <Button
          onClick={() => {
            setIsModalOpen(true);
            loadAllInvoices();
          }}
          variant="primary"
          icon="mdi:plus"
        >
          Ajouter une facture
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {invoices.length > 0 ? (
        <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((orderInvoice) => (
                <tr 
                  key={orderInvoice.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (orderInvoice.invoice?.file_url) {
                      window.open(orderInvoice.invoice.file_url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                    {orderInvoice.invoice?.description || 'Facture'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(orderInvoice.invoice?.uploaded_at || orderInvoice.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRemoveInvoice(orderInvoice.id, orderInvoice.invoice_id)}
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
        <div className="rounded-lg bg-white border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucune facture</p>
        </div>
      )}

      {/* Add Invoice Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvoiceId('');
        }}
        title="Ajouter une facture"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Facture <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black"
              required
            >
              <option value="">Sélectionner une facture</option>
              {availableInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.description || `Facture du ${new Date(invoice.uploaded_at).toLocaleDateString('fr-FR')}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleAddInvoice}
              disabled={loading || !selectedInvoiceId}
              variant="primary"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </SideModal>
    </div>
  );
}
