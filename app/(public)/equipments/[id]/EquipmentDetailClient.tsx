'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface ProductDocument {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
}

interface Equipment {
  id: string;
  order_id: string;
  quantity: number;
  status: string;
  assigned_to_user_id?: string;
  assigned_to?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    reference?: string;
    description?: string;
    brand?: { name: string };
    product_categories?: Array<{ category: { id: string; name: string } }>;
    product_images?: Array<{ image_url: string; order_index: number }>;
    product_documents?: ProductDocument[];
  };
  order: {
    id: string;
    status: string;
    leasing_duration_months: number;
    created_at: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: 'mdi:clock-outline' },
  delivered: { label: 'Livré', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: 'mdi:truck-check' },
  active: { label: 'En service', color: 'text-green-700', bgColor: 'bg-green-100', icon: 'mdi:check-circle' },
  maintenance: { label: 'En maintenance', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: 'mdi:wrench' },
  returned: { label: 'Retourné', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: 'mdi:package-variant-closed' },
};

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'mdi:file-pdf-box',
  manual: 'mdi:book-open-page-variant',
  guide: 'mdi:compass',
  warranty: 'mdi:shield-check',
  certificate: 'mdi:certificate',
  default: 'mdi:file-document',
};

interface EquipmentDetailClientProps {
  equipment: Equipment;
  isAdmin: boolean;
}

export default function EquipmentDetailClient({ equipment, isAdmin }: EquipmentDetailClientProps) {
  const product = equipment.product;
  const images = product?.product_images?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) || [];
  const documents = product?.product_documents || [];
  const statusInfo = STATUS_LABELS[equipment.status] || STATUS_LABELS.pending;

  const [selectedImage, setSelectedImage] = useState<string | null>(
    images.length > 0 ? images[0]?.image_url : null
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} Mo`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} Ko`;
  };

  const getFileIcon = (fileType?: string) => {
    return FILE_TYPE_ICONS[fileType || 'default'] || FILE_TYPE_ICONS.default;
  };

  const calculateContractEndDate = () => {
    if (!equipment?.order?.created_at || !equipment?.order?.leasing_duration_months) {
      return null;
    }
    const startDate = new Date(equipment.order.created_at);
    startDate.setMonth(startDate.getMonth() + equipment.order.leasing_duration_months);
    return startDate;
  };

  const contractEndDate = calculateContractEndDate();

  return (
    <div className="p-4 lg:p-8">
      <PageHeader title={product?.name || 'Détail équipement'} />

      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/equipments" className="text-gray-500 hover:text-marlon-green">
              Équipements
            </Link>
          </li>
          <li>
            <Icon icon="mdi:chevron-right" className="h-4 w-4 text-gray-400" />
          </li>
          <li className="text-gray-900 font-medium truncate">{product?.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-white rounded-xl border border-gray-200 overflow-hidden">
            {selectedImage ? (
              <Image
                src={selectedImage}
                alt={product?.name || 'Équipement'}
                width={600}
                height={600}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon icon="mdi:image-off" className="h-24 w-24 text-gray-300" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden ${
                    selectedImage === img.image_url
                      ? 'border-marlon-green'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt={`${product?.name} - ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
            >
              <Icon icon={statusInfo.icon} className="h-4 w-4" />
              {statusInfo.label}
            </span>
            {equipment.assigned_to && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                <Icon icon="mdi:account" className="h-4 w-4" />
                Attribué à {equipment.assigned_to.first_name} {equipment.assigned_to.last_name}
              </span>
            )}
          </div>

          {/* Product name */}
          <div>
            <h1 className="text-2xl font-bold text-[#1a365d] mb-2">{product?.name}</h1>
            {product?.reference && <p className="text-sm text-gray-500">Réf. {product.reference}</p>}
          </div>

          {/* Brand & Category */}
          <div className="flex flex-wrap gap-4">
            {product?.brand && (
              <div className="flex items-center gap-2">
                <Icon icon="mdi:tag" className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">{(product.brand as any).name}</span>
              </div>
            )}
            {product?.product_categories && product.product_categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Icon icon="mdi:folder" className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">
                  {product.product_categories
                    .map((pc) => pc.category?.name)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {product?.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <div
                className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}

          {/* Contract info */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Informations du contrat</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Durée du contrat</p>
                <p className="font-medium text-gray-900">{equipment.order?.leasing_duration_months} mois</p>
              </div>
              <div>
                <p className="text-gray-500">Date de commande</p>
                <p className="font-medium text-gray-900">{formatDate(equipment.order?.created_at)}</p>
              </div>
              {contractEndDate && (
                <div>
                  <p className="text-gray-500">Fin du contrat</p>
                  <p className="font-medium text-gray-900">{formatDate(contractEndDate.toISOString())}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                href={`/orders/${equipment.order_id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Icon icon="mdi:file-document" className="h-5 w-5" />
                Voir la commande
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Documents section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-[#1a365d] mb-6 flex items-center gap-2">
          <Icon icon="mdi:folder-open" className="h-6 w-6" />
          Documentation
        </h2>

        {documents.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Icon icon="mdi:file-document-outline" className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun document disponible pour ce produit</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-marlon-green hover:shadow-md transition-all group"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-marlon-green/10 rounded-lg flex items-center justify-center">
                  <Icon icon={getFileIcon(doc.file_type)} className="h-6 w-6 text-marlon-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 group-hover:text-marlon-green truncate">
                    {doc.name}
                  </h4>
                  {doc.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    {doc.file_type && <span className="uppercase">{doc.file_type}</span>}
                    {doc.file_size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Icon icon="mdi:download" className="h-5 w-5 text-gray-400 group-hover:text-marlon-green" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
