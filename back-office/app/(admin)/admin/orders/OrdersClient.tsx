'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import Link from 'next/link';
import SideModal from '@/components/SideModal';
import OrderForm from '@/components/OrderForm';
import SearchableSelect from '@/components/SearchableSelect';

interface OrdersClientProps {
  initialOrders: any[];
}

type ViewMode = 'table' | 'kanban';

const statusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending', label: 'En attente' },
  { value: 'sent_to_leaser', label: 'Envoyé au leaser' },
  { value: 'leaser_accepted', label: 'Accepté par le leaser' },
  { value: 'contract_uploaded', label: 'Contrat téléchargé' },
  { value: 'processing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédié' },
  { value: 'delivered', label: 'Livré' },
  { value: 'cancelled', label: 'Annulé' },
];

const statusLabels: { [key: string]: string } = {
  'draft': 'Brouillon',
  'pending': 'En attente',
  'sent_to_leaser': 'Envoyé au leaser',
  'leaser_accepted': 'Accepté par le leaser',
  'contract_uploaded': 'Contrat téléchargé',
  'processing': 'En préparation',
  'shipped': 'Expédié',
  'delivered': 'Livré',
  'cancelled': 'Annulé',
};

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leasers, setLeasers] = useState<any[]>([]);
  const [durations, setDurations] = useState<any[]>([]);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [leaserFilter, setLeaserFilter] = useState<string>('');

  // Sync orders when initialOrders changes (e.g. after router.refresh() post-create)
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    // Load leasers
    fetch('/api/admin/leasers')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLeasers(data.data || []);
        }
      });
    
    // Load durations
    fetch('/api/admin/leasing-durations')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDurations(data.data || []);
        }
      });
  }, []);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          order.id.toLowerCase().includes(query) ||
          order.organization?.name?.toLowerCase().includes(query) ||
          order.leaser?.name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter && order.status !== statusFilter) {
        return false;
      }

      // Leaser filter
      if (leaserFilter && order.leaser_id !== leaserFilter) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, leaserFilter]);

  // Group orders by status for kanban
  const ordersByStatus = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    statusOptions.forEach(status => {
      grouped[status.value] = [];
    });
    
    filteredOrders.forEach((order: any) => {
      const status = order.status || 'draft';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(order);
    });

    return grouped;
  }, [filteredOrders]);

  const handleLeaserChange = async (orderId: string, leaserId: string) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaser_id: leaserId || null }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  leaser_id: leaserId || null, 
                  leaser: leasers.find(l => l.id === leaserId) || null,
                  total_amount_ht: data.data.total_amount_ht ?? order.total_amount_ht,
                  order_items: data.data.order_items || order.order_items,
                }
              : order
          )
        );
        router.refresh();
      } else {
        alert(data.error || 'Erreur lors de la mise à jour du leaser');
      }
    } catch (error) {
      console.error('Error updating leaser:', error);
      alert('Erreur réseau lors de la mise à jour du leaser');
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status } : order
          )
        );
        router.refresh();
      } else {
        alert(data.error || 'Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur réseau lors de la mise à jour du statut');
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleDurationChange = async (orderId: string, durationMonths: number) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leasing_duration_months: durationMonths }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  leasing_duration_months: data.data.leasing_duration_months,
                  total_amount_ht: data.data.total_amount_ht ?? order.total_amount_ht,
                  order_items: data.data.order_items || order.order_items
                }
              : order
          )
        );
        router.refresh();
      } else {
        alert(data.error || 'Erreur lors de la mise à jour de la durée');
      }
    } catch (error) {
      console.error('Error updating duration:', error);
      alert('Erreur réseau lors de la mise à jour de la durée');
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleContractStartDateChange = async (orderId: string, date: string) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_start_date: date || null }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(prevOrders => 
            prevOrders.map(order => {
              if (order.id === orderId) {
                return {
                  ...order,
                  order_tracking: data.data ? [data.data] : []
                };
              }
              return order;
            })
          );
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Error updating contract start date:', error);
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    router.refresh();
  };

  const handleDeleteOrder = async (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande #${order.id.slice(0, 8)} ? Cette action est irréversible.`)) return;
    setDeletingOrderId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      setOrders(prev => prev.filter(o => o.id !== order.id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Calculate stats
  const totalOrders = filteredOrders?.length || 0;
  const deliveredOrders = filteredOrders?.filter(o => o.status === 'delivered') || [];

  const getOrderMarlonHT = (order: any) => {
    if (order.override_ca_marlon_ht != null) return parseFloat(order.override_ca_marlon_ht);
    return order.order_items?.reduce((sum: number, item: any) => {
      const p = parseFloat(item.purchase_price_ht?.toString() || item.product?.purchase_price_ht?.toString() || '0');
      const m = parseFloat(item.margin_percent?.toString() || item.product?.marlon_margin_percent?.toString() || '0');
      return sum + (p * m / 100 * item.quantity);
    }, 0) || 0;
  };

  const totalRevenue = deliveredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount_ht?.toString() || '0'), 0);
  const marlonRevenue = deliveredOrders.reduce((sum, order) => sum + getOrderMarlonHT(order), 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderCard = ({ order, onDelete }: { order: any; onDelete: (e: React.MouseEvent, order: any) => void }) => {
    const equipmentCount = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const months = order.leasing_duration_months || 36;
    const totalHT = parseFloat(order.total_amount_ht?.toString() || '0') || 0;
    const purchasePriceHT = order.override_purchase_price_ht != null
      ? parseFloat(order.override_purchase_price_ht)
      : (order.order_items?.reduce((sum: number, item: any) => {
          const p = parseFloat(item.purchase_price_ht?.toString() || item.product?.purchase_price_ht?.toString() || '0');
          return sum + (p * item.quantity);
        }, 0) || 0);
    const purchasePriceTTC = purchasePriceHT * 1.2;
    const monthlyPrice = order.override_monthly_ttc != null
      ? parseFloat(order.override_monthly_ttc)
      : (totalHT / months) * 1.2;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link href={`/admin/orders/${order.id}`} className="text-sm font-semibold text-black hover:text-marlon-green">
              #{order.id.slice(0, 8)}
            </Link>
            <p className="text-xs text-gray-500 mt-1">{order.organization?.name || 'N/A'}</p>
          </div>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(order.id, e.target.value)}
            disabled={updatingOrders.has(order.id)}
            className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1 text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green disabled:opacity-50"
            onClick={(e) => e.stopPropagation()}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Prix d&apos;achat TTC:</span>
            <span className="font-medium text-black">{purchasePriceTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Prix mensuel:</span>
            <span className="font-medium text-black">{monthlyPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €TTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Équipements:</span>
            <span className="font-medium text-black">{equipmentCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Durée:</span>
            <span className="font-medium text-black">{order.leasing_duration_months} mois</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            <span>Créé: {formatDate(order.created_at)}</span>
            {order.updated_at !== order.created_at && (
              <span className="ml-2">MAJ: {formatDate(order.updated_at)}</span>
            )}
          </div>
          <button
            onClick={(e) => onDelete(e, order)}
            disabled={deletingOrderId === order.id}
            className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
            title="Supprimer"
          >
            {deletingOrderId === order.id ? (
              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
            ) : (
              <Icon icon="meteor-icons:trash-can" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Commandes</h3>
              <Icon icon="mdi:clipboard-list" className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-black">{totalOrders}</p>
          </div>
          <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">CA</h3>
              <Icon icon="mdi:currency-eur" className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-black">{totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</p>
          </div>
          <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">CA Marlon</h3>
              <Icon icon="mdi:chart-line" className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-black">{marlonRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</p>
          </div>
        </div>

        {/* Action Button and View Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button onClick={() => setIsModalOpen(true)} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
            Créer une commande
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm border border-gray-300">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-marlon-green text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon icon="mdi:table" className="h-5 w-5 inline mr-2" />
              Tableau
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-marlon-green text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon icon="mdi:view-column" className="h-5 w-5 inline mr-2" />
              Kanban
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="mb-2 block text-sm font-medium text-black">Recherche</label>
              <div className="relative">
                <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID, client, leaser..."
                  className="w-full rounded-md border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-black">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              >
                <option value="">Tous</option>
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Leaser Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-black">Leaser</label>
              <select
                value={leaserFilter}
                onChange={(e) => setLeaserFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              >
                <option value="">Tous</option>
                {leasers.map(leaser => (
                  <option key={leaser.id} value={leaser.id}>{leaser.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || statusFilter || leaserFilter) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setLeaserFilter('');
                }}
                className="text-sm text-marlon-green hover:text-[#00A870]"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix d&apos;achat TTC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CA marlon HT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix mensuel TTC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mois</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaser</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créé le</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière MAJ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders && filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => {
                      const equipmentCount = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                      const months = order.leasing_duration_months || 36;
                      const totalHT = parseFloat(order.total_amount_ht?.toString() || '0') || 0;
                      // Utiliser les overrides si définis (cohérence avec la page détail), sinon valeurs calculées depuis order_items
                      const purchasePriceHT = order.override_purchase_price_ht != null
                        ? parseFloat(order.override_purchase_price_ht)
                        : (order.order_items?.reduce((sum: number, item: any) => {
                            const p = parseFloat(item.purchase_price_ht?.toString() || item.product?.purchase_price_ht?.toString() || '0');
                            return sum + (p * item.quantity);
                          }, 0) || 0);
                      const purchasePriceTTC = purchasePriceHT * 1.2;
                      const marlonRevenueHT = order.override_ca_marlon_ht != null
                        ? parseFloat(order.override_ca_marlon_ht)
                        : (order.order_items?.reduce((sum: number, item: any) => {
                            const p = parseFloat(item.purchase_price_ht?.toString() || item.product?.purchase_price_ht?.toString() || '0');
                            const m = parseFloat(item.margin_percent?.toString() || item.product?.marlon_margin_percent?.toString() || '0');
                            return sum + (p * m / 100 * item.quantity);
                          }, 0) || 0);
                      const monthlyPrice = order.override_monthly_ttc != null
                        ? parseFloat(order.override_monthly_ttc)
                        : (totalHT / months) * 1.2;

                      return (
                        <tr 
                          key={order.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">#{order.id.slice(0, 8)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{order.organization?.name || 'N/A'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{purchasePriceTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{marlonRevenueHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{monthlyPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €TTC</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={order.leasing_duration_months}
                              onChange={(e) => handleDurationChange(order.id, parseInt(e.target.value))}
                              disabled={updatingOrders.has(order.id)}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green disabled:opacity-50"
                            >
                              {durations.map((duration) => (
                                <option key={duration.id} value={duration.months}>
                                  {duration.months} mois
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              disabled={updatingOrders.has(order.id)}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green disabled:opacity-50"
                            >
                              {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={order.leaser_id || ''}
                              onChange={(e) => handleLeaserChange(order.id, e.target.value)}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                            >
                              <option value="">-</option>
                              {leasers.map((leaser) => (
                                <option key={leaser.id} value={leaser.id}>
                                  {leaser.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.created_at)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.updated_at)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleDeleteOrder(e, order)}
                              disabled={deletingOrderId === order.id}
                              className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deletingOrderId === order.id ? (
                                <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                              ) : (
                                <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                        Aucune commande trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {statusOptions.map((status) => {
                const statusOrders = ordersByStatus[status.value] || [];
                return (
                  <div key={status.value} className="flex-shrink-0 w-80">
                    <div className="bg-gray-100 rounded-lg p-3 mb-3">
                      <h3 className="text-sm font-semibold text-black">
                        {status.label} ({statusOrders.length})
                      </h3>
                    </div>
                    <div className="space-y-3 min-h-[400px]">
                      {statusOrders.map((order: any) => (
                        <OrderCard key={order.id} order={order} onDelete={handleDeleteOrder} />
                      ))}
                      {statusOrders.length === 0 && (
                        <div className="text-center text-sm text-gray-400 py-8">
                          Aucune commande
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Side Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Créer une commande"
      >
        <OrderForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </SideModal>
    </>
  );
}
