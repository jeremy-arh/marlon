'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';
import AddressAutocomplete from '@/components/AddressAutocomplete';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
}

interface Organization {
  id: string;
  name: string;
  siret: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
}

interface DeliveryAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  contact_name: string;
  contact_phone: string;
  instructions: string;
  is_default: boolean;
}

type TabType = 'account' | 'company' | 'addresses';

const TABS = [
  { id: 'account' as TabType, label: 'Mon compte' },
  { id: 'company' as TabType, label: 'Entreprise & factures' },
  { id: 'addresses' as TabType, label: 'Mes Adresses' },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]"><Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as TabType) || 'account';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User profile
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Organization
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    legal_name: '',
    siret: '',
    email: '',
    address: '',
  });

  // Addresses
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    contact_name: '',
    contact_phone: '',
    instructions: '',
    is_default: false,
  });
  const [addressSearchQuery, setAddressSearchQuery] = useState('');


  useEffect(() => {
    // Reset loading state when navigating to this page
    setLoading(true);
    loadData();
  }, [pathname]);

  useEffect(() => {
    // Update URL when tab changes
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', activeTab);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }, [activeTab]);

  const loadData = async (retryCount = 0) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        if (retryCount < 3) {
          setTimeout(() => loadData(retryCount + 1), 500);
          return;
        }
        router.push('/login');
        return;
      }

      // Load user profile
      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        phone: authUser.user_metadata?.phone || '',
      };
      setUser(userProfile);
      setProfileForm({
        ...profileForm,
        full_name: userProfile.full_name,
        phone: userProfile.phone,
      });

      // Get user's organization and role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select(`
          organization_id,
          role,
          organizations(*)
        `)
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .single();

      if (userRole) {
        setOrganizationId(userRole.organization_id);
        
        const org = userRole.organizations as unknown as Organization;
        if (org) {
          setOrganization(org);
          setCompanyForm({
            name: org.name || '',
            legal_name: org.name || '',
            siret: org.siret || '',
            email: org.email || '',
            address: org.address ? `${org.address}, ${org.postal_code} ${org.city}, ${org.country}` : '',
          });
        }

        // Load addresses
        const { data: addressData } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('organization_id', userRole.organization_id)
          .order('is_default', { ascending: false });

        setAddresses(addressData || []);
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileForm.full_name,
          phone: profileForm.phone,
        },
      });

      if (error) throw error;

      // Update password if provided
      if (profileForm.newPassword) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          alert('Les mots de passe ne correspondent pas');
          return;
        }
        const { error: pwError } = await supabase.auth.updateUser({
          password: profileForm.newPassword,
        });
        if (pwError) throw pwError;
      }

      alert('Profil mis à jour avec succès');
      setProfileForm({
        ...profileForm,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!organizationId) return;
    setSaving(true);

    try {
      // Parse address
      let address = '';
      let city = '';
      let postal_code = '';
      let country = 'France';

      if (companyForm.address) {
        const parts = companyForm.address.split(',').map(p => p.trim());
        address = parts[0] || '';
        if (parts[1]) {
          const cityParts = parts[1].split(' ');
          postal_code = cityParts[0] || '';
          city = cityParts.slice(1).join(' ') || '';
        }
        country = parts[2] || 'France';
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          name: companyForm.name,
          siret: companyForm.siret,
          email: companyForm.email,
          address,
          city,
          postal_code,
          country,
        })
        .eq('id', organizationId);

      if (error) throw error;

      alert('Entreprise mise à jour avec succès');
      await loadData();
    } catch (error: any) {
      console.error('Error updating company:', error);
      alert('Erreur lors de la mise à jour de l\'entreprise');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!organizationId) return;
    setSaving(true);

    try {
      if (editingAddress && editingAddress.id !== 'new') {
        // Update existing
        const { error } = await supabase
          .from('delivery_addresses')
          .update({
            name: addressForm.name,
            address: addressForm.address,
            city: addressForm.city,
            postal_code: addressForm.postal_code,
            country: addressForm.country,
            contact_name: addressForm.contact_name,
            contact_phone: addressForm.contact_phone,
            instructions: addressForm.instructions,
            is_default: addressForm.is_default,
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
      } else {
        // Create new
        if (addressForm.is_default) {
          await supabase
            .from('delivery_addresses')
            .update({ is_default: false })
            .eq('organization_id', organizationId);
        }

        const { error } = await supabase
          .from('delivery_addresses')
          .insert({
            organization_id: organizationId,
            name: addressForm.name,
            address: addressForm.address,
            city: addressForm.city,
            postal_code: addressForm.postal_code,
            country: addressForm.country,
            contact_name: addressForm.contact_name,
            contact_phone: addressForm.contact_phone,
            instructions: addressForm.instructions,
            is_default: addressForm.is_default,
          });

        if (error) throw error;
      }

      setShowAddressModal(false);
      setEditingAddress(null);
      resetAddressForm();
      await loadData();
      alert('Adresse enregistrée avec succès');
    } catch (error: any) {
      console.error('Error saving address:', error);
      alert('Erreur lors de l\'enregistrement de l\'adresse');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;

    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'France',
      contact_name: '',
      contact_phone: '',
      instructions: '',
      is_default: false,
    });
  };

  const openAddressModal = (address?: DeliveryAddress) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        name: address.name || '',
        address: address.address || '',
        city: address.city || '',
        postal_code: address.postal_code || '',
        country: address.country || 'France',
        contact_name: address.contact_name || '',
        contact_phone: address.contact_phone || '',
        instructions: address.instructions || '',
        is_default: address.is_default || false,
      });
    } else {
      setEditingAddress({ id: 'new' } as DeliveryAddress);
      resetAddressForm();
    }
    setShowAddressModal(true);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Paramètres"
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Paramètres' },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-0 mb-8 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-marlon-green text-marlon-green bg-marlon-green/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Mon compte */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Mon compte</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
            </div>

            <hr className="my-6" />

            <h3 className="text-md font-semibold text-gray-900">Changer le mot de passe</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        )}

        {/* Entreprise & factures */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Mon entreprise</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom commercial *
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom légal *
                </label>
                <input
                  type="text"
                  value={companyForm.legal_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIREN *
                </label>
                <input
                  type="text"
                  value={companyForm.siret}
                  onChange={(e) => setCompanyForm({ ...companyForm, siret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact finance (email) *
                </label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Siège social de l'entreprise *
                </label>
                <AddressAutocomplete
                  value={companyForm.address}
                  onChange={(value) => setCompanyForm({ ...companyForm, address: value })}
                  onAddressSelect={(components) => {
                    const fullAddress = `${components.address}, ${components.postal_code} ${components.city}, ${components.country}`;
                    setCompanyForm({ ...companyForm, address: fullAddress });
                  }}
                  placeholder="Rechercher une adresse..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveCompany}
                disabled={saving}
                className="px-6 py-2.5 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        )}

        {/* Mes Adresses */}
        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Mes adresses de livraison</h2>
              <button
                onClick={() => openAddressModal()}
                className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors flex items-center gap-2"
              >
                <Icon icon="mdi:plus" className="h-5 w-5" />
                Ajouter une adresse
              </button>
            </div>

            {/* Search bar */}
            {addresses.length > 0 && (
              <div>
                <div className="relative w-full">
                  <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une adresse..."
                    value={addressSearchQuery}
                    onChange={(e) => setAddressSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent"
                  />
                  {addressSearchQuery && (
                    <button
                      onClick={() => setAddressSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Icon icon="mdi:close" className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icon icon="mdi:map-marker-off" className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune adresse enregistrée</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.filter(addr => {
                  if (!addressSearchQuery.trim()) return true;
                  const query = addressSearchQuery.toLowerCase();
                  return (
                    addr.name?.toLowerCase().includes(query) ||
                    addr.address?.toLowerCase().includes(query) ||
                    addr.city?.toLowerCase().includes(query) ||
                    addr.postal_code?.toLowerCase().includes(query) ||
                    addr.contact_name?.toLowerCase().includes(query)
                  );
                }).map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-lg border ${
                      addr.is_default ? 'border-marlon-green bg-marlon-green/5' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{addr.name}</h3>
                          {addr.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-marlon-green text-white rounded-full">
                              Par défaut
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                        <p className="text-sm text-gray-600">
                          {addr.postal_code} {addr.city}, {addr.country}
                        </p>
                        {addr.contact_name && (
                          <p className="text-sm text-gray-500 mt-2">
                            Contact: {addr.contact_name} {addr.contact_phone && `- ${addr.contact_phone}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openAddressModal(addr)}
                          className="p-2 text-gray-400 hover:text-marlon-green transition-colors"
                        >
                          <Icon icon="mdi:pencil" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Icon icon="mdi:delete" className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowAddressModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAddress?.id === 'new' ? 'Nouvelle adresse' : 'Modifier l\'adresse'}
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'adresse *
                </label>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  placeholder="Ex: Bureau principal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du contact
                  </label>
                  <input
                    type="text"
                    value={addressForm.contact_name}
                    onChange={(e) => setAddressForm({ ...addressForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone du contact
                  </label>
                  <input
                    type="tel"
                    value={addressForm.contact_phone}
                    onChange={(e) => setAddressForm({ ...addressForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions de livraison
                </label>
                <textarea
                  value={addressForm.instructions}
                  onChange={(e) => setAddressForm({ ...addressForm, instructions: e.target.value })}
                  rows={2}
                  placeholder="Ex: Code d'accès, étage, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="h-4 w-4 text-marlon-green accent-marlon-green rounded border-gray-300 focus:ring-marlon-green"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">
                  Définir comme adresse par défaut
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddressModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={saving || !addressForm.name || !addressForm.address || !addressForm.city || !addressForm.postal_code}
                className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
