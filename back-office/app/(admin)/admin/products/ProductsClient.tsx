'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import ProductForm from '@/components/ProductForm';

interface ProductsClientProps {
  initialProducts: any[];
  durations: Array<{ id: string; months: number }>;
}

export default function ProductsClient({ initialProducts, durations }: ProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/list', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (product: any) => {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`);
      const data = await response.json();
      if (data.success) {
        setEditingProduct(data.data);
        setIsModalOpen(true);
      } else {
        setEditingProduct(product);
        setIsModalOpen(true);
      }
    } catch (error) {
      setEditingProduct(product);
      setIsModalOpen(true);
    }
  };

  const handleSuccess = () => {
    if (editingProduct) {
      setIsModalOpen(false);
      setEditingProduct(null);
    }
    loadProducts();
    router.refresh();
  };

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-black">Produits</h1>
        <Button onClick={handleAdd} icon="mdi:plus" variant="primary" className="w-full sm:w-auto">
          Ajouter un produit
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un produit"
            className="w-full rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm text-black placeholder-gray-500 focus:border-marlon-green focus:outline-none focus:ring-1 focus:ring-marlon-green"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marque</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix d&apos;achat HT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marge %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaser par défaut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products && products.length > 0 ? (
                products.map((product: any) => {
                  const firstImage = product.product_images && product.product_images.length > 0
                    ? product.product_images.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))[0]?.image_url
                    : null;

                  const isExpanded = expandedProducts.has(product.id);

                  return (
                    <Fragment key={product.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Icon 
                              icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
                              className="h-5 w-5" 
                            />
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt={product.name}
                              className="h-12 w-12 rounded-md object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">{product.name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{product.reference || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{product.brand?.name || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{product.supplier?.name || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{parseFloat(product.purchase_price_ht.toString()).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{parseFloat(product.marlon_margin_percent.toString()).toFixed(2)}%</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{product.default_leaser?.name || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/products/${product.id}`)}
                              className="text-marlon-green hover:text-marlon-green/80"
                              title="Voir la fiche"
                            >
                              <Icon icon="mdi:file-document-outline" className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-black hover:text-gray-700"
                              title="Modifier"
                            >
                              <Icon icon="fluent:edit-24-filled" className="h-5 w-5" />
                            </button>
                            <button className="text-red-600 hover:text-red-800" title="Supprimer">
                              <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${product.id}-details`} className="bg-gray-50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Prix par durée de leasing - Produit principal */}
                              <div className="bg-white rounded-md border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-black mb-3">Prix par durée de leasing</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {durations.map((duration) => {
                                    const price = product.pricesByDuration?.[duration.months];
                                    return (
                                      <div
                                        key={duration.id}
                                        className="rounded-md border border-gray-200 bg-gray-50 p-3"
                                      >
                                        <div className="text-xs font-medium text-gray-500 mb-2">
                                          {duration.months} mois
                                        </div>
                                        {price ? (
                                          <div className="space-y-1">
                                            <div className="text-sm font-semibold text-black">
                                              {price.monthly.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mois
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Total: {price.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-400">Non disponible</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Variantes avec leurs prix - Seulement pour produits IT */}
                              {product.product_type === 'it_equipment' && product.variants && product.variants.length > 0 && (
                                <div className="bg-white rounded-md border border-gray-200 p-4">
                                  <h4 className="text-sm font-semibold text-black mb-3">Variantes</h4>
                                  <div className="space-y-4">
                                    {product.variants.map((variant: any, variantIndex: number) => {
                                      const variantFirstImage = Array.isArray(variant.images) && variant.images.length > 0 
                                        ? variant.images[0] 
                                        : null;
                                      
                                      return (
                                      <div key={variant.id || variantIndex} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                                        <div className="flex items-center gap-3 mb-2">
                                          {variantFirstImage ? (
                                            <img
                                              src={variantFirstImage}
                                              alt={variant.displayName || `Variante #${variantIndex + 1}`}
                                              className="h-12 w-12 rounded-md object-cover border border-gray-200 flex-shrink-0"
                                            />
                                          ) : (
                                            <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                              <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-400" />
                                            </div>
                                          )}
                                          <div className="text-xs font-medium text-gray-700">
                                            {variant.displayName || `Variante #${variantIndex + 1}`}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                          {durations.map((duration) => {
                                            const variantPrice = variant.pricesByDuration?.[duration.months];
                                            return (
                                              <div
                                                key={`${variant.id || variantIndex}-${duration.id}`}
                                                className="rounded-md border border-gray-200 bg-white p-2"
                                              >
                                                <div className="text-[10px] font-medium text-gray-500 mb-1">
                                                  {duration.months} mois
                                                </div>
                                                {variantPrice ? (
                                                  <div className="space-y-0.5">
                                                    <div className="text-xs font-semibold text-black">
                                                      {variantPrice.monthly.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mois
                                                    </div>
                                                    <div className="text-[10px] text-gray-600">
                                                      Total: {variantPrice.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="text-xs text-gray-400">Non disponible</div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
      >
        <ProductForm
          product={editingProduct}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
        />
      </SideModal>
    </>
  );
}
