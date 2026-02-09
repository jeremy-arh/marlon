'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon';
import InformationTab from './tabs/InformationTab';
import EmployeesTab from './tabs/EmployeesTab';
import OrdersTab from './tabs/OrdersTab';
import TimelineTab from './tabs/TimelineTab';

interface CustomerDetailClientProps {
  organization: any;
  initialEmployees?: any[];
  initialOrders?: any[];
}

export default function CustomerDetailClient({
  organization: initialOrganization,
  initialEmployees = [],
  initialOrders = [],
}: CustomerDetailClientProps) {
  const router = useRouter();
  const [organization, setOrganization] = useState(initialOrganization);
  const [activeTab, setActiveTab] = useState<'information' | 'employees' | 'orders' | 'timeline'>('information');

  // Sync active tab with URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'employees' || hash === 'orders' || hash === 'timeline' || hash === 'information') {
      setActiveTab(hash as any);
    }
  }, []);

  // Update URL hash when tab changes
  useEffect(() => {
    if (activeTab !== 'information') {
      window.history.replaceState(null, '', `#${activeTab}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeTab]);

  const refreshOrganizationData = async () => {
    const response = await fetch(`/api/admin/customers/${initialOrganization.id}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setOrganization(data.data);
      }
    }
    router.refresh();
  };

  const tabs = [
    { id: 'information', label: 'Informations', icon: 'mdi:information' },
    { id: 'employees', label: 'Employés', icon: 'mdi:account-group' },
    { id: 'orders', label: 'Commandes', icon: 'mdi:clipboard-list' },
    { id: 'timeline', label: 'Timeline', icon: 'mdi:clock-outline' },
  ];

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/customers"
            className="text-marlon-green hover:text-[#00A870] mb-2 inline-flex items-center gap-2"
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            Retour aux clients
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-black">
            {organization.name}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-marlon-green text-marlon-green'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon={tab.icon} className="h-5 w-5" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'information' && (
          <InformationTab 
            organization={organization} 
            onUpdate={refreshOrganizationData}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesTab 
            organizationId={organization.id}
            initialEmployees={initialEmployees}
            onUpdate={refreshOrganizationData}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab 
            organizationId={organization.id}
            initialOrders={initialOrders}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab organizationId={organization.id} />
        )}
      </div>
    </div>
  );
}
