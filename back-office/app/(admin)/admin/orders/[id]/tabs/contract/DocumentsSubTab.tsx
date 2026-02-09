'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/Button';
import Icon from '@/components/Icon';
import SideModal from '@/components/SideModal';

interface DocumentsSubTabProps {
  orderId: string;
  initialDocuments?: any[];
}

export default function DocumentsSubTab({ orderId, initialDocuments = [] }: DocumentsSubTabProps) {
  const [documents, setDocuments] = useState<any[]>(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/documents`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [orderId]);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('path', `orders/${orderId}/documents/${Date.now()}-${file.name}`);
      formDataUpload.append('bucket', 'contracts');

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      // Save document info
      const saveResponse = await fetch(`/api/admin/orders/${orderId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || file.name,
          description: formData.description,
          file_url: data.url,
          file_type: file.type,
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Erreur lors de la sauvegarde');
      }

      await loadDocuments();
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/documents/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-black">Documents</h3>
        <Button
          onClick={() => {
            setEditingDoc(null);
            setFormData({ name: '', description: '' });
            setIsModalOpen(true);
          }}
          variant="primary"
          icon="mdi:plus"
        >
          Ajouter un document
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {documents.length > 0 ? (
        <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr 
                  key={doc.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.open(doc.file_url, '_blank', 'noopener,noreferrer')}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">{doc.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{doc.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Icon icon="meteor-icons:trash-can" className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucun document</p>
        </div>
      )}

      {/* Add Document Modal */}
      <SideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({ name: '', description: '' });
        }}
        title="Ajouter un document"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Nom du document <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Fichier <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!formData.name) {
                    setFormData({ ...formData, name: file.name });
                  }
                  handleFileSelect(file);
                }
              }}
              className="w-full rounded-md border border-[#525C6B] bg-white px-4 py-2.5 text-sm text-black"
              required
            />
          </div>
        </div>
      </SideModal>
    </div>
  );
}
