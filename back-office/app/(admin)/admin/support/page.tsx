'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface SupportMessage {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  organization_id: string;
  organization?: { name: string };
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_notes: string;
  created_at: string;
  updated_at: string;
  resolved_at: string;
}

interface SupportReply {
  id: string;
  support_message_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: 'mdi:clock-outline' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: 'mdi:progress-clock' },
  resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800', icon: 'mdi:check-circle' },
  closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-800', icon: 'mdi:close-circle' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Basse', color: 'text-gray-500' },
  normal: { label: 'Normale', color: 'text-blue-500' },
  high: { label: 'Haute', color: 'text-orange-500' },
  urgent: { label: 'Urgente', color: 'text-red-500' },
};

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [filter]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support?status=${filter}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (messageId: string) => {
    try {
      console.log('Loading replies for message:', messageId);
      const res = await fetch(`/api/admin/support/${messageId}/replies`);
      const data = await res.json();
      console.log('Replies response:', { status: res.status, data });
      if (data.success) {
        setReplies(data.data || []);
      } else {
        console.error('Error loading replies:', data.error);
      }
    } catch (err) {
      console.error('Error loading replies:', err);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      console.log('Sending reply:', { messageId: selectedMessage.id, message: replyMessage });
      const res = await fetch(`/api/admin/support/${selectedMessage.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });

      const data = await res.json();
      console.log('Reply response:', { status: res.status, data });
      
      if (res.ok && data.success) {
        setReplyMessage('');
        await loadReplies(selectedMessage.id);
        await loadMessages();
      } else {
        console.error('Error response:', data);
        alert(data.error || 'Erreur lors de l\'envoi de la réponse');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Erreur lors de l\'envoi de la réponse: ' + (err as Error).message);
    } finally {
      setSendingReply(false);
    }
  };

  const updateMessage = async (id: string, updates: Partial<SupportMessage>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (res.ok) {
        loadMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage({ ...selectedMessage, ...updates } as SupportMessage);
        }
      }
    } catch (err) {
      console.error('Error updating message:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStats = () => {
    return {
      total: messages.length,
      pending: messages.filter(m => m.status === 'pending').length,
      in_progress: messages.filter(m => m.status === 'in_progress').length,
      resolved: messages.filter(m => m.status === 'resolved').length,
    };
  };

  const stats = getStats();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages de support</h1>
        <p className="text-gray-600">Gérez les demandes de support des utilisateurs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Icon icon="mdi:message-text" className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Icon icon="mdi:clock-outline" className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">En attente</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon icon="mdi:progress-clock" className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.in_progress}</p>
              <p className="text-sm text-gray-500">En cours</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Icon icon="mdi:check-circle" className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-sm text-gray-500">Résolus</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in_progress', 'resolved', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-marlon-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Tous' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Messages List */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Icon icon="mdi:inbox" className="h-12 w-12 mb-2" />
              <p>Aucun message</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((message) => {
                const statusConfig = STATUS_CONFIG[message.status];
                const priorityConfig = PRIORITY_CONFIG[message.priority];

                return (
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message);
                      setAdminNotes(message.admin_notes || '');
                      loadReplies(message.id);
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-marlon-green/5 border-l-4 border-marlon-green' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className={`text-xs font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{message.subject}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Icon icon="mdi:account" className="h-4 w-4" />
                      <span>{message.user_name || message.user_email || 'Utilisateur inconnu'}</span>
                      {message.organization?.name && (
                        <>
                          <span>•</span>
                          <span>{message.organization.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Detail */}
        {selectedMessage && (
          <div className="w-[400px] bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Détail du message</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={selectedMessage.status}
                  onChange={(e) => updateMessage(selectedMessage.id, { status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select
                  value={selectedMessage.priority}
                  onChange={(e) => updateMessage(selectedMessage.id, { priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                <p className="text-gray-900 font-medium">{selectedMessage.subject}</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedMessage.message}
                </p>
              </div>

              {/* User Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expéditeur</label>
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:account" className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedMessage.user_name || 'Non renseigné'}</p>
                    <p className="text-xs text-gray-500">{selectedMessage.user_email}</p>
                  </div>
                </div>
                {selectedMessage.organization?.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Organisation : {selectedMessage.organization.name}
                  </p>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green text-sm"
                  placeholder="Notes pour l'équipe..."
                />
                <button
                  onClick={() => updateMessage(selectedMessage.id, { admin_notes: adminNotes })}
                  disabled={saving}
                  className="mt-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
                </button>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {selectedMessage.status === 'pending' && (
                  <button
                    onClick={() => updateMessage(selectedMessage.id, { status: 'in_progress' })}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:play" className="h-5 w-5" />
                    Prendre en charge
                  </button>
                )}
                {selectedMessage.status === 'in_progress' && (
                  <button
                    onClick={() => updateMessage(selectedMessage.id, { status: 'resolved' })}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:check" className="h-5 w-5" />
                    Marquer comme résolu
                  </button>
                )}
                {selectedMessage.status !== 'closed' && (
                  <button
                    onClick={() => updateMessage(selectedMessage.id, { status: 'closed' })}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:close" className="h-5 w-5" />
                    Fermer
                  </button>
                )}
              </div>

              {/* Replies Section */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Conversation</h4>
                
                {/* Replies List */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {replies.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Aucune réponse pour le moment</p>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg ${
                          reply.is_admin_reply
                            ? 'bg-marlon-green/10 border border-marlon-green/20'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon
                              icon={reply.is_admin_reply ? 'mdi:account-tie' : 'mdi:account'}
                              className={`h-4 w-4 ${
                                reply.is_admin_reply ? 'text-marlon-green' : 'text-gray-500'
                              }`}
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {reply.is_admin_reply ? 'Support' : reply.user_name || 'Utilisateur'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Form */}
                <div>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green text-sm"
                    placeholder="Répondre à l'utilisateur..."
                  />
                  <button
                    onClick={sendReply}
                    disabled={sendingReply || !replyMessage.trim()}
                    className="mt-2 w-full px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingReply ? (
                      <>
                        <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:send" className="h-5 w-5" />
                        Envoyer la réponse
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                <p>Créé le : {formatDate(selectedMessage.created_at)}</p>
                {selectedMessage.resolved_at && (
                  <p>Résolu le : {formatDate(selectedMessage.resolved_at)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
