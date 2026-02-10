'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface Employee {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  employee: 'Employé',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Actif', color: 'text-green-700', bgColor: 'bg-green-100' },
  pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  inactive: { label: 'Inactif', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  expired: { label: 'Expiré', color: 'text-red-700', bgColor: 'bg-red-100' },
};

interface EmployeesClientProps {
  initialEmployees: Employee[];
  initialInvitations: Invitation[];
  organizationId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export default function EmployeesClient({
  initialEmployees,
  initialInvitations,
  organizationId,
  currentUserId,
  isAdmin,
}: EmployeesClientProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [searchQuery, setSearchQuery] = useState('');

  // Invitation modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail || !organizationId) return;

    setInviteLoading(true);
    setInviteError('');

    try {
      // Get organization name for the email
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      // Call the API that uses Supabase Auth to send invitation email
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          organizationId: organizationId,
          organizationName: orgData?.name || 'Votre organisation',
          invitedBy: currentUserId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      setInviteSuccess(true);
      setInviteEmail('');
      setInviteRole('employee');

      // Refresh data from server
      router.refresh();

      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      setInviteError(error.message || 'Une erreur est survenue');
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      // Update local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Refresh server data
      router.refresh();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    return STATUS_LABELS[status] || STATUS_LABELS.pending;
  };

  // Filter employees and invitations based on search
  const filteredInvitations = invitations.filter(inv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return inv.email.toLowerCase().includes(query);
  });

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.email?.toLowerCase().includes(query) ||
      emp.first_name?.toLowerCase().includes(query) ||
      emp.last_name?.toLowerCase().includes(query) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Employés" />

      {/* Header with invite button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-600">
            Gérez les membres de votre équipe et leurs accès.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors"
          >
            <Icon icon="mdi:plus" className="h-5 w-5" />
            Inviter un employé
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-marlon-green/10 rounded-lg">
              <Icon icon="mdi:account-group" className="h-6 w-6 text-marlon-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">{employees.length}</p>
              <p className="text-sm text-gray-500">Total employés</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Icon icon="mdi:account-check" className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">
                {employees.filter((e) => e.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">Actifs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Icon icon="mdi:email-outline" className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">{invitations.length}</p>
              <p className="text-sm text-gray-500">Invitations en attente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative w-full">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Pending invitations */}
        {filteredInvitations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
              <h3 className="font-semibold text-[#1a365d] flex items-center gap-2">
                <Icon icon="mdi:email-clock" className="h-5 w-5 text-yellow-600" />
                Invitations en attente ({filteredInvitations.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredInvitations.map((invitation) => (
                <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Icon icon="mdi:email-outline" className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      <p className="text-sm text-gray-500">
                        {ROLE_LABELS[invitation.role]} • Expire le {formatDate(invitation.expires_at)}
                      </p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <Icon icon="mdi:email-check-outline" className="h-3.5 w-3.5" />
                        Email d'invitation envoyé
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => cancelInvitation(invitation.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employees list */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-[#1a365d]">Membres de l'équipe</h3>
          </div>
          {filteredEmployees.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Icon icon="mdi:account-group" className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun employé trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => {
                const statusInfo = getStatusInfo(employee.status);
                const isCurrentUser = employee.user_id === currentUserId;
                const hasName = employee.first_name || employee.last_name;
                const displayName = hasName
                  ? `${employee.first_name} ${employee.last_name}`.trim()
                  : employee.email?.split('@')[0] || 'Utilisateur';

                return (
                  <Link
                    key={employee.user_id}
                    href={`/employees/${employee.user_id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-marlon-green/10 flex items-center justify-center">
                        <Icon icon="mdi:account" className="h-5 w-5 text-marlon-green" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {displayName}
                          {isCurrentUser && (
                            <span className="text-xs bg-marlon-green/10 text-marlon-green px-2 py-0.5 rounded-full">
                              Vous
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {ROLE_LABELS[employee.role]} • Membre depuis le {formatDate(employee.created_at)}
                        </p>
                        {employee.email && (
                          <p className="text-sm text-gray-400">{employee.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      <Icon icon="mdi:chevron-right" className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1a365d]">Inviter un employé</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="mdi:close" className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {inviteSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <Icon icon="mdi:check" className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-green-600 font-medium">Invitation envoyée avec succès !</p>
                  </div>
                ) : (
                  <>
                    {inviteError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        {inviteError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse email
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteError('');
                        }}
                        placeholder="email@exemple.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      />
                      {inviteEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(inviteEmail) && (
                        <p className="mt-1 text-xs text-red-500">Format d'email invalide</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      >
                        <option value="employee">Employé</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleInvite}
                        disabled={!inviteEmail || inviteLoading || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(inviteEmail)}
                        className="flex-1 px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
