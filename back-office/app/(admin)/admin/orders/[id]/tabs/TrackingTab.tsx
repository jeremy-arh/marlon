'use client';

import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/Icon';
import FinancingRequestTab from './tracking/FinancingRequestTab';
import ContractPreparationTab from './tracking/ContractPreparationTab';
import ContractSignatureTab from './tracking/ContractSignatureTab';
import SignedContractTab from './tracking/SignedContractTab';
import DeliveryTab from './tracking/DeliveryTab';
import ContractInProgressTab from './tracking/ContractInProgressTab';
import ContractEndTab from './tracking/ContractEndTab';

interface TrackingTabProps {
  orderId: string;
  order?: any;
  initialTracking?: any;
  onUpdate?: () => void;
}

export default function TrackingTab({ orderId, order, initialTracking, onUpdate }: TrackingTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>('financing');
  const [trackingData, setTrackingData] = useState(initialTracking);

  // Synchroniser trackingData avec initialTracking quand il change
  useEffect(() => {
    setTrackingData(initialTracking);
  }, [initialTracking]);

  const handleTrackingUpdate = async () => {
    // Rafraîchir les données de tracking
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setTrackingData(data.data);
        }
      }
    } catch (error) {
      console.error('Error refreshing tracking data:', error);
    }
    
    // Appeler le callback parent si fourni
    if (onUpdate) {
      onUpdate();
    }
  };

  const subTabs = [
    { id: 'financing', label: 'Demande de financement', icon: 'mdi:bank' },
    { id: 'preparation', label: 'Préparation du contrat', icon: 'mdi:file-document-edit' },
    { id: 'signature', label: 'Signature du contrat', icon: 'mdi:signature' },
    { id: 'signed', label: 'Contrat signé', icon: 'mdi:file-check' },
    { id: 'delivery', label: 'Livraison', icon: 'mdi:truck-delivery' },
    { id: 'in-progress', label: 'Contrats en cours', icon: 'mdi:clock-outline' },
    { id: 'end', label: 'Fin de contrat', icon: 'mdi:flag-checkered' },
  ];

  // Vérifier si chaque étape est complétée
  const stepCompletion = useMemo(() => {
    const tracking = trackingData || {};
    
    return {
      financing: tracking.financing_status === 'validated' || tracking.financing_status === 'rejected',
      preparation: !!(tracking.identity_card_front_url && tracking.identity_card_back_url),
      signature: !!(tracking.tax_liasse_url && tracking.business_plan_url),
      signed: !!(tracking.signed_contract_url && tracking.contract_number),
      delivery: tracking.delivery_status === 'delivered' || tracking.delivery_status === 'delivery_signed',
      'in-progress': tracking.contract_status === 'signed',
      end: !!tracking.contract_end_date,
    };
  }, [trackingData]);

  // Vérifier si chaque étape est commencée (au moins partiellement remplie)
  const stepStarted = useMemo(() => {
    const tracking = trackingData || {};
    
    return {
      financing: !!tracking.financing_status,
      preparation: !!(tracking.identity_card_front_url || tracking.identity_card_back_url),
      signature: !!(tracking.tax_liasse_url || tracking.business_plan_url),
      signed: !!(tracking.signed_contract_url || tracking.contract_number || tracking.docusign_link),
      delivery: !!tracking.delivery_status && tracking.delivery_status !== 'pending',
      'in-progress': !!tracking.contract_status && tracking.contract_status !== 'pending',
      end: !!tracking.contract_end_date,
    };
  }, [trackingData]);

  // Déterminer si une étape est accessible - toutes les étapes sont toujours accessibles
  const isStepAccessible = (stepId: string): boolean => {
    return true; // Toutes les étapes sont accessibles sans restriction
  };

  const handleStepClick = (stepId: string) => {
    if (isStepAccessible(stepId)) {
      setActiveSubTab(stepId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper/Funnel Design */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-8">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200">
            <div 
              className="absolute top-0 left-0 h-full bg-marlon-green transition-all duration-300"
              style={{
                width: `${((subTabs.findIndex(t => t.id === activeSubTab) + 1) / subTabs.length) * 100}%`
              }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex items-start justify-between">
            {subTabs.map((tab, index) => {
              const isCompleted = stepCompletion[tab.id as keyof typeof stepCompletion];
              const isAccessible = isStepAccessible(tab.id);
              const isActive = activeSubTab === tab.id;
              const stepNumber = index + 1;
              
              return (
                <div key={tab.id} className="flex flex-col items-center flex-1 relative z-10">
                  {/* Step Circle */}
                  <button
                    onClick={() => handleStepClick(tab.id)}
                    disabled={!isAccessible}
                    className={`
                      relative flex items-center justify-center
                      w-16 h-16 rounded-full border-4 transition-all duration-200
                      ${isActive && isAccessible
                        ? 'bg-marlon-green border-marlon-green text-white shadow-lg scale-110'
                        : isCompleted && isAccessible
                        ? 'bg-white border-black text-black shadow-md'
                        : isAccessible
                        ? 'bg-white border-gray-300 text-gray-600 hover:border-marlon-green hover:scale-105'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isCompleted && !isActive ? (
                      <Icon icon="mdi:check" className="h-8 w-8 text-black" />
                    ) : (
                      <span className={`
                        text-lg font-bold
                        ${isActive && isAccessible
                          ? 'text-white'
                          : isAccessible
                          ? 'text-gray-700'
                          : 'text-gray-400'
                        }
                      `}>
                        {stepNumber}
                      </span>
                    )}
                  </button>

                  {/* Step Label */}
                  <div className="mt-4 text-center max-w-[120px]">
                    <button
                      onClick={() => handleStepClick(tab.id)}
                      disabled={!isAccessible}
                      className={`
                        text-sm font-medium transition-colors
                        ${isActive && isAccessible
                          ? 'text-marlon-green'
                          : isAccessible
                          ? 'text-gray-700 hover:text-marlon-green'
                          : 'text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="mt-6">
        {activeSubTab === 'financing' && (
          <FinancingRequestTab orderId={orderId} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
        {activeSubTab === 'preparation' && (
          <ContractPreparationTab orderId={orderId} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
        {activeSubTab === 'signature' && (
          <ContractSignatureTab orderId={orderId} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
        {activeSubTab === 'signed' && (
          <SignedContractTab orderId={orderId} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
        {activeSubTab === 'delivery' && (
          <DeliveryTab orderId={orderId} order={order} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
        {activeSubTab === 'in-progress' && (
          <ContractInProgressTab orderId={orderId} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
        {activeSubTab === 'end' && (
          <ContractEndTab orderId={orderId} initialTracking={trackingData} onUpdate={handleTrackingUpdate} />
        )}
      </div>
    </div>
  );
}
