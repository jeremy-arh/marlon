'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface OrderItem {
  id: string;
  quantity: number;
  purchase_price_ht: number;
  margin_percent: number;
  calculated_price_ht?: number;
  product: {
    id: string;
    name: string;
    reference?: string;
    product_images?: Array<{ image_url: string; order_index: number }>;
  };
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount_ht: number;
  leasing_duration_months: number;
  delivery_name?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  organization?: {
    name: string;
    siret?: string;
  };
  order_items: OrderItem[];
}

interface OrderTracking {
  financing_status?: string;
  contract_status?: string;
  delivery_status?: string;
}

interface OrderDocument {
  id: string;
  name: string;
  file_url: string;
  file_type?: string;
  description?: string;
  created_at: string;
}

interface OrderInvoice {
  id: string;
  invoice: {
    id: string;
    file_url: string;
    description?: string;
    uploaded_at: string;
  };
}

interface Contract {
  id: string;
  file_url: string;
  uploaded_at: string;
}

const STATUS_STEPS = [
  { key: 'financing', label: 'Financement', icon: 'mdi:bank' },
  { key: 'contract', label: 'Contrat', icon: 'mdi:file-sign' },
  { key: 'delivery', label: 'Livraison', icon: 'mdi:truck-delivery' },
  { key: 'active', label: 'Actif', icon: 'mdi:check-circle' },
];

interface OrderDetailClientProps {
  order: Order;
  tracking: OrderTracking | null;
  documents: OrderDocument[];
  invoices: OrderInvoice[];
  contract: Contract | null;
}

export default function OrderDetailClient({
  order,
  tracking,
  documents,
  invoices,
  contract,
}: OrderDetailClientProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getProductImage = (item: OrderItem) => {
    if (item.product?.product_images?.length) {
      const sortedImages = [...item.product.product_images].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );
      return sortedImages[0]?.image_url;
    }
    return null;
  };

  const getStepStatus = (stepKey: string) => {
    if (!tracking) return 'pending';

    switch (stepKey) {
      case 'financing':
        return tracking.financing_status || 'pending';
      case 'contract':
        return tracking.contract_status || 'pending';
      case 'delivery':
        return tracking.delivery_status || 'pending';
      case 'active':
        return order?.status === 'active' ? 'active' : 'pending';
      default:
        return 'pending';
    }
  };

  const isStepCompleted = (stepKey: string) => {
    const status = getStepStatus(stepKey);
    return ['validated', 'signed', 'delivered', 'active', 'completed'].includes(status);
  };

  const isStepActive = (stepKey: string) => {
    const status = getStepStatus(stepKey);
    return ['processing', 'in_transit'].includes(status);
  };

  const monthlyHT = order.total_amount_ht / order.leasing_duration_months;
  const monthlyTTC = monthlyHT * 1.2;

  return (
    <div className="p-4 lg:p-8">
      <PageHeader title="Détail de la commande" />

      {/* Back button */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-marlon-green mb-6"
      >
        <Icon icon="mdi:chevron-left" className="h-5 w-5" />
        Retour aux commandes
      </Link>

      {/* Order header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1a365d]">
              Commande #{order.id.slice(0, 8).toUpperCase()}
            </h2>
            <p className="text-gray-500">Passée le {formatDate(order.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Loyer mensuel</p>
            <p className="text-2xl font-bold text-marlon-green">{monthlyTTC.toFixed(2)} € TTC</p>
            <p className="text-sm text-gray-500">sur {order.leasing_duration_months} mois</p>
          </div>
        </div>

        {/* Progress stepper */}
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step) => {
              const completed = isStepCompleted(step.key);
              const active = isStepActive(step.key);

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                      completed
                        ? 'bg-marlon-green text-white'
                        : active
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {completed ? (
                      <Icon icon="mdi:check" className="h-6 w-6" />
                    ) : (
                      <Icon icon={step.icon} className="h-6 w-6" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      completed ? 'text-marlon-green' : active ? 'text-blue-500' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#1a365d] mb-4">
              Articles commandés ({order.order_items?.length || 0})
            </h3>
            <div className="space-y-4">
              {order.order_items?.map((item) => {
                const image = getProductImage(item);
                const sellingPrice = item.purchase_price_ht * (1 + item.margin_percent / 100);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {image ? (
                        <Image src={image} alt={item.product?.name || ''} fill className="object-contain p-1" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.product?.name}</h4>
                      {item.product?.reference && (
                        <p className="text-sm text-gray-500">Réf: {item.product.reference}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                      <p className="font-medium text-gray-900">{sellingPrice.toFixed(2)} € HT</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#1a365d] mb-4">Récapitulatif</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Durée du contrat</span>
                <span className="font-medium">{order.leasing_duration_months} mois</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Loyer mensuel HT</span>
                <span className="font-medium">{monthlyHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA (20%)</span>
                <span className="font-medium">{(monthlyHT * 0.2).toFixed(2)} €</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between">
                <span className="font-semibold text-[#1a365d]">Loyer mensuel TTC</span>
                <span className="font-bold text-marlon-green">{monthlyTTC.toFixed(2)} €</span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Coût total HT</span>
                  <span className="font-medium">{order.total_amount_ht.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#1a365d]">Coût total TTC</span>
                  <span className="font-bold text-marlon-green text-lg">
                    {(order.total_amount_ht * 1.2).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents & Factures */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#1a365d] mb-4">Documents</h3>

            {/* Contract */}
            {contract && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Contrat</p>
                <a
                  href={contract.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-marlon-green/10 rounded-lg flex items-center justify-center">
                    <Icon icon="mdi:file-document-outline" className="h-5 w-5 text-marlon-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Contrat de location</p>
                    <p className="text-xs text-gray-500">
                      {new Date(contract.uploaded_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Icon icon="mdi:download" className="h-5 w-5 text-gray-400" />
                </a>
              </div>
            )}

            {/* Invoices */}
            {invoices.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Factures</p>
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <a
                      key={inv.id}
                      href={inv.invoice?.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Icon icon="mdi:receipt-text-outline" className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {inv.invoice?.description || 'Facture'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {inv.invoice?.uploaded_at &&
                            new Date(inv.invoice.uploaded_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Icon icon="mdi:download" className="h-5 w-5 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Other Documents */}
            {documents.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Autres documents</p>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon icon="mdi:file-outline" className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Icon icon="mdi:download" className="h-5 w-5 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!contract && invoices.length === 0 && documents.length === 0 && (
              <div className="text-center py-4">
                <Icon icon="mdi:file-document-outline" className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun document disponible</p>
              </div>
            )}
          </div>

          {/* Delivery address */}
          {order.delivery_address && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-[#1a365d] mb-4">Adresse de livraison</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">{order.delivery_name}</p>
                <p>{order.delivery_address}</p>
                <p>
                  {order.delivery_postal_code} {order.delivery_city}
                </p>
                <p>{order.delivery_country}</p>
                {order.delivery_contact_name && (
                  <p className="pt-2">
                    Contact: {order.delivery_contact_name}
                    {order.delivery_contact_phone && ` - ${order.delivery_contact_phone}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Organization */}
          {order.organization && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-[#1a365d] mb-4">Entreprise</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">{order.organization.name}</p>
                {order.organization.siret && <p>SIRET: {order.organization.siret}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
