'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface OrderItem {
  id: string;
  quantity: number;
  purchase_price_ht: number;
  margin_percent: number;
  product: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount_ht: number;
  leasing_duration_months: number;
  order_items: OrderItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Brouillon', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  sent_to_leaser: { label: 'Envoyé au leaser', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  leaser_accepted: { label: 'Accepté par le leaser', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  contract_uploaded: { label: 'Contrat téléchargé', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  processing: { label: 'En préparation', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  shipped: { label: 'Expédié', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  delivered: { label: 'Livré', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Annulé', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// Liste ordonnée des statuts pour les filtres individuels
const STATUS_ORDER = [
  'draft',
  'pending', 
  'sent_to_leaser',
  'leaser_accepted',
  'contract_uploaded',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

type FilterType = 'all' | 'draft' | 'pending' | 'sent_to_leaser' | 'leaser_accepted' | 'contract_uploaded' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrdersClientProps {
  initialOrders: Order[];
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredOrders = initialOrders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Compte les commandes par statut
  const countByStatus = (status: string) => {
    return initialOrders.filter(o => o.status === status).length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    return STATUS_LABELS[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Mes commandes" />

      {/* Filters */}
      <div className="flex gap-0 mb-8 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'border-marlon-green text-marlon-green bg-marlon-green/5'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Toutes ({initialOrders.length})
        </button>
        {STATUS_ORDER.map((status) => {
          const statusInfo = STATUS_LABELS[status];
          const count = countByStatus(status);
          
          return (
            <button
              key={status}
              onClick={() => setFilter(status as FilterType)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                filter === status
                  ? 'border-marlon-green text-marlon-green bg-marlon-green/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {statusInfo.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Orders list */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Icon icon="mdi:package-variant" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande</h3>
            <p className="text-gray-500 mb-6">Vous n'avez pas encore passé de commande.</p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors"
            >
              <Icon icon="mdi:shopping" className="h-5 w-5" />
              Découvrir le catalogue
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const itemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
              const monthlyTTC = (order.total_amount_ht / order.leasing_duration_months) * 1.2;

              return (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-6">
                    {/* Order details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-[#1a365d]">
                            Commande #{order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Passée le {formatDate(order.created_at)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                        <span className="flex items-center gap-1">
                          <Icon icon="mdi:package-variant" className="h-4 w-4" />
                          {itemCount} article{itemCount > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="mdi:calendar-clock" className="h-4 w-4" />
                          {order.leasing_duration_months} mois
                        </span>
                        <span className="font-semibold text-marlon-green">
                          {monthlyTTC.toFixed(2)} € TTC/mois
                        </span>
                      </div>

                      {/* Products preview */}
                      <div className="flex items-center gap-2">
                        {order.order_items?.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded truncate max-w-[150px]"
                          >
                            {item.product?.name}
                          </span>
                        ))}
                        {order.order_items?.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{order.order_items.length - 3} autre(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex-shrink-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-marlon-green border border-marlon-green rounded-lg hover:bg-marlon-green/10 transition-colors"
                      >
                        Voir le détail
                        <Icon icon="mdi:chevron-right" className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
