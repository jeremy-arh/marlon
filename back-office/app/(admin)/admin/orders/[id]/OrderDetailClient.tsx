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

  const [deleting, setDeleting] = useState(false);
  const [editingItem, setEditingItem] = useState<{ itemId: string; field: 'purchase_price_ht' | 'margin_percent' | 'monthly_price_ht' | 'quantity'; value: string } | null>(null);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState<'purchase_price_ht' | 'ca_marlon_ht' | 'monthly_ttc' | null>(null);
  const [editingSummaryValue, setEditingSummaryValue] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);

  const currentDuration = order.leasing_duration_months || 36;
  const LEASING_DURATIONS = [24, 36, 48, 60, 72, 84].includes(currentDuration)
    ? [24, 36, 48, 60, 72, 84]
    : [currentDuration, 24, 36, 48, 60, 72, 84].sort((a, b) => a - b);

  const refreshOrderData = async () => {
    // Fetch fresh data (no-store pour éviter le cache et afficher les prix mis à jour)
    const response = await fetch(`/api/admin/orders/${initialOrder.id}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
      }
    }
    router.refresh();
  };

  const handleSaveSummaryPrice = async (field: 'purchase_price_ht' | 'ca_marlon_ht' | 'monthly_ttc', value: string) => {
    const cleaned = value.replace(/\s/g, '').replace(',', '.').replace('€', '').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0) return;
    setSavingSummary(true);
    setEditingSummary(null);
    try {
      const body: Record<string, number> = {};
      if (field === 'purchase_price_ht') body.total_purchase_price_ht = num;
      else if (field === 'ca_marlon_ht') body.total_ca_marlon_ht = num;
      else body.total_monthly_ttc = num;
      const res = await fetch(`/api/admin/orders/${order.id}/prices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      // Mise à jour immédiate de l'état local avec les overrides retournés
      if (data.data) {
        setOrder((prev: any) => ({
          ...prev,
          override_purchase_price_ht: data.data.override_purchase_price_ht ?? prev.override_purchase_price_ht,
          override_ca_marlon_ht: data.data.override_ca_marlon_ht ?? prev.override_ca_marlon_ht,
          override_monthly_ttc: data.data.override_monthly_ttc ?? prev.override_monthly_ttc,
        }));
      }
      await refreshOrderData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSaveDuration = async (months: number) => {
    setSavingDuration(true);
    setEditingDuration(false);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leasing_duration_months: months }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await refreshOrderData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingDuration(false);
    }
  };

  const handleSaveQuantity = async (itemId: string, productId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setSavingItem(itemId);
    setEditingItem(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity: num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await refreshOrderData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingItem(null);
    }
  };

  const handleSavePrice = async (itemId: string, field: 'purchase_price_ht' | 'margin_percent' | 'monthly_price_ht', value: string, isTTC?: boolean) => {
    let num = parseFloat(value.replace(',', '.'));
    if (field === 'monthly_price_ht' && isTTC) num = num / 1.2; // Convertir TTC → HT
    if (isNaN(num) || num < 0) return;
    setSavingItem(itemId);
    setEditingItem(null);
    try {
      const body: Record<string, number> = {};
      if (field === 'purchase_price_ht') body.purchase_price_ht = num;
      else if (field === 'margin_percent') body.margin_percent = num;
      else body.monthly_price_ht = num;

      const res = await fetch(`/api/admin/orders/${order.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await refreshOrderData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingItem(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande #${order.id.slice(0, 8)} ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      router.push('/admin/orders');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Calculs depuis les order_items (jamais modifiés par le Résumé)
  const calculatedPurchaseHT = order.order_items?.reduce((sum: number, item: any) => {
    const purchasePrice = parseFloat(item.purchase_price_ht?.toString() || item.product?.purchase_price_ht?.toString() || '0');
    return sum + (purchasePrice * item.quantity);
  }, 0) || 0;

  const calculatedCaMarlon = order.order_items?.reduce((sum: number, item: any) => {
    const purchasePrice = parseFloat(item.purchase_price_ht?.toString() || item.product?.purchase_price_ht?.toString() || '0');
    const margin = parseFloat(item.margin_percent?.toString() || item.product?.marlon_margin_percent?.toString() || '0');
    return sum + (purchasePrice * margin / 100 * item.quantity);
  }, 0) || 0;

  const durationMonths = order.leasing_duration_months || 36;
  const totalHT = parseFloat(order.total_amount_ht?.toString() || '0') || 0;
  const calculatedMonthlyTTC = (totalHT / durationMonths) * 1.2;

  // Résumé : overrides si définis, sinon valeurs calculées
  const purchasePriceHT = order.override_purchase_price_ht != null ? parseFloat(order.override_purchase_price_ht) : calculatedPurchaseHT;
  const purchasePriceTTC = purchasePriceHT * 1.2;
  const marlonRevenueHT = order.override_ca_marlon_ht != null ? parseFloat(order.override_ca_marlon_ht) : calculatedCaMarlon;
  const monthlyPrice = order.override_monthly_ttc != null ? parseFloat(order.override_monthly_ttc) : calculatedMonthlyTTC;
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
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
            ) : (
              <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
            )}
            Supprimer
          </button>
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
                  <div>
                    <h2 className="text-lg font-semibold text-black">Articles de la commande</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un prix pour le modifier</p>
                  </div>
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
                        (() => {
                          const grouped = order.order_items.reduce((acc: Record<string, { items: any[] }>, item: any) => {
                            const pid = item.product_id;
                            if (!acc[pid]) acc[pid] = { items: [] };
                            acc[pid].items.push(item);
                            return acc;
                          }, {});
                          const rows = Object.values(grouped).map((g) => {
                            const first = g.items[0];
                            const qty = g.items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
                            const totalCalc = g.items.reduce((s: number, i: any) => s + parseFloat(i.calculated_price_ht?.toString() || '0') * (i.quantity || 1), 0);
                            return {
                              productId: first.product_id,
                              product: first.product,
                              items: g.items,
                              quantity: qty,
                              totalCalculatedPrice: totalCalc,
                              purchasePrice: parseFloat(first.purchase_price_ht?.toString() || first.product?.purchase_price_ht?.toString() || '0'),
                              margin: parseFloat(first.margin_percent?.toString() || first.product?.marlon_margin_percent?.toString() || '0'),
                              coefficient: parseFloat(first.coefficient_used?.toString() || '0'),
                              firstItemId: first.id,
                            };
                          });
                          return rows.map((row) => {
                            const durationMonths = order.leasing_duration_months || 36;
                            const unitCalc = row.totalCalculatedPrice / row.quantity;
                            const monthlyPriceHT = unitCalc / durationMonths;
                            const monthlyPriceTTC = monthlyPriceHT * 1.20;
                            const isEditing = editingItem?.itemId === row.firstItemId;
                            const isSaving = savingItem === row.firstItemId;

                            const EditableCell = ({ field, displayValue, onStartEdit, isMonthlyTTC }: { field: 'purchase_price_ht' | 'margin_percent' | 'monthly_price_ht'; displayValue: string; onStartEdit: () => void; isMonthlyTTC?: boolean }) => {
                              const isThisEditing = isEditing && editingItem?.field === field;
                              const value = isThisEditing ? editingItem!.value : displayValue;
                              return (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {isThisEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={value}
                                      onChange={(e) => setEditingItem((prev) => prev ? { ...prev, value: e.target.value } : null)}
                                      onBlur={() => handleSavePrice(row.firstItemId, field, value, isMonthlyTTC)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSavePrice(row.firstItemId, field, value, isMonthlyTTC);
                                        if (e.key === 'Escape') setEditingItem(null);
                                      }}
                                      className="w-24 px-2 py-1 border border-marlon-green rounded text-black focus:outline-none focus:ring-2 focus:ring-marlon-green"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={onStartEdit}
                                      disabled={isSaving}
                                      className="text-left hover:bg-marlon-green/10 rounded px-1 py-0.5 -mx-1 transition-colors disabled:opacity-50"
                                      title="Cliquer pour modifier"
                                    >
                                      {value}
                                    </button>
                                  )}
                                </td>
                              );
                            };

                            const isQtyEditing = isEditing && editingItem?.field === 'quantity';
                            const qtyValue = isQtyEditing ? editingItem!.value : row.quantity.toString();

                            return (
                              <tr key={row.productId} className={`hover:bg-gray-50 ${isSaving ? 'opacity-70' : ''}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-black">{row.product?.name || 'N/A'}</div>
                                    {row.product?.reference && (
                                      <div className="text-sm text-gray-500">Ref: {row.product.reference}</div>
                                    )}
                                  </div>
                                </td>
                                <EditableCell
                                  field="purchase_price_ht"
                                  displayValue={row.purchasePrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'}
                                  onStartEdit={() => setEditingItem({ itemId: row.firstItemId, field: 'purchase_price_ht', value: row.purchasePrice.toString() })}
                                />
                                <EditableCell
                                  field="margin_percent"
                                  displayValue={row.margin.toFixed(2) + '%'}
                                  onStartEdit={() => setEditingItem({ itemId: row.firstItemId, field: 'margin_percent', value: row.margin.toString() })}
                                />
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {isQtyEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={qtyValue}
                                      onChange={(e) => setEditingItem((prev) => prev ? { ...prev, value: e.target.value } : null)}
                                      onBlur={() => handleSaveQuantity(row.firstItemId, row.productId, qtyValue)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveQuantity(row.firstItemId, row.productId, qtyValue);
                                        if (e.key === 'Escape') setEditingItem(null);
                                      }}
                                      className="w-16 px-2 py-1 border border-marlon-green rounded text-black focus:outline-none focus:ring-2 focus:ring-marlon-green"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingItem({ itemId: row.firstItemId, field: 'quantity', value: row.quantity.toString() })}
                                      disabled={isSaving}
                                      className="hover:bg-marlon-green/10 rounded px-1 py-0.5 -mx-1 transition-colors disabled:opacity-50"
                                      title="Cliquer pour modifier"
                                    >
                                      {row.quantity}
                                    </button>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {(() => {
                                    const unitPriceHT = unitCalc;
                                    const unitPriceTTC = unitPriceHT * 1.20;
                                    const displayPrice = showTTC ? unitPriceTTC : unitPriceHT;
                                    return displayPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
                                  })()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                                  {(() => {
                                    const priceTTC = row.totalCalculatedPrice * 1.20;
                                    const displayPrice = showTTC ? priceTTC : row.totalCalculatedPrice;
                                    return displayPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
                                  })()}
                                </td>
                                <EditableCell
                                  field="monthly_price_ht"
                                  displayValue={(showTTC ? monthlyPriceTTC : monthlyPriceHT).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'}
                                  onStartEdit={() => setEditingItem({ itemId: row.firstItemId, field: 'monthly_price_ht', value: (showTTC ? monthlyPriceTTC : monthlyPriceHT).toFixed(2) })}
                                  isMonthlyTTC={showTTC}
                                />
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {row.coefficient.toFixed(4)}
                                </td>
                              </tr>
                            );
                          });
                        })()
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
                  <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un montant pour modifier</p>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Prix d&apos;achat HT:</span>
                    {editingSummary === 'purchase_price_ht' ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSummaryValue}
                        onChange={(e) => setEditingSummaryValue(e.target.value)}
                        onBlur={() => handleSaveSummaryPrice('purchase_price_ht', editingSummaryValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSummaryPrice('purchase_price_ht', editingSummaryValue);
                          if (e.key === 'Escape') setEditingSummary(null);
                        }}
                        className="w-28 px-2 py-1 text-right border border-marlon-green rounded text-black focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingSummary('purchase_price_ht'); setEditingSummaryValue(purchasePriceHT.toFixed(2)); }}
                        disabled={savingSummary}
                        className="font-medium text-black hover:bg-marlon-green/10 rounded px-1 -mr-1 transition-colors disabled:opacity-50"
                        title="Cliquer pour modifier"
                      >
                        {purchasePriceHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prix d&apos;achat TTC:</span>
                    <span className="font-medium text-black">
                      {purchasePriceTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">CA Marlon HT:</span>
                    {editingSummary === 'ca_marlon_ht' ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSummaryValue}
                        onChange={(e) => setEditingSummaryValue(e.target.value)}
                        onBlur={() => handleSaveSummaryPrice('ca_marlon_ht', editingSummaryValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSummaryPrice('ca_marlon_ht', editingSummaryValue);
                          if (e.key === 'Escape') setEditingSummary(null);
                        }}
                        className="w-28 px-2 py-1 text-right border border-marlon-green rounded text-black focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingSummary('ca_marlon_ht'); setEditingSummaryValue(marlonRevenueHT.toFixed(2)); }}
                        disabled={savingSummary}
                        className="font-medium text-black hover:bg-marlon-green/10 rounded px-1 -mr-1 transition-colors disabled:opacity-50"
                        title="Cliquer pour modifier"
                      >
                        {marlonRevenueHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total HT:</span>
                    <span className="font-medium text-black">
                      {parseFloat(order.total_amount_ht?.toString() || '0').toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Prix mensuel TTC:</span>
                    {editingSummary === 'monthly_ttc' ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSummaryValue}
                        onChange={(e) => setEditingSummaryValue(e.target.value)}
                        onBlur={() => handleSaveSummaryPrice('monthly_ttc', editingSummaryValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSummaryPrice('monthly_ttc', editingSummaryValue);
                          if (e.key === 'Escape') setEditingSummary(null);
                        }}
                        className="w-28 px-2 py-1 text-right border border-marlon-green rounded text-black focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingSummary('monthly_ttc'); setEditingSummaryValue(monthlyPrice.toFixed(2)); }}
                        disabled={savingSummary}
                        className="font-medium text-black hover:bg-marlon-green/10 rounded px-1 -mr-1 transition-colors disabled:opacity-50"
                        title="Cliquer pour modifier"
                      >
                        {monthlyPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </button>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Durée:</span>
                      {editingDuration ? (
                        <select
                          autoFocus
                          value={currentDuration}
                          onChange={(e) => handleSaveDuration(parseInt(e.target.value, 10))}
                          onBlur={() => setEditingDuration(false)}
                          className="px-2 py-1 border border-marlon-green rounded text-black focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        >
                          {LEASING_DURATIONS.map((m) => (
                            <option key={m} value={m}>{m} mois</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingDuration(true)}
                          disabled={savingDuration}
                          className="font-medium text-black hover:bg-marlon-green/10 rounded px-1 -mr-1 transition-colors disabled:opacity-50"
                          title="Cliquer pour modifier"
                        >
                          {currentDuration} mois
                        </button>
                      )}
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
