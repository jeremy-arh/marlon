'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

interface OrderLog {
  id: string;
  action_type: string;
  description: string;
  metadata: any;
  user_id: string | null;
  created_at: string;
  user?: {
    email: string;
  };
}

interface TimelineTabProps {
  orderId: string;
}

export default function TimelineTab({ orderId }: TimelineTabProps) {
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLogs();
  }, [orderId]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/logs`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'mdi:plus-circle';
      case 'updated':
        return 'mdi:pencil';
      case 'status_changed':
        return 'mdi:flag';
      case 'item_added':
        return 'mdi:package-plus';
      case 'item_updated':
        return 'mdi:pencil';
      case 'item_deleted':
        return 'mdi:package-remove';
      case 'tracking_updated':
        return 'mdi:pencil';
      case 'document_added':
        return 'mdi:file-plus';
      case 'document_deleted':
        return 'mdi:file-remove';
      case 'invoice_added':
        return 'mdi:receipt-plus';
      case 'invoice_removed':
        return 'mdi:receipt-remove';
      default:
        return 'mdi:information';
    }
  };

  const getActionTypeCategory = (actionType: string): 'add' | 'delete' | 'update' => {
    if (actionType.includes('_added') || actionType === 'created') {
      return 'add';
    }
    if (actionType.includes('_deleted') || actionType.includes('_removed')) {
      return 'delete';
    }
    return 'update';
  };

  const getCategoryIcon = (category: 'add' | 'delete' | 'update') => {
    switch (category) {
      case 'add':
        return 'mdi:plus-circle';
      case 'delete':
        return 'mdi:delete';
      case 'update':
        return 'mdi:pencil';
    }
  };

  const getCategoryColor = (category: 'add' | 'delete' | 'update') => {
    switch (category) {
      case 'add':
        return 'text-green-600';
      case 'delete':
        return 'text-red-600';
      case 'update':
        return 'text-blue-600';
    }
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Chargement des logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-black">Timeline des actions</h2>
        </div>
        <div className="p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune action enregistrée pour cette commande
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                const category = getActionTypeCategory(log.action_type);
                
                return (
                  <div key={log.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                    {/* Category icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon 
                        icon={getCategoryIcon(category)} 
                        className={`h-5 w-5 ${getCategoryColor(category)}`} 
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-black">{log.description}</p>
                          </div>
                          {log.user?.email && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <Icon icon="mdi:account" className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs text-gray-500">{log.user.email}</span>
                            </div>
                          )}
                          {hasMetadata && isExpanded && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-3 border border-gray-200">
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                          {hasMetadata && (
                            <button
                              onClick={() => toggleLogExpansion(log.id)}
                              className="mt-2 text-xs text-marlon-green hover:text-[#00A870] flex items-center gap-1"
                            >
                              <Icon 
                                icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
                                className="h-4 w-4" 
                              />
                              {isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
                            </button>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
