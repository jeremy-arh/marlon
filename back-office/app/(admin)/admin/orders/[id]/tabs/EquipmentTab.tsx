'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Icon from '@/components/Icon';
import SideModal from '@/components/SideModal';
import SearchableSelect from '@/components/SearchableSelect';

interface EquipmentTabProps {
  orderId: string;
  orderItems: any[];
  onUpdate?: () => void;
}

export default function EquipmentTab({ orderId, orderItems, onUpdate }: EquipmentTabProps) {
  const [equipments, setEquipments] = useState<any[]>(orderItems);
  const [showTTC, setShowTTC] = useState(false); // Toggle pour HT/TTC

  // Update equipments when orderItems prop changes
  useEffect(() => {
    setEquipments(orderItems);
  }, [orderItems]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({ product_id: '', quantity: '1' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/list');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ product_id: '', quantity: '1' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      product_id: item.product_id,
      quantity: item.quantity.toString(),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.product_id || !formData.quantity) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = editingItem
        ? `/api/admin/orders/${orderId}/items/${editingItem.id}`
        : `/api/admin/orders/${orderId}/items`;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: formData.product_id,
          quantity: parseInt(formData.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        setLoading(false);
        return;
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ product_id: '', quantity: '1' });
      
      // Refresh data without reloading page
      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      // Refresh data without reloading page
      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-black">Équipements</h3>
        <Button onClick={handleAdd} variant="primary" icon="mdi:plus">
          Ajouter un équipement
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {equipments.length > 0 ? (
        <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
          {/* Toggle HT/TTC */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Affichage des prix:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTTC(false)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    !showTTC
                      ? 'bg-marlon-green text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  HT
                </button>
                <button
                  onClick={() => setShowTTC(true)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    showTTC
                      ? 'bg-marlon-green text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  TTC
                </button>
              </div>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prix unitaire {showTTC ? 'TTC' : 'HT'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prix total {showTTC ? 'TTC' : 'HT'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipments.map((item) => {
                const firstImage = item.product?.product_images && item.product.product_images.length > 0
                  ? item.product.product_images.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))[0]?.image_url
                  : null;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={item.product?.name || 'Produit'}
                          className="h-12 w-12 object-cover rounded-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-md flex items-center justify-center">
                          <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                      {item.product?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product?.reference || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const totalPriceHT = parseFloat(item.calculated_price_ht?.toString() || '0');
                        const unitPriceHT = totalPriceHT / item.quantity;
                        const unitPriceTTC = unitPriceHT * 1.20; // TVA 20%
                        const displayPrice = showTTC ? unitPriceTTC : unitPriceHT;
                        return displayPrice.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) + ' €';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {(() => {
                        const priceHT = parseFloat(item.calculated_price_ht?.toString() || '0');
                        const priceTTC = priceHT * 1.20; // TVA 20%
                        const displayPrice = showTTC ? priceTTC : priceHT;
                        return displayPrice.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) + ' €';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-black hover:text-gray-700"
                        >
                          <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucun équipement</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          setFormData({ product_id: '', quantity: '1' });
        }}
        title={editingItem ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Produit <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name}${p.reference ? ` (${p.reference})` : ''}`,
              }))}
              value={formData.product_id}
              onChange={(value) => setFormData({ ...formData, product_id: value })}
              placeholder="Sélectionner un produit"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Quantité <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
                setFormData({ product_id: '', quantity: '1' });
              }}
              variant="outline"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading} variant="primary">
              {loading ? 'Sauvegarde...' : editingItem ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </SideModal>
    </div>
  );
}
