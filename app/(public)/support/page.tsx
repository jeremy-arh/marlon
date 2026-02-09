'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order_index: number;
}

interface ContactSettings {
  contact_phone?: { number: string; hours: string };
  contact_email?: { email: string; response_time: string };
  contact_address?: { street: string; city: string };
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
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
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets'>('faq');
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [settings, setSettings] = useState<ContactSettings>({});
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<SupportReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Contact form
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    // Charger les données une seule fois au montage, comme dans le back-office
    loadSupportData();
    
    // Reload data every 30 seconds to catch updates from admin
    const interval = setInterval(() => {
      console.log('🔄 Auto-reloading support data...');
      loadSupportData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  const loadSupportData = async () => {
    try {
      // Add cache busting to ensure fresh data
      const timestamp = Date.now();
      const res = await fetch(`/api/support/settings?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      
      console.log('📥 Loaded support settings:', data.data?.settings);
      
      if (data.success) {
        setSettings(data.data.settings);
        setFaqItems(data.data.faq);
      } else {
        setError('Erreur lors du chargement des données');
      }
    } catch (err) {
      console.error('Error loading support data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(faqItems.map((item) => item.category)))];

  const filteredFAQ = faqItems.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/support/message');
      const data = await res.json();

      if (data.success) {
        setTickets(data.data || []);
      } else {
        setError(data.error || 'Erreur lors du chargement des tickets');
      }
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError('Erreur lors du chargement des tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadReplies = async (ticketId: string) => {
    setLoadingReplies(true);
    try {
      console.log('Loading replies for ticket:', ticketId);
      const res = await fetch(`/api/support/message/${ticketId}/replies`);
      const data = await res.json();
      console.log('Replies response:', { status: res.status, data });
      if (data.success) {
        setTicketReplies(data.data || []);
      } else {
        console.error('Error loading replies:', data.error);
      }
    } catch (err) {
      console.error('Error loading replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      console.log('Sending reply:', { ticketId: selectedTicket.id, message: replyMessage });
      const res = await fetch(`/api/support/message/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });

      const data = await res.json();
      console.log('Reply response:', { status: res.status, data });
      
      if (res.ok && data.success) {
        setReplyMessage('');
        await loadReplies(selectedTicket.id);
        await loadTickets();
      } else {
        console.error('Error response:', data);
        setError(data.error || 'Erreur lors de l\'envoi de la réponse');
      }
    } catch (err: any) {
      console.error('Error sending reply:', err);
      setError('Erreur lors de l\'envoi de la réponse: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) return;

    setSending(true);
    setSendError(null);
    
    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setSent(true);
      setContactForm({ subject: '', message: '', priority: 'normal' });
      setTimeout(() => setSent(false), 5000);
      
      // Reload tickets if on tickets tab
      if (activeTab === 'tickets') {
        await loadTickets();
      }
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
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

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <PageHeader title="Support" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Support" />

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {settings.contact_phone && (
            <a
              href={`tel:${settings.contact_phone.number.replace(/\s/g, '')}`}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-marlon-green/10 rounded-lg group-hover:bg-marlon-green/20 transition-colors">
                  <Icon icon="mdi:phone" className="h-6 w-6 text-marlon-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a365d]">Appelez-nous</h3>
                  <p className="text-sm text-gray-500">{settings.contact_phone.number}</p>
                  <p className="text-xs text-gray-400">{settings.contact_phone.hours}</p>
                </div>
              </div>
            </a>
          )}
          {settings.contact_email && (
            <a
              href={`mailto:${settings.contact_email.email}`}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-marlon-green/10 rounded-lg group-hover:bg-marlon-green/20 transition-colors">
                  <Icon icon="mdi:email" className="h-6 w-6 text-marlon-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a365d]">Écrivez-nous</h3>
                  <p className="text-sm text-gray-500">{settings.contact_email.email}</p>
                  <p className="text-xs text-gray-400">{settings.contact_email.response_time}</p>
                </div>
              </div>
            </a>
          )}
          {settings.contact_address && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-marlon-green/10 rounded-lg">
                  <Icon icon="mdi:map-marker" className="h-6 w-6 text-marlon-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a365d]">Notre adresse</h3>
                  <p className="text-sm text-gray-500">{settings.contact_address.street}</p>
                  <p className="text-xs text-gray-400">{settings.contact_address.city}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'faq'
                ? 'border-marlon-green text-marlon-green bg-marlon-green/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Questions fréquentes
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tickets'
                ? 'border-marlon-green text-marlon-green bg-marlon-green/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Mes tickets ({tickets.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          {activeTab === 'faq' && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-[#1a365d] mb-6">Questions fréquentes</h2>

              {/* Category filters */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-marlon-green text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category === 'all' ? 'Toutes' : category}
                    </button>
                  ))}
                </div>
              )}

              {/* FAQ items */}
              {filteredFAQ.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon icon="mdi:help-circle-outline" className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune question fréquente pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFAQ.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFAQ(openFAQ === item.id ? null : item.id)}
                        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {item.category}
                          </span>
                          <span className="font-medium text-gray-900">{item.question}</span>
                        </div>
                        <Icon
                          icon={openFAQ === item.id ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                          className="h-5 w-5 text-gray-400 flex-shrink-0"
                        />
                      </button>
                      {openFAQ === item.id && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-gray-600 text-sm leading-relaxed pl-[70px]">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          )}

          {/* Tickets Section */}
          {activeTab === 'tickets' && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-[#1a365d] mb-6">Mes tickets de support</h2>

                {loadingTickets ? (
                  <div className="flex items-center justify-center h-64">
                    <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Icon icon="mdi:ticket-outline" className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Aucun ticket</p>
                    <p className="text-sm">Vous n'avez pas encore soumis de ticket de support.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => {
                      const statusConfig = STATUS_CONFIG[ticket.status];
                      const priorityConfig = PRIORITY_CONFIG[ticket.priority];

                      return (
                        <div
                          key={ticket.id}
                          className={`border rounded-lg p-4 transition-shadow ${
                            selectedTicket?.id === ticket.id
                              ? 'border-marlon-green shadow-md'
                              : 'border-gray-200 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                              <span className={`text-xs font-medium ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(ticket.created_at)}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2">{ticket.subject}</h3>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3 mb-3">
                            {ticket.message}
                          </p>
                          {ticket.resolved_at && (
                            <div className="text-xs text-gray-500 mb-3">
                              Résolu le {formatDate(ticket.resolved_at)}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket);
                              if (selectedTicket?.id !== ticket.id) {
                                loadReplies(ticket.id);
                              }
                            }}
                            className="text-sm text-marlon-green hover:text-marlon-green/80 font-medium flex items-center gap-1"
                          >
                            <Icon icon={selectedTicket?.id === ticket.id ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="h-4 w-4" />
                            {selectedTicket?.id === ticket.id ? 'Masquer' : 'Voir'} la conversation
                          </button>

                          {/* Replies Section */}
                          {selectedTicket?.id === ticket.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              {loadingReplies ? (
                                <div className="flex items-center justify-center py-4">
                                  <Icon icon="mdi:loading" className="h-5 w-5 animate-spin text-marlon-green" />
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-3 mb-4">
                                    {ticketReplies.length === 0 ? (
                                      <p className="text-sm text-gray-500 text-center py-4">
                                        Aucune réponse pour le moment
                                      </p>
                                    ) : (
                                      ticketReplies.map((reply) => (
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
                                                {reply.is_admin_reply ? 'Support' : 'Vous'}
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
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green resize-none text-sm"
                                      placeholder="Répondre au support..."
                                    />
                                    <button
                                      onClick={sendReply}
                                      disabled={sendingReply || !replyMessage.trim()}
                                      className="mt-2 w-full px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact form */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-[#1a365d] mb-2">Contactez-nous</h2>
              <p className="text-sm text-gray-500 mb-6">
                Une question spécifique ? Envoyez-nous un message.
              </p>

              {sent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="mdi:check" className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-green-600 mb-2">Message envoyé !</h3>
                  <p className="text-sm text-gray-500">
                    Nous vous répondrons dans les plus brefs délais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {sendError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {sendError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sujet
                    </label>
                    <select
                      value={contactForm.subject}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, subject: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      required
                    >
                      <option value="">Sélectionner un sujet</option>
                      <option value="Question générale">Question générale</option>
                      <option value="Question sur une commande">Question sur une commande</option>
                      <option value="Problème technique">Problème technique</option>
                      <option value="Facturation">Facturation</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degré d'urgence
                    </label>
                    <select
                      value={contactForm.priority}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      required
                    >
                      <option value="low">Basse</option>
                      <option value="normal">Normale</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgente</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {contactForm.priority === 'low' && 'Question non urgente'}
                      {contactForm.priority === 'normal' && 'Question standard'}
                      {contactForm.priority === 'high' && 'Besoin d\'une réponse rapide'}
                      {contactForm.priority === 'urgent' && 'Besoin d\'une réponse immédiate'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Votre message
                    </label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, message: e.target.value })
                      }
                      rows={5}
                      placeholder="Décrivez votre demande..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green resize-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full px-4 py-3 bg-marlon-green text-white font-medium rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:send" className="h-5 w-5" />
                        Envoyer le message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
