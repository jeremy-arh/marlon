'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Setting {
  id: string;
  key: string;
  value: any;
  is_visible: boolean;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order_index: number;
  is_visible: boolean;
}

const FAQ_CATEGORIES = ['Leasing', 'Commande', 'Livraison', 'Compte'];

interface VariantFilter {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'color';
  order_index: number;
  product_variant_filter_options?: VariantFilterOption[];
}

interface VariantFilterOption {
  id: string;
  filter_id: string;
  value: string;
  label: string;
  order_index: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'contact' | 'faq' | 'variants'>('contact');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [originalSettings, setOriginalSettings] = useState<Setting[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Variants state
  const [variantFilters, setVariantFilters] = useState<VariantFilter[]>([]);
  const [editingFilter, setEditingFilter] = useState<VariantFilter | null>(null);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [filterForm, setFilterForm] = useState({
    name: '',
    label: '',
    type: 'text' as 'text' | 'number' | 'color',
    order_index: 0,
  });
  const [editingOption, setEditingOption] = useState<{ filterId: string; option: VariantFilterOption | null } | null>(null);
  const [optionForm, setOptionForm] = useState({
    value: '',
    label: '',
    order_index: 0,
  });

  // FAQ form state
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'Leasing',
    order_index: 0,
    is_visible: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Add cache busting to ensure fresh data
      const timestamp = Date.now();
      const [settingsRes, faqRes, filtersRes] = await Promise.all([
        fetch(`/api/admin/settings?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/faq?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/product-variant-filters?t=${timestamp}`, { cache: 'no-store' }),
      ]);

      const settingsData = await settingsRes.json();
      const faqData = await faqRes.json();
      const filtersData = await filtersRes.json();

      console.log('📥 Loaded settings data:', settingsData);
      console.log('📥 Settings from API:', JSON.stringify(settingsData.data, null, 2));

      if (settingsData.success && settingsData.data) {
        // Ensure all values are objects, not null or undefined
        const normalizedSettings = settingsData.data.map((setting: Setting) => {
          const normalized = {
            ...setting,
            value: setting.value || {}
          };
          console.log(`📥 Normalized ${setting.key}:`, JSON.stringify(normalized, null, 2));
          return normalized;
        });
        console.log('📥 All normalized settings:', JSON.stringify(normalizedSettings, null, 2));
        setSettings(normalizedSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(normalizedSettings)));
        setHasChanges(false);
      } else {
        console.error('❌ Failed to load settings:', settingsData);
        setError('Erreur lors du chargement des paramètres');
      }
      if (faqData.success) setFaqItems(faqData.data);
      if (filtersData.success) setVariantFilters(filtersData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.key === key);
  };

  const updateSettingLocal = (key: string, value: any, is_visible: boolean) => {
    // Update local state only (no API call)
    setSettings(prev => {
      const exists = prev.some(s => s.key === key);
      if (exists) {
        return prev.map(s => s.key === key ? { ...s, value: value || {}, is_visible: is_visible } : s);
      } else {
        // Create new setting if it doesn't exist
        return [...prev, { id: `temp-${key}`, key, value: value || {}, is_visible: is_visible }];
      }
    });
    setHasChanges(true);
  };

  const saveAllSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    console.log('Saving settings:', JSON.stringify(settings, null, 2));
    
    try {
      // Save all settings (simpler and more reliable)
      for (const setting of settings) {
        // Ensure value is always an object, not undefined or null
        const valueToSave = setting.value || {};
        const isVisibleToSave = setting.is_visible !== undefined ? setting.is_visible : true;
        
        console.log('💾 Saving setting:', {
          key: setting.key,
          value: valueToSave,
          is_visible: isVisibleToSave,
          originalIsVisible: setting.is_visible,
          originalValue: setting.value
        });
        
        const requestBody = { 
          key: setting.key, 
          value: valueToSave, 
          is_visible: isVisibleToSave
        };
        
        console.log('🔵 Sending PUT request to /api/admin/settings:', requestBody);
        
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        console.log('🟢 Response status:', res.status, res.statusText);
        
        const data = await res.json();
        console.log('🟡 Response data for', setting.key, ':', JSON.stringify(data, null, 2));
        console.log('🟡 Saved value:', JSON.stringify(data.data?.value, null, 2));
        console.log('🟡 Saved is_visible:', data.data?.is_visible, '(should match', isVisibleToSave, ')');
        if (data.data?.is_visible !== isVisibleToSave) {
          console.error('❌❌❌ MISMATCH: Expected is_visible:', isVisibleToSave, 'but got:', data.data?.is_visible);
        }
        
        if (!res.ok) {
          console.error('❌ Error response:', data);
          throw new Error(data.error || `Erreur lors de la sauvegarde de ${setting.key}`);
        }
        
        console.log('✅ Successfully saved', setting.key);
      }
      
      // Reload data from database to ensure we have the latest values
      // Add a small delay to ensure DB has committed
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadData();
      setSuccess('✓ Paramètres enregistrés avec succès !');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    setHasChanges(false);
  };

  const handleFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingFaq ? 'PUT' : 'POST';
      const body = editingFaq
        ? { id: editingFaq.id, ...faqForm }
        : faqForm;

      const res = await fetch('/api/admin/faq', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(editingFaq ? 'Question mise à jour' : 'Question ajoutée');
      setTimeout(() => setSuccess(null), 3000);
      resetFaqForm();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Supprimer cette question ?')) return;

    try {
      const res = await fetch(`/api/admin/faq?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      setSuccess('Question supprimée');
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const editFaq = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order_index: faq.order_index,
      is_visible: faq.is_visible,
    });
    setShowFaqForm(true);
  };

  const resetFaqForm = () => {
    setEditingFaq(null);
    setShowFaqForm(false);
    setFaqForm({
      question: '',
      answer: '',
      category: 'Leasing',
      order_index: faqItems.length,
      is_visible: true,
    });
  };

  const toggleFaqVisibility = async (faq: FaqItem) => {
    try {
      const res = await fetch('/api/admin/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...faq, is_visible: !faq.is_visible }),
      });

      if (!res.ok) throw new Error('Erreur');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Variant Filters functions
  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingFilter ? 'PUT' : 'POST';
      const body = editingFilter
        ? { id: editingFilter.id, ...filterForm }
        : filterForm;

      const res = await fetch('/api/admin/product-variant-filters', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(editingFilter ? 'Filtre mis à jour' : 'Filtre ajouté');
      setTimeout(() => setSuccess(null), 3000);
      resetFilterForm();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteFilter = async (id: string) => {
    if (!confirm('Supprimer ce filtre et toutes ses options ?')) return;

    try {
      const res = await fetch(`/api/admin/product-variant-filters?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      setSuccess('Filtre supprimé');
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const editFilter = (filter: VariantFilter) => {
    setEditingFilter(filter);
    setFilterForm({
      name: filter.name,
      label: filter.label,
      type: filter.type,
      order_index: filter.order_index,
    });
    setShowFilterForm(true);
  };

  const resetFilterForm = () => {
    setEditingFilter(null);
    setShowFilterForm(false);
    setFilterForm({
      name: '',
      label: '',
      type: 'text',
      order_index: variantFilters.length,
    });
  };

  const handleOptionSubmit = async (e: React.FormEvent, filterId: string) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingOption?.option ? 'PUT' : 'POST';
      const body = editingOption?.option
        ? { id: editingOption.option.id, filter_id: filterId, ...optionForm }
        : { filter_id: filterId, ...optionForm };

      const res = await fetch('/api/admin/product-variant-filter-options', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(editingOption?.option ? 'Option mise à jour' : 'Option ajoutée');
      setTimeout(() => setSuccess(null), 3000);
      setEditingOption(null);
      setOptionForm({ value: '', label: '', order_index: 0 });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (id: string) => {
    if (!confirm('Supprimer cette option ?')) return;

    try {
      const res = await fetch(`/api/admin/product-variant-filter-options?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      setSuccess('Option supprimée');
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const editOption = (filterId: string, option: VariantFilterOption) => {
    setEditingOption({ filterId, option });
    setOptionForm({
      value: option.value,
      label: option.label,
      order_index: option.order_index,
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
        </div>
      </div>
    );
  }

  const phoneSetting = getSetting('contact_phone');
  const emailSetting = getSetting('contact_email');
  const addressSetting = getSetting('contact_address');

  // Debug: log current settings when rendering
  if (phoneSetting || emailSetting || addressSetting) {
    console.log('🎨 Rendering with settings:', {
      phone: phoneSetting ? { value: phoneSetting.value, is_visible: phoneSetting.is_visible } : null,
      email: emailSetting ? { value: emailSetting.value, is_visible: emailSetting.is_visible } : null,
      address: addressSetting ? { value: addressSetting.value, is_visible: addressSetting.is_visible } : null,
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Gérez les informations de contact et la FAQ</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('contact')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contact'
                ? 'border-marlon-green text-marlon-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon="mdi:card-account-details" className="h-5 w-5 inline mr-2" />
            Informations de contact
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'faq'
                ? 'border-marlon-green text-marlon-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon="mdi:help-circle" className="h-5 w-5 inline mr-2" />
            FAQ ({faqItems.length})
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'variants'
                ? 'border-marlon-green text-marlon-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon="mdi:filter-variant" className="h-5 w-5 inline mr-2" />
            Filtres de variantes ({variantFilters.length})
          </button>
        </nav>
      </div>

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          {/* Phone */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Icon icon="mdi:phone" className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Téléphone</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Afficher</span>
                <input
                  type="checkbox"
                  checked={phoneSetting?.is_visible === true}
                  onChange={(e) => updateSettingLocal('contact_phone', phoneSetting?.value || {}, e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 accent-marlon-green cursor-pointer"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                <input
                  type="text"
                  value={phoneSetting?.value?.number || ''}
                  onChange={(e) => updateSettingLocal('contact_phone', { ...(phoneSetting?.value || {}), number: e.target.value }, phoneSetting?.is_visible !== undefined ? phoneSetting.is_visible : true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horaires</label>
                <input
                  type="text"
                  value={phoneSetting?.value?.hours || ''}
                  onChange={(e) => updateSettingLocal('contact_phone', { ...(phoneSetting?.value || {}), hours: e.target.value }, phoneSetting?.is_visible !== undefined ? phoneSetting.is_visible : true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Icon icon="mdi:email" className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Email</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Afficher</span>
                <input
                  type="checkbox"
                  checked={emailSetting?.is_visible === true}
                  onChange={(e) => updateSettingLocal('contact_email', emailSetting?.value || {}, e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 accent-marlon-green cursor-pointer"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
                <input
                  type="email"
                  value={emailSetting?.value?.email || ''}
                  onChange={(e) => updateSettingLocal('contact_email', { ...(emailSetting?.value || {}), email: e.target.value }, emailSetting?.is_visible !== undefined ? emailSetting.is_visible : true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Délai de réponse</label>
                <input
                  type="text"
                  value={emailSetting?.value?.response_time || ''}
                  onChange={(e) => updateSettingLocal('contact_email', { ...(emailSetting?.value || {}), response_time: e.target.value }, emailSetting?.is_visible !== undefined ? emailSetting.is_visible : true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icon icon="mdi:map-marker" className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Adresse</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Afficher</span>
                <input
                  type="checkbox"
                  checked={addressSetting?.is_visible === true}
                  onChange={(e) => updateSettingLocal('contact_address', addressSetting?.value || {}, e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 accent-marlon-green cursor-pointer"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rue</label>
                <input
                  type="text"
                  value={addressSetting?.value?.street || ''}
                  onChange={(e) => updateSettingLocal('contact_address', { ...(addressSetting?.value || {}), street: e.target.value }, addressSetting?.is_visible !== undefined ? addressSetting.is_visible : true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={addressSetting?.value?.city || ''}
                  onChange={(e) => updateSettingLocal('contact_address', { ...(addressSetting?.value || {}), city: e.target.value }, addressSetting?.is_visible !== undefined ? addressSetting.is_visible : true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                />
              </div>
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={cancelChanges}
              disabled={!hasChanges || saving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              disabled={!hasChanges || saving}
              className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save" className="h-5 w-5" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetFaqForm();
                setShowFaqForm(true);
              }}
              className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 flex items-center gap-2"
            >
              <Icon icon="mdi:plus" className="h-5 w-5" />
              Ajouter une question
            </button>
          </div>

          {/* FAQ Form */}
          {showFaqForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingFaq ? 'Modifier la question' : 'Nouvelle question'}
              </h3>
              <form onSubmit={handleFaqSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Réponse</label>
                  <textarea
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select
                      value={faqForm.category}
                      onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                    >
                      {FAQ_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                    <input
                      type="number"
                      value={faqForm.order_index}
                      onChange={(e) => setFaqForm({ ...faqForm, order_index: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={faqForm.is_visible}
                        onChange={(e) => setFaqForm({ ...faqForm, is_visible: e.target.checked })}
                        className="h-5 w-5 rounded border-gray-300 accent-marlon-green cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">Visible</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetFaqForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : editingFaq ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FAQ List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {faqItems.map((faq) => (
                  <tr key={faq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{faq.order_index}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{faq.question}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded-full">
                        {faq.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleFaqVisibility(faq)}
                        className={`p-1 rounded ${faq.is_visible ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        <Icon icon={faq.is_visible ? 'mdi:eye' : 'mdi:eye-off'} className="h-5 w-5" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editFaq(faq)}
                          className="p-1 text-gray-600 hover:text-marlon-green"
                        >
                          <Icon icon="mdi:pencil" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteFaq(faq.id)}
                          className="p-1 text-gray-600 hover:text-red-600"
                        >
                          <Icon icon="mdi:trash-can" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Variants Tab */}
      {activeTab === 'variants' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetFilterForm();
                setShowFilterForm(true);
              }}
              className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 flex items-center gap-2"
            >
              <Icon icon="mdi:plus" className="h-5 w-5" />
              Ajouter un filtre
            </button>
          </div>

          {/* Filter Form */}
          {showFilterForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingFilter ? 'Modifier le filtre' : 'Nouveau filtre'}
              </h3>
              <form onSubmit={handleFilterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom technique</label>
                    <input
                      type="text"
                      value={filterForm.name}
                      onChange={(e) => setFilterForm({ ...filterForm, name: e.target.value })}
                      required
                      placeholder="ex: color"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
                    <input
                      type="text"
                      value={filterForm.label}
                      onChange={(e) => setFilterForm({ ...filterForm, label: e.target.value })}
                      required
                      placeholder="ex: Couleur"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={filterForm.type}
                      onChange={(e) => setFilterForm({ ...filterForm, type: e.target.value as 'text' | 'number' | 'color' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                    >
                      <option value="text">Texte</option>
                      <option value="number">Nombre</option>
                      <option value="color">Couleur</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                    <input
                      type="number"
                      value={filterForm.order_index}
                      onChange={(e) => setFilterForm({ ...filterForm, order_index: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetFilterForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : editingFilter ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters List */}
          <div className="space-y-4">
            {variantFilters.map((filter) => (
              <div key={filter.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{filter.label}</h4>
                    <p className="text-sm text-gray-500">{filter.name} ({filter.type})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editFilter(filter)}
                      className="p-2 text-gray-600 hover:text-marlon-green"
                    >
                      <Icon icon="mdi:pencil" className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteFilter(filter.id)}
                      className="p-2 text-gray-600 hover:text-red-600"
                    >
                      <Icon icon="mdi:trash-can" className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Options for this filter */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Options ({filter.product_variant_filter_options?.length || 0})</h5>
                    <button
                      onClick={() => {
                        setEditingOption({ filterId: filter.id, option: null });
                        setOptionForm({ value: '', label: '', order_index: (filter.product_variant_filter_options?.length || 0) });
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Icon icon="mdi:plus" className="h-4 w-4" />
                      Ajouter une option
                    </button>
                  </div>

                  {/* Option Form */}
                  {editingOption?.filterId === filter.id && (
                    <form onSubmit={(e) => handleOptionSubmit(e, filter.id)} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Valeur</label>
                          <input
                            type="text"
                            value={optionForm.value}
                            onChange={(e) => setOptionForm({ ...optionForm, value: e.target.value })}
                            required
                            placeholder="ex: red"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Libellé</label>
                          <input
                            type="text"
                            value={optionForm.label}
                            onChange={(e) => setOptionForm({ ...optionForm, label: e.target.value })}
                            required
                            placeholder="ex: Rouge"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-marlon-green focus:border-marlon-green"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingOption(null)}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-3 py-1.5 text-xs bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50"
                        >
                          {saving ? 'Enregistrement...' : editingOption.option ? 'Mettre à jour' : 'Ajouter'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Options List */}
                  <div className="space-y-2">
                    {filter.product_variant_filter_options && filter.product_variant_filter_options.length > 0 ? (
                      filter.product_variant_filter_options.map((option) => (
                        <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">#{option.order_index}</span>
                            <div>
                              <span className="text-sm font-medium text-gray-900">{option.label}</span>
                              <span className="text-xs text-gray-500 ml-2">({option.value})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => editOption(filter.id, option)}
                              className="p-1 text-gray-600 hover:text-marlon-green"
                            >
                              <Icon icon="mdi:pencil" className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteOption(option.id)}
                              className="p-1 text-gray-600 hover:text-red-600"
                            >
                              <Icon icon="mdi:trash-can" className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Aucune option définie</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
