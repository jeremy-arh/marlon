'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon';
import TrackingTab from './tabs/TrackingTab';
import ContractTab from './tabs/ContractTab';
import EquipmentTab from './tabs/EquipmentTab';
import TimelineTab from './tabs/TimelineTab';

interface OrderDetailClientProps {
  order: any;
  initialTracking?: any;
  initialDocuments?: any[];
  initialInvoices?: any[];
}

export default function OrderDetailClient({
  order: initialOrder,
  initialTracking,
  initialDocuments = [],
  initialInvoices = [],
}: OrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'contract' | 'equipment' | 'timeline'>('overview');
  const [showTTC, setShowTTC] = useState(false); // Toggle pour HT/TTC dans la vue d'ensemble

  // Sync active tab with URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'equipment' || hash === 'tracking' || hash === 'contract' || hash === 'overview' || hash === 'timeline') {
      setActiveTab(hash as any);
    }
  }, []);

  // Update URL hash when tab changes
  useEffect(() => {
    if (activeTab !== 'overview') {
      window.history.replaceState(null, '', `#${activeTab}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeTab]);

  const refreshOrderData = async () => {
    // Fetch fresh data
    const response = await fetch(`/api/admin/orders/${initialOrder.id}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
      }
    }
    // Also refresh the router to update server-side data
    router.refresh();
  };

  // Calculate totals
  const purchasePriceHT = order.order_items?.reduce((sum: number, item: any) => {
    const purchasePrice = parseFloat(item.product?.purchase_price_ht?.toString() || '0');
    return sum + (purchasePrice * item.quantity);
  }, 0) || 0;

  const purchasePriceTTC = order.order_items?.reduce((sum: number, item: any) => {
    const purchasePrice = parseFloat(item.product?.purchase_price_ht?.toString() || '0');
    return sum + (purchasePrice * 1.2 * item.quantity);
  }, 0) || 0;

  const marlonRevenueHT = order.order_items?.reduce((sum: number, item: any) => {
    const purchasePrice = parseFloat(item.product?.purchase_price_ht?.toString() || '0');
    const margin = parseFloat(item.product?.marlon_margin_percent?.toString() || '0');
    return sum + (purchasePrice * margin / 100 * item.quantity);
  }, 0) || 0;

  const monthlyPrice = order.total_amount_ht / order.leasing_duration_months;
  const equipmentCount = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: 'mdi:view-dashboard' },
    { id: 'tracking', label: 'Suivi', icon: 'mdi:clipboard-list' },
    { id: 'contract', label: 'Contrat', icon: 'mdi:file-document' },
    { id: 'equipment', label: 'Équipements', icon: 'mdi:package-variant' },
    { id: 'timeline', label: 'Timeline', icon: 'mdi:clock-outline' },
  ];

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-marlon-green hover:text-[#00A870] mb-2 inline-flex items-center gap-2"
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            Retour aux commandes
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-black">
            Commande #{order.id.slice(0, 8)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {(() => {
              const statusMap: { [key: string]: string } = {
                'draft': 'Brouillon',
                'pending': 'En attente',
                'sent_to_leaser': 'Envoyé au leaser',
                'leaser_accepted': 'Accepté par le leaser',
                'contract_uploaded': 'Contrat téléchargé',
                'processing': 'En préparation',
                'shipped': 'Expédié',
                'delivered': 'Livré',
                'cancelled': 'Annulé'
              };
              return statusMap[order.status] || order.status;
            })()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-marlon-green text-marlon-green'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon={tab.icon} className="h-5 w-5" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">Articles de la commande</h2>
                  {/* Toggle HT/TTC */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Affichage des prix:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTTC(false)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          !showTTC
                            ? 'bg-marlon-green text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        HT
                      </button>
                      <button
                        onClick={() => setShowTTC(true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          showTTC
                            ? 'bg-marlon-green text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        TTC
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix d&apos;achat HT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marge</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix unitaire {showTTC ? 'TTC' : 'HT'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix calculé {showTTC ? 'TTC' : 'HT'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix mensuel {showTTC ? 'TTC' : 'HT'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coefficient</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.order_items && order.order_items.length > 0 ? (
                        order.order_items.map((item: any) => {
                          const purchasePrice = parseFloat(item.product?.purchase_price_ht?.toString() || '0');
                          const margin = parseFloat(item.product?.marlon_margin_percent?.toString() || '0');
                          const calculatedPrice = parseFloat(item.calculated_price_ht?.toString() || '0');
                          const coefficient = parseFloat(item.coefficient_used?.toString() || '0');

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-black">{item.product?.name || 'N/A'}</div>
                                  {item.product?.reference && (
                                    <div className="text-sm text-gray-500">Ref: {item.product.reference}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {purchasePrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {margin.toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const unitPriceHT = calculatedPrice / item.quantity;
                                  const unitPriceTTC = unitPriceHT * 1.20; // TVA 20%
                                  const displayPrice = showTTC ? unitPriceTTC : unitPriceHT;
                                  return displayPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                                {(() => {
                                  const priceTTC = calculatedPrice * 1.20; // TVA 20%
                                  const displayPrice = showTTC ? priceTTC : calculatedPrice;
                                  return displayPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const monthlyPriceHT = calculatedPrice / order.leasing_duration_months;
                                  const monthlyPriceTTC = monthlyPriceHT * 1.20; // TVA 20%
                                  const displayPrice = showTTC ? monthlyPriceTTC : monthlyPriceHT;
                                  return displayPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {coefficient.toFixed(4)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                            Aucun article
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-black">Résumé</h2>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prix d&apos;achat HT:</span>
                    <span className="font-medium text-black">
                      {purchasePriceHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prix d&apos;achat TTC:</span>
                    <span className="font-medium text-black">
                      {purchasePriceTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CA Marlon HT:</span>
                    <span className="font-medium text-black">
                      {marlonRevenueHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total HT:</span>
                    <span className="font-medium text-black">
                      {parseFloat(order.total_amount_ht.toString()).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prix mensuel TTC:</span>
                    <span className="font-medium text-black">
                      {monthlyPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-medium text-black">{order.leasing_duration_months} mois</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">Équipements:</span>
                      <span className="font-medium text-black">{equipmentCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-black">Client</h2>
                </div>
                <div className="px-6 py-4 space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-black">{order.organization?.name || 'N/A'}</span>
                  </div>
                  {order.organization?.siret && (
                    <div>
                      <span className="text-gray-600">SIRET: </span>
                      <span className="text-black">{order.organization.siret}</span>
                    </div>
                  )}
                  {order.organization?.email && (
                    <div>
                      <span className="text-gray-600">Email: </span>
                      <span className="text-black">{order.organization.email}</span>
                    </div>
                  )}
                  {order.organization?.phone && (
                    <div>
                      <span className="text-gray-600">Téléphone: </span>
                      <span className="text-black">{order.organization.phone}</span>
                    </div>
                  )}
                  {order.organization?.address && (
                    <div>
                      <span className="text-gray-600">Adresse: </span>
                      <span className="text-black">
                        {order.organization.address}
                        {order.organization.postal_code && `, ${order.organization.postal_code}`}
                        {order.organization.city && ` ${order.organization.city}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Leaser Information */}
              {order.leaser && (
                <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-black">Leaser</h2>
                  </div>
                  <div className="px-6 py-4 space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-black">{order.leaser.name}</span>
                    </div>
                    {order.leaser.contact_email && (
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="text-black">{order.leaser.contact_email}</span>
                      </div>
                    )}
                    {order.leaser.contact_phone && (
                      <div>
                        <span className="text-gray-600">Téléphone: </span>
                        <span className="text-black">{order.leaser.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Dates */}
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-black">Dates</h2>
                </div>
                <div className="px-6 py-4 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Créée le: </span>
                    <span className="text-black">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {order.updated_at && order.updated_at !== order.created_at && (
                    <div>
                      <span className="text-gray-600">Modifiée le: </span>
                      <span className="text-black">
                        {new Date(order.updated_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <TrackingTab 
            orderId={order.id}
            order={order}
            initialTracking={initialTracking}
            onUpdate={refreshOrderData}
          />
        )}

        {activeTab === 'contract' && (
          <ContractTab orderId={order.id} initialDocuments={initialDocuments} initialInvoices={initialInvoices} />
        )}

        {activeTab === 'equipment' && (
          <EquipmentTab 
            orderId={order.id} 
            orderItems={order.order_items || []} 
            onUpdate={refreshOrderData}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab orderId={order.id} />
        )}
      </div>
    </div>
  );
}
