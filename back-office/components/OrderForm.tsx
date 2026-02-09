'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import SearchableSelect from '@/components/SearchableSelect';
import { Icon } from '@iconify/react';

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  marginPercent: number;
}

export default function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [leasers, setLeasers] = useState<any[]>([]);
  const [durations, setDurations] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    organization_id: '',
    leaser_id: '',
    leasing_duration_months: '',
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    // Load initial data
    Promise.all([
      fetch('/api/admin/customers/list').then(r => r.json()),
      fetch('/api/admin/products/list').then(r => r.json()),
      fetch('/api/admin/leasers').then(r => r.json()),
      fetch('/api/admin/leasing-durations').then(r => r.json()),
    ]).then(([orgsData, productsData, leasersData, durationsData]) => {
      if (orgsData.success) setOrganizations(orgsData.data || []);
      if (productsData.success) setProducts(productsData.data || []);
      if (leasersData.success) setLeasers(leasersData.data || []);
      if (durationsData.success) setDurations(durationsData.data || []);
    });
  }, []);

  const handleAddProduct = () => {
    if (!selectedProductId) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Check if product already added
    if (orderItems.some(item => item.productId === selectedProductId)) {
      setError('Ce produit est déjà dans la commande');
      return;
    }

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      purchasePrice: parseFloat(product.purchase_price_ht.toString()),
      marginPercent: parseFloat(product.marlon_margin_percent.toString()),
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProductId('');
    setError(null);
  };

  const handleRemoveProduct = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(
      orderItems.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.organization_id) {
      setError('Veuillez sélectionner un client');
      setLoading(false);
      return;
    }

    if (!formData.leaser_id) {
      setError('Veuillez sélectionner un leaser');
      setLoading(false);
      return;
    }

    if (!formData.leasing_duration_months) {
      setError('Veuillez sélectionner une durée de leasing');
      setLoading(false);
      return;
    }

    if (orderItems.length === 0) {
      setError('Veuillez ajouter au moins un produit');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: formData.organization_id,
          leaser_id: formData.leaser_id,
          leasing_duration_months: parseInt(formData.leasing_duration_months),
          items: orderItems.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création de la commande');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  // Calculate initial total for preview
  const calculateInitialTotal = () => {
    return orderItems.reduce((sum, item) => {
      const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
      return sum + sellingPrice * item.quantity;
    }, 0);
  };

  const initialTotal = calculateInitialTotal();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Client Selection */}
        <div>
          <label htmlFor="organization_id" className="mb-2 block text-sm font-medium text-black">
            Client <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={organizations.map(org => ({
              value: org.id,
              label: org.name,
            }))}
            value={formData.organization_id}
            onChange={(value) => setFormData({ ...formData, organization_id: value })}
            placeholder="Sélectionner un client"
            required
          />
        </div>

        {/* Leaser Selection */}
        <div>
          <label htmlFor="leaser_id" className="mb-2 block text-sm font-medium text-black">
            Leaser <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={leasers.map(leaser => ({
              value: leaser.id,
              label: leaser.name,
            }))}
            value={formData.leaser_id}
            onChange={(value) => setFormData({ ...formData, leaser_id: value })}
            placeholder="Sélectionner un leaser"
            required
          />
        </div>

        {/* Duration Selection */}
        <div>
          <label htmlFor="leasing_duration_months" className="mb-2 block text-sm font-medium text-black">
            Durée de leasing <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={durations.map(duration => ({
              value: duration.months.toString(),
              label: `${duration.months} mois`,
            }))}
            value={formData.leasing_duration_months}
            onChange={(value) => setFormData({ ...formData, leasing_duration_months: value })}
            placeholder="Sélectionner une durée"
            required
          />
        </div>

        {/* Products Section */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            Produits <span className="text-red-500">*</span>
          </label>
          
          {/* Add Product */}
          <div className="mb-4 flex gap-2">
            <div className="flex-1">
              <SearchableSelect
                options={products
                  .filter(p => !orderItems.some(item => item.productId === p.id))
                  .map(product => ({
                    value: product.id,
                    label: `${product.name}${product.reference ? ` (${product.reference})` : ''}`,
                  }))}
                value={selectedProductId}
                onChange={(value) => setSelectedProductId(value)}
                placeholder="Sélectionner un produit"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddProduct}
              disabled={!selectedProductId}
              icon="mdi:plus"
              variant="outline"
            >
              Ajouter
            </Button>
          </div>

          {/* Order Items List */}
          {orderItems.length > 0 ? (
            <div className="space-y-2">
              {orderItems.map((item) => {
                const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
                const itemTotal = sellingPrice * item.quantity;
                
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">{item.productName}</p>
                      <p className="text-xs text-gray-600">
                        Prix HT: {item.purchasePrice.toFixed(2)} € | 
                        Marge: {item.marginPercent}% | 
                        Prix de vente: {sellingPrice.toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Qté:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(item.productId, parseInt(e.target.value) || 1)
                          }
                          className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-black focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
                        />
                      </div>
                      <p className="text-sm font-medium text-black w-24 text-right">
                        {itemTotal.toFixed(2)} €
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.productId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Total Preview */}
              <div className="mt-4 rounded-md border border-gray-300 bg-white p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total estimé (HT):</span>
                  <span className="text-lg font-bold text-black">
                    {initialTotal.toFixed(2)} €
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Le prix final sera recalculé selon la tranche du montant total
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun produit ajouté</p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-col sm:flex-row gap-4 border-t border-gray-200 bg-white pt-6 -mx-6 px-6">
        <Button
          type="submit"
          disabled={loading}
          icon="mdi:check"
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? 'Création...' : 'Créer la commande'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
