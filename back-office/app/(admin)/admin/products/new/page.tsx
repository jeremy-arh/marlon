'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [leasers, setLeasers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    description: '',
    purchase_price_ht: '',
    marlon_margin_percent: '',
    supplier_id: '',
    brand_id: '',
    default_leaser_id: '',
  });

  useEffect(() => {
    // Load brands, suppliers, and leasers
    Promise.all([
      fetch('/api/admin/brands').then(r => r.json()),
      fetch('/api/admin/suppliers').then(r => r.json()),
      fetch('/api/admin/leasers').then(r => r.json()),
    ]).then(([brandsData, suppliersData, leasersData]) => {
      if (brandsData.data) setBrands(brandsData.data);
      if (suppliersData.data) setSuppliers(suppliersData.data);
      if (leasersData.data) setLeasers(leasersData.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          purchase_price_ht: parseFloat(formData.purchase_price_ht),
          marlon_margin_percent: parseFloat(formData.marlon_margin_percent),
          supplier_id: formData.supplier_id || null,
          brand_id: formData.brand_id || null,
          default_leaser_id: formData.default_leaser_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création');
        setLoading(false);
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Icon icon="mdi:arrow-left" className="h-5 w-5" />
          Retour
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Ajouter un produit</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-black">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Reference */}
            <div>
              <label htmlFor="reference" className="mb-2 block text-sm font-medium text-black">
                Référence
              </label>
              <input
                id="reference"
                type="text"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-medium text-black">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label htmlFor="purchase_price_ht" className="mb-2 block text-sm font-medium text-black">
                Prix d&apos;achat HT (€) <span className="text-red-500">*</span>
              </label>
              <input
                id="purchase_price_ht"
                type="number"
                step="0.01"
                required
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.purchase_price_ht}
                onChange={(e) => setFormData({ ...formData, purchase_price_ht: e.target.value })}
              />
            </div>

            {/* Margin */}
            <div>
              <label htmlFor="marlon_margin_percent" className="mb-2 block text-sm font-medium text-black">
                Marge MARLON (%) <span className="text-red-500">*</span>
              </label>
              <input
                id="marlon_margin_percent"
                type="number"
                step="0.01"
                required
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black placeholder-[#525C6B] focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.marlon_margin_percent}
                onChange={(e) => setFormData({ ...formData, marlon_margin_percent: e.target.value })}
              />
            </div>

            {/* Brand */}
            <div>
              <label htmlFor="brand_id" className="mb-2 block text-sm font-medium text-black">
                Marque
              </label>
              <select
                id="brand_id"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              >
                <option value="">Sélectionner une marque</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label htmlFor="supplier_id" className="mb-2 block text-sm font-medium text-black">
                Fournisseur
              </label>
              <select
                id="supplier_id"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Leaser */}
            <div>
              <label htmlFor="default_leaser_id" className="mb-2 block text-sm font-medium text-black">
                Leaser par défaut
              </label>
              <select
                id="default_leaser_id"
                className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                value={formData.default_leaser_id}
                onChange={(e) => setFormData({ ...formData, default_leaser_id: e.target.value })}
              >
                <option value="">Sélectionner un leaser</option>
                {leasers.map((leaser) => (
                  <option key={leaser.id} value={leaser.id}>
                    {leaser.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              disabled={loading}
              icon="mdi:check"
              variant="primary"
              className="w-full sm:w-auto"
            >
              {loading ? 'Création...' : 'Créer le produit'}
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
