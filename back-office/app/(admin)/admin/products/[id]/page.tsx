'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import SideModal from '@/components/SideModal';
import ProductForm from '@/components/ProductForm';

interface ProductDocument {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

interface ChildProduct {
  id: string;
  name: string;
  reference?: string;
  purchase_price_ht?: number;
  marlon_margin_percent?: number;
  variant_data?: Record<string, string>;
  product_images?: Array<{ image_url: string; order_index: number }>;
}

interface Product {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  technical_info?: string;
  purchase_price_ht?: number;
  marlon_margin_percent?: number;
  product_type?: string;
  parent_product_id?: string | null;
  variant_data?: Record<string, string>;
  brand?: { name: string };
  supplier?: { name: string };
  category?: { name: string };
  product_images?: Array<{ image_url: string; order_index: number }>;
  child_products?: ChildProduct[];
}

const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'manual', label: 'Manuel utilisateur' },
  { value: 'guide', label: 'Guide de démarrage' },
  { value: 'warranty', label: 'Garantie' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'datasheet', label: 'Fiche technique' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadDocuments();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`);
      const data = await response.json();
      if (data.success) {
        setProduct(data.data);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/documents`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadProgress(0);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'pdf';
    const uniqueFilename = `${timestamp}-${randomStr}.${extension}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'product-documents');
    formData.append('path', `products/${productId}/${uniqueFilename}`);

    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        setDocForm(prev => ({
          ...prev,
          file_url: data.url,
          name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
        }));
      } else {
        console.error('Upload error:', data.error);
        alert('Erreur lors de l\'upload: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erreur lors de l\'upload du fichier');
    } finally {
      setUploadingDoc(false);
      setUploadProgress(100);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name || !docForm.file_url) return;

    try {
      const response = await fetch(`/api/admin/products/${productId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });

      const data = await response.json();
      if (data.success) {
        setDocuments(prev => [data.data, ...prev]);
        setShowAddDocModal(false);
        setDocForm({ name: '', description: '', file_url: '', file_type: 'pdf' });
      }
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const response = await fetch(
        `/api/admin/products/${productId}/documents?documentId=${documentId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} Mo`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} Ko`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-marlon-green" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Icon icon="mdi:alert-circle" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Produit introuvable</h2>
        <Link href="/admin/products" className="text-marlon-green hover:underline">
          Retour aux produits
        </Link>
      </div>
    );
  }

  const images = product.product_images?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.reference && (
              <p className="text-sm text-gray-500">Réf. {product.reference}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowEditModal(true)}>
          <Icon icon="mdi:pencil" className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {images.length > 0 ? (
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-50">
                <Image
                  src={images[selectedImageIndex]?.image_url || images[0].image_url}
                  alt={product.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-lg">
                <Icon icon="mdi:image-off" className="w-16 h-16 text-gray-300" />
              </div>
            )}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 transition-all ${
                      selectedImageIndex === i 
                        ? 'ring-2 ring-marlon-green ring-offset-2' 
                        : 'hover:opacity-80'
                    }`}
                  >
                    <Image
                      src={img.image_url}
                      alt={`${product.name} - ${i + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations produit</h2>
            <dl className="grid grid-cols-2 gap-4">
              {product.brand && (
                <div>
                  <dt className="text-sm text-gray-500">Marque</dt>
                  <dd className="font-medium">{(product.brand as any).name}</dd>
                </div>
              )}
              {product.supplier && (
                <div>
                  <dt className="text-sm text-gray-500">Fournisseur</dt>
                  <dd className="font-medium">{(product.supplier as any).name}</dd>
                </div>
              )}
              {product.purchase_price_ht && (
                <div>
                  <dt className="text-sm text-gray-500">Prix d&apos;achat HT</dt>
                  <dd className="font-medium">{product.purchase_price_ht.toFixed(2)} € HT</dd>
                </div>
              )}
              {product.marlon_margin_percent && (
                <div>
                  <dt className="text-sm text-gray-500">Marge</dt>
                  <dd className="font-medium">{product.marlon_margin_percent}%</dd>
                </div>
              )}
            </dl>
            {product.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm text-gray-500 mb-1">Description</dt>
                <dd 
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>

          {/* Variantes (seulement pour produits IT parents) */}
          {product.product_type === 'it_equipment' && !product.parent_product_id && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Variantes ({product.child_products?.length || 0})
                </h2>
                <Button size="sm" onClick={() => setShowAddVariantModal(true)}>
                  <Icon icon="mdi:plus" className="w-4 h-4 mr-1" />
                  Ajouter une variante
                </Button>
              </div>

              {/* Variant data du produit principal */}
              {product.variant_data && Object.keys(product.variant_data).length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-1">Produit principal — Filtres :</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.variant_data).map(([key, value]) => (
                      <span key={key} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(!product.child_products || product.child_products.length === 0) ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Icon icon="mdi:package-variant" className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Aucune variante</p>
                  <button
                    onClick={() => setShowAddVariantModal(true)}
                    className="mt-2 text-sm text-marlon-green hover:underline"
                  >
                    Ajouter une variante
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {product.child_products.map((variant) => {
                    const variantImage = variant.product_images?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))?.[0]?.image_url;
                    return (
                      <Link
                        key={variant.id}
                        href={`/admin/products/${variant.id}`}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                          {variantImage ? (
                            <Image src={variantImage} alt={variant.name} width={48} height={48} className="object-contain" />
                          ) : (
                            <Icon icon="mdi:image-off" className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{variant.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {variant.variant_data && Object.entries(variant.variant_data).map(([key, value]) => (
                              <span key={key} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900">
                            {variant.purchase_price_ht?.toFixed(2)} € HT
                          </p>
                          {variant.marlon_margin_percent && (
                            <p className="text-xs text-gray-500">Marge: {variant.marlon_margin_percent}%</p>
                          )}
                        </div>
                        <Icon icon="mdi:chevron-right" className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lien vers le produit parent si c'est une variante */}
          {product.parent_product_id && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:link-variant" className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Ce produit est une variante</p>
                  <Link href={`/admin/products/${product.parent_product_id}`} className="text-sm text-yellow-700 hover:underline">
                    Voir le produit parent →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Documentation ({documents.length})
              </h2>
              <Button size="sm" onClick={() => setShowAddDocModal(true)}>
                <Icon icon="mdi:plus" className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Icon icon="mdi:file-document-outline" className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucun document</p>
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="mt-2 text-sm text-marlon-green hover:underline"
                >
                  Ajouter un document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-marlon-green/10 rounded-lg flex items-center justify-center">
                      <Icon icon="mdi:file-pdf-box" className="w-5 h-5 text-marlon-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                      <p className="text-xs text-gray-500">
                        {doc.file_type?.toUpperCase()} • {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-marlon-green hover:bg-white rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:download" className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:delete" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      <SideModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier le produit"
      >
        <ProductForm
          product={product}
          onSuccess={() => {
            setShowEditModal(false);
            loadProduct();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </SideModal>

      {/* Add Variant Modal */}
      <SideModal
        isOpen={showAddVariantModal}
        onClose={() => setShowAddVariantModal(false)}
        title="Ajouter une variante"
      >
        <ProductForm
          parentProduct={product}
          onSuccess={() => {
            setShowAddVariantModal(false);
            loadProduct();
          }}
          onCancel={() => setShowAddVariantModal(false)}
        />
      </SideModal>

      {/* Add Document Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Ajouter un document</h3>
              <button
                onClick={() => setShowAddDocModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="p-4 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier <span className="text-red-500">*</span>
                </label>
                {docForm.file_url ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 truncate flex-1">
                      Fichier uploadé
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocForm(prev => ({ ...prev, file_url: '' }))}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Icon icon="mdi:close" className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-marlon-green hover:bg-gray-50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingDoc}
                    />
                    {uploadingDoc ? (
                      <Icon icon="mdi:loading" className="w-5 h-5 animate-spin text-marlon-green" />
                    ) : (
                      <>
                        <Icon icon="mdi:upload" className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">Cliquez pour uploader</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du document <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={docForm.name}
                  onChange={(e) => setDocForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-marlon-green focus:border-marlon-green"
                  placeholder="Ex: Manuel utilisateur"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de document
                </label>
                <select
                  value={docForm.file_type}
                  onChange={(e) => setDocForm(prev => ({ ...prev, file_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-marlon-green focus:border-marlon-green"
                >
                  {FILE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={docForm.description}
                  onChange={(e) => setDocForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-marlon-green focus:border-marlon-green"
                  rows={2}
                  placeholder="Description optionnelle..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!docForm.name || !docForm.file_url}
                  className="flex-1 px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
