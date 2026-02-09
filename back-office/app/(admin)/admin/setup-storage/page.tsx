'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function SetupStoragePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createBuckets = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/admin/create-buckets', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création des buckets');
        return;
      }

      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const buckets = [
    {
      id: 'product-images',
      name: 'Images produits',
      public: true,
      description: 'Images des produits du catalogue',
    },
    {
      id: 'category-images',
      name: 'Images catégories',
      public: true,
      description: 'Images des catégories',
    },
    {
      id: 'contracts',
      name: 'Contrats',
      public: false,
      description: 'Contrats de leasing',
    },
    {
      id: 'invoices',
      name: 'Factures',
      public: false,
      description: 'Factures des organisations',
    },
    {
      id: 'static-assets',
      name: 'Assets statiques',
      public: true,
      description: 'Logo, favicon, etc.',
    },
  ];

  return (
    <div className="container mx-auto bg-gray-50 px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-black">Configuration du Storage</h1>
        <p className="text-black">
          Créez les buckets Supabase Storage nécessaires pour la plateforme
        </p>
      </div>

      <div className="mb-8 rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-black">Buckets à créer</h2>
        <div className="space-y-3">
          {buckets.map((bucket) => {
            const result = results.find((r) => r.bucket === bucket.id);
            return (
              <div
                key={bucket.id}
                className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-black">{bucket.name}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        bucket.public
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {bucket.public ? 'Public' : 'Privé'}
                    </span>
                    {result && (
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          result.status === 'created'
                            ? 'bg-green-100 text-green-800'
                            : result.status === 'exists'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {result.status === 'created'
                          ? 'Créé'
                          : result.status === 'exists'
                          ? 'Existe déjà'
                          : 'Erreur'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[#525C6B]">{bucket.description}</p>
                  {result && result.message && (
                    <p className="mt-1 text-xs text-[#525C6B]">{result.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={createBuckets}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-marlon-green px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#00A870] focus:outline-none focus:ring-2 focus:ring-marlon-green focus:ring-offset-2 disabled:opacity-50"
        >
          <Icon icon="mdi:cloud-upload" className="h-5 w-5" />
          {loading ? 'Création en cours...' : 'Créer les buckets'}
        </button>

        {results.length > 0 && (
          <a
            href="/admin/dashboard"
            className="flex items-center gap-2 rounded-md border border-[#525C6B] bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-[#F3F4F6]"
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            Retour au dashboard
          </a>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-8 rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-black">Résultats</h3>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="text-sm text-gray-700">
                <strong className="text-black">{result.bucket}:</strong> {result.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
