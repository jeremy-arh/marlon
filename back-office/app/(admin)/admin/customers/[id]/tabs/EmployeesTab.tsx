'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  employee: 'Employé',
};

interface EmployeesTabProps {
  organizationId: string;
  organizationName?: string;
  initialEmployees: any[];
  initialInvitations?: any[];
  onUpdate: () => void;
}

export default function EmployeesTab({
  organizationId,
  organizationName = '',
  initialEmployees,
  initialInvitations = [],
  onUpdate,
}: EmployeesTabProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [invitations, setInvitations] = useState(initialInvitations);

  useEffect(() => {
    setEmployees(initialEmployees);
    setInvitations(initialInvitations);
  }, [initialEmployees, initialInvitations]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const handleInvite = async () => {
    if (!inviteEmail || !organizationId) return;

    setInviteLoading(true);
    setInviteError('');

    try {
      const response = await fetch(`/api/admin/customers/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase(),
          first_name: inviteFirstName.trim() || undefined,
          last_name: inviteLastName.trim() || undefined,
          role: inviteRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Une erreur est survenue");
      }

      setInviteSuccess(true);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('employee');
      onUpdate();
      router.refresh();

      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (error: any) {
      setInviteError(error.message || "Une erreur est survenue");
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const res = await fetch(
        `/api/admin/customers/${organizationId}/invitations/${invitationId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erreur lors de l\'annulation');
      setInvitations(prev => prev.filter((inv: any) => inv.id !== invitationId));
      onUpdate();
      router.refresh();
    } catch (err) {
      alert('Erreur lors de l\'annulation de l\'invitation');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-black">Employés</h2>
        <button
          onClick={() => {
            setShowInviteModal(true);
            setInviteError('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors text-sm font-medium"
        >
          <Icon icon="mdi:plus" className="h-5 w-5" />
          Inviter un utilisateur
        </button>
      </div>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:email-clock" className="h-5 w-5 text-yellow-600" />
              Invitations en attente ({invitations.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {invitations.map((invitation: any) => (
              <div
                key={invitation.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Icon icon="mdi:email-outline" className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {invitation.first_name || invitation.last_name
                        ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                        : invitation.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invitation.email} • {ROLE_LABELS[invitation.role] || invitation.role} • Expire le{' '}
                      {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => cancelInvitation(invitation.id)}
                  disabled={cancellingId === invitation.id}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {cancellingId === invitation.id ? 'Annulation...' : 'Annuler'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des employés */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-black">Membres</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prénom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d&apos;ajout
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees && employees.length > 0 ? (
                employees.map((employee: any) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.user?.first_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.user?.last_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.user?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          employee.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {employee.role === 'admin' ? 'Administrateur' : 'Employé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {employee.status === 'active' ? 'Actif' : 'Invité'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Aucun employé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Inviter un utilisateur
                </h3>
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
                    <p className="text-green-600 font-medium">
                      Invitation envoyée avec succès !
                    </p>
                  </div>
                ) : (
                  <>
                    {inviteError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        {inviteError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prénom
                        </label>
                        <input
                          type="text"
                          value={inviteFirstName}
                          onChange={(e) => setInviteFirstName(e.target.value)}
                          placeholder="Jean"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom
                        </label>
                        <input
                          type="text"
                          value={inviteLastName}
                          onChange={(e) => setInviteLastName(e.target.value)}
                          placeholder="Dupont"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        />
                      </div>
                    </div>
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
                      {inviteEmail &&
                        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                          inviteEmail
                        ) && (
                          <p className="mt-1 text-xs text-red-500">
                            Format d&apos;email invalide
                          </p>
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
                        disabled={
                          !inviteEmail ||
                          inviteLoading ||
                          !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                            inviteEmail
                          )
                        }
                        className="flex-1 px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {inviteLoading ? 'Envoi...' : "Envoyer l'invitation"}
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
