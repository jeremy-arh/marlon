'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import DocumentsSubTab from './contract/DocumentsSubTab';
import InvoicesSubTab from './contract/InvoicesSubTab';

interface ContractTabProps {
  orderId: string;
  initialDocuments?: any[];
  initialInvoices?: any[];
}

export default function ContractTab({ orderId, initialDocuments = [], initialInvoices = [] }: ContractTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'invoices'>('documents');

  return (
    <div className="space-y-6">
      {/* Sub-tabs - Style Pills/Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('documents')}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeSubTab === 'documents'
              ? 'bg-marlon-green text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }
          `}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeSubTab === 'invoices'
              ? 'bg-marlon-green text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }
          `}
        >
          Factures
        </button>
      </div>

      {/* Sub-tab Content */}
      <div className="mt-6">
        {activeSubTab === 'documents' && (
          <DocumentsSubTab orderId={orderId} initialDocuments={initialDocuments} />
        )}
        {activeSubTab === 'invoices' && (
          <InvoicesSubTab orderId={orderId} initialInvoices={initialInvoices} />
        )}
      </div>
    </div>
  );
}
