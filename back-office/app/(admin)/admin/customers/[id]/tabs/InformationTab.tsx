'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';
import Button from '@/components/Button';

interface InformationTabProps {
  organization: any;
  onUpdate: () => void;
}

export default function InformationTab({ organization, onUpdate }: InformationTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: organization.name || '',
    siret: organization.siret || '',
    email: organization.email || '',
    phone: organization.phone || '',
    address: organization.address || '',
    city: organization.city || '',
    postal_code: organization.postal_code || '',
    country: organization.country || 'FR',
    contact_first_name: organization.contact_first_name || '',
    contact_last_name: organization.contact_last_name || '',
    contact_specialty_id: organization.contact_specialty_id || '',
  });

  useEffect(() => {
    fetch('/api/admin/specialties')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setSpecialties(data.data);
      });
  }, []);

  useEffect(() => {
    if (organization && !isEditing) {
      setFormData({
        name: organization.name || '',
        siret: organization.siret || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        city: organization.city || '',
        postal_code: organization.postal_code || '',
        country: organization.country || 'FR',
        contact_first_name: organization.contact_first_name || '',
        contact_last_name: organization.contact_last_name || '',
        contact_specialty_id: organization.contact_specialty_id || '',
      });
    }
  }, [organization?.id, organization?.name, organization?.email, organization?.phone, organization?.contact_first_name, organization?.contact_last_name, organization?.contact_specialty_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/customers/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        setLoading(false);
        return;
      }

      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: organization.name || '',
      siret: organization.siret || '',
      email: organization.email || '',
      phone: organization.phone || '',
      address: organization.address || '',
      city: organization.city || '',
      postal_code: organization.postal_code || '',
      country: organization.country || 'FR',
      contact_first_name: organization.contact_first_name || '',
      contact_last_name: organization.contact_last_name || '',
      contact_specialty_id: organization.contact_specialty_id || '',
    });
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}
      {/* Contact principal - Prénom, Nom, Email, Tel, Spécialité */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Contact principal</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-black hover:text-gray-700"
            >
              <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.contact_first_name}
                onChange={(e) => setFormData({ ...formData, contact_first_name: e.target.value })}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.contact_last_name}
                onChange={(e) => setFormData({ ...formData, contact_last_name: e.target.value })}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
              <select
                value={formData.contact_specialty_id}
                onChange={(e) => setFormData({ ...formData, contact_specialty_id: e.target.value })}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
              >
                <option value="">— Sélectionner —</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Informations de l&apos;entreprise</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-black hover:text-gray-700"
            >
              <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l&apos;entreprise *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET
                </label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  disabled={!isEditing}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  disabled={!isEditing}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!isEditing}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={!isEditing}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-auto"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-auto"
                >
                  Annuler
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Dates */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-black">Dates</h2>
        </div>
        <div className="px-6 py-4 space-y-2 text-sm">
          <div>
            <span className="text-gray-600">Créée le: </span>
            <span className="text-black">
              {new Date(organization.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {organization.updated_at && organization.updated_at !== organization.created_at && (
            <div>
              <span className="text-gray-600">Modifiée le: </span>
              <span className="text-black">
                {new Date(organization.updated_at).toLocaleDateString('fr-FR', {
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
  );
}
