'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Icon from '@/components/Icon';
import AddressAutocomplete from '@/components/AddressAutocomplete';

// Types
interface CartItem {
  id: string;
  quantity: number;
  duration_months?: number;
  products?: {
    id: string;
    name: string;
    reference?: string;
    purchase_price_ht: number;
    marlon_margin_percent: number;
    default_leaser_id: string | null;
    product_images?: Array<{ image_url: string; order_index: number }>;
  };
}

interface DeliveryAddress {
  id?: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  contact_name?: string;
  contact_phone?: string;
  instructions?: string;
}

const DEFAULT_COEFFICIENTS: Record<number, number> = {
  24: 0.05,
  36: 0.038,
  48: 0.032,
  60: 0.028,
  72: 0.026,
  84: 0.024,
};

const DURATION_OPTIONS = [
  { value: 36, label: '36 mois' },
  { value: 48, label: '48 mois' },
  { value: 60, label: '60 mois' },
  { value: 72, label: '72 mois' },
  { value: 84, label: '84 mois' },
];

const calculateLocalPrice = (item: CartItem, durationMonths: number) => {
  if (!item.products) return { monthlyHT: 0, monthlyTTC: 0 };
  
  const purchasePrice = Number(item.products.purchase_price_ht);
  const marginPercent = Number(item.products.marlon_margin_percent);
  const sellingPriceHT = purchasePrice * (1 + marginPercent / 100);
  const coefficient = DEFAULT_COEFFICIENTS[durationMonths] || 0.035;
  const monthlyHT = sellingPriceHT * coefficient;
  const monthlyTTC = monthlyHT * 1.2;
  
  return {
    monthlyHT: monthlyHT * item.quantity,
    monthlyTTC: monthlyTTC * item.quantity,
  };
};

export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [prices, setPrices] = useState<Record<string, { monthlyHT: number; monthlyTTC: number }>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // Step 1: Company data
  const [companyData, setCompanyData] = useState({
    name: '',
    siret: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
  });

  // Step 2: Delivery address
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<DeliveryAddress>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    contact_name: '',
    contact_phone: '',
    instructions: '',
  });

  // Step 3: Signer info
  const [signerData, setSignerData] = useState({
    name: '',
    phone: '',
    email: '',
    birth_city: '',
    birth_date: '',
  });
  const [editingSigner, setEditingSigner] = useState(false);
  const [documents, setDocuments] = useState({
    identity_front: null as File | null,
    identity_back: null as File | null,
    tax_liasse: null as File | null,
    business_plan: null as File | null,
  });
  // URLs of previously uploaded documents (from organization)
  const [existingDocuments, setExistingDocuments] = useState({
    identity_front_url: '',
    identity_back_url: '',
    tax_liasse_url: '',
    business_plan_url: '',
  });

  const loadPricesFromApi = useCallback(async (items: CartItem[], duration: number) => {
    setPricesLoading(true);

    const results = await Promise.all(
      items.map(async (item) => {
        if (!item.products) return { itemId: item.id, price: null };
        try {
          const res = await fetch(`/api/products/${item.products.id}/price?duration=${duration}`);
          const data = await res.json();
          if (data.success && data.price) {
            const qty = item.quantity || 1;
            const monthlyHT = data.price.monthlyPrice * qty;
            const monthlyTTC = monthlyHT * 1.2;
            return { itemId: item.id, price: { monthlyHT, monthlyTTC } };
          }
        } catch {
          // fallback to local calculation on error
        }
        return { itemId: item.id, price: calculateLocalPrice(item, duration) };
      })
    );

    const newPrices: Record<string, { monthlyHT: number; monthlyTTC: number }> = {};
    results.forEach(({ itemId, price }) => {
      if (price) newPrices[itemId] = price;
    });
    setPrices(newPrices);
    setPricesLoading(false);
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) {
      loadPricesFromApi(cartItems, selectedDuration);
    }
  }, [cartItems, selectedDuration, loadPricesFromApi]);

  useEffect(() => {
    fetchCartAndUserData();
  }, [pathname]);

  const fetchCartAndUserData = async () => {
    setLoading(true);
    try {
      // Fetch cart
      const cartResponse = await fetch('/api/cart');
      const cartData = await cartResponse.json();
      
      if (!cartData.items || cartData.items.length === 0) {
        router.push('/catalog');
        return;
      }
      
      setCartItems(cartData.items);
      setCartId(cartData.cart?.id);

      // Initialize selectedDuration from cart items (use the first item's duration, or default to 60)
      const firstItemDuration = cartData.items[0]?.duration_months;
      if (firstItemDuration && DURATION_OPTIONS.some(opt => opt.value === firstItemDuration)) {
        setSelectedDuration(firstItemDuration);
      }

      // Fetch user organization data
      const userResponse = await fetch('/api/user/organization');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.organization) {
          setCompanyData({
            name: userData.organization.name || '',
            siret: userData.organization.siret || '',
            address: userData.organization.address || '',
            postal_code: userData.organization.postal_code || '',
            city: userData.organization.city || '',
            country: userData.organization.country || 'France',
          });
        }
        if (userData.deliveryAddresses) {
          setDeliveryAddresses(userData.deliveryAddresses);
          if (userData.deliveryAddresses.length > 0) {
            setSelectedAddressId(userData.deliveryAddresses[0].id);
          }
        }
        if (userData.user) {
          // Load signer data from organization if available
          const org = userData.organization;
          let birthDate = '';
          if (org?.signer_birth_date) {
            // Convert YYYY-MM-DD to DD.MM.YYYY format
            const dateParts = org.signer_birth_date.split('-');
            if (dateParts.length === 3) {
              const [year, month, day] = dateParts;
              birthDate = `${day}.${month}.${year}`;
            }
          }
          
          setSignerData({
            name: userData.user.full_name || '',
            phone: org?.signer_phone || userData.user.phone || '',
            email: userData.user.email || '',
            birth_city: org?.signer_birth_city || '',
            birth_date: birthDate,
          });
          
          // Pre-load document URLs if they exist (for display purposes)
          setExistingDocuments({
            identity_front_url: org?.signer_identity_card_front_url || '',
            identity_back_url: org?.signer_identity_card_back_url || '',
            tax_liasse_url: org?.signer_tax_liasse_url || '',
            business_plan_url: org?.signer_business_plan_url || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = cartItems.reduce(
    (acc, item) => {
      const price = prices[item.id] || calculateLocalPrice(item, selectedDuration);
      return {
        monthlyHT: acc.monthlyHT + price.monthlyHT,
        monthlyTTC: acc.monthlyTTC + price.monthlyTTC,
        itemCount: acc.itemCount + item.quantity,
      };
    },
    { monthlyHT: 0, monthlyTTC: 0, itemCount: 0 }
  );

  // Validation functions
  const validateStep1 = (): string[] => {
    const errors: string[] = [];
    if (!companyData.name.trim()) errors.push('La raison sociale est obligatoire');
    if (!companyData.siret.trim()) errors.push('Le numéro SIREN est obligatoire');
    if (!companyData.address.trim()) errors.push('L\'adresse est obligatoire');
    if (!companyData.postal_code.trim()) errors.push('Le code postal est obligatoire');
    if (!companyData.city.trim()) errors.push('La ville est obligatoire');
    if (!companyData.country.trim()) errors.push('Le pays est obligatoire');
    return errors;
  };

  const validateStep2 = (): string[] => {
    const errors: string[] = [];
    if (!selectedAddressId) errors.push('Veuillez sélectionner une adresse de livraison');
    return errors;
  };

  const validateStep3 = (): string[] => {
    const errors: string[] = [];
    if (!signerData.name.trim()) errors.push('Le nom du signataire est obligatoire');
    if (!signerData.phone.trim()) errors.push('Le téléphone du signataire est obligatoire');
    if (!signerData.email.trim()) errors.push('L\'email du signataire est obligatoire');
    if (!signerData.birth_city.trim()) errors.push('La ville de naissance est obligatoire');
    if (!signerData.birth_date.trim()) errors.push('La date de naissance est obligatoire');
    // Accept either new file upload OR existing document URL
    if (!documents.identity_front && !existingDocuments.identity_front_url) errors.push('Le recto de la pièce d\'identité est obligatoire');
    if (!documents.identity_back && !existingDocuments.identity_back_url) errors.push('Le verso de la pièce d\'identité est obligatoire');
    return errors;
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return validateStep1().length === 0;
      case 2:
        return validateStep2().length === 0;
      case 3:
        return validateStep3().length === 0;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    let errors: string[] = [];
    
    switch (currentStep) {
      case 1:
        errors = validateStep1();
        break;
      case 2:
        errors = validateStep2();
        break;
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    setValidationErrors([]);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const [savingAddress, setSavingAddress] = useState(false);

  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.address || !newAddress.city || !newAddress.postal_code) {
      return;
    }
    
    setSavingAddress(true);
    try {
      const response = await fetch('/api/user/delivery-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }
      
      // Add the new address to the list with the real ID from the database
      setDeliveryAddresses([...deliveryAddresses, data.address]);
      setSelectedAddressId(data.address.id);
      setShowAddAddress(false);
      setEditingAddressId(null);
      setNewAddress({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'France',
        contact_name: '',
        contact_phone: '',
        instructions: '',
      });
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création de l\'adresse');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    setEditingAddressId(address.id || null);
    setNewAddress({ ...address });
    setShowAddAddress(true);
  };

  const handleUpdateAddress = async () => {
    if (!newAddress.name || !newAddress.address || !newAddress.city || !newAddress.postal_code || !editingAddressId) {
      return;
    }
    
    setSavingAddress(true);
    try {
      const response = await fetch(`/api/user/delivery-addresses/${editingAddressId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la modification');
      }
      
      // Update the address in the list
      setDeliveryAddresses(prev => 
        prev.map(addr => 
          addr.id === editingAddressId ? data.address : addr
        )
      );
      
      setShowAddAddress(false);
      setEditingAddressId(null);
      setNewAddress({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'France',
        contact_name: '',
        contact_phone: '',
        instructions: '',
      });
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la modification de l\'adresse');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/user/delivery-addresses/${addressId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      
      // Remove from local state
      setDeliveryAddresses(prev => prev.filter(addr => addr.id !== addressId));
      
      // If the deleted address was selected, clear selection
      if (selectedAddressId === addressId) {
        const remaining = deliveryAddresses.filter(addr => addr.id !== addressId);
        setSelectedAddressId(remaining.length > 0 ? remaining[0].id || null : null);
      }
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression de l\'adresse');
    }
  };

  const handleCancelAddressForm = () => {
    setShowAddAddress(false);
    setEditingAddressId(null);
    setNewAddress({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'France',
      contact_name: '',
      contact_phone: '',
      instructions: '',
    });
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleSubmitOrder = async () => {
    // Validate step 3
    const errors = validateStep3();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    setValidationErrors([]);

    try {
      // Upload documents
      const uploadPromises: Promise<{ key: string; url: string | null }>[] = [];

      if (documents.identity_front) {
        uploadPromises.push(
          uploadFile(documents.identity_front, 'order-documents').then(url => ({ key: 'identity_card_front_url', url }))
        );
      }
      if (documents.identity_back) {
        uploadPromises.push(
          uploadFile(documents.identity_back, 'order-documents').then(url => ({ key: 'identity_card_back_url', url }))
        );
      }
      if (documents.tax_liasse) {
        uploadPromises.push(
          uploadFile(documents.tax_liasse, 'order-documents').then(url => ({ key: 'tax_liasse_url', url }))
        );
      }
      if (documents.business_plan) {
        uploadPromises.push(
          uploadFile(documents.business_plan, 'order-documents').then(url => ({ key: 'business_plan_url', url }))
        );
      }

      const uploadResults = await Promise.all(uploadPromises);
      
      // Build document URLs object - start with existing documents, then override with new uploads
      const documentUrls: Record<string, string> = {};
      
      // Add existing document URLs (from organization) as fallbacks
      if (existingDocuments.identity_front_url) {
        documentUrls.identity_card_front_url = existingDocuments.identity_front_url;
      }
      if (existingDocuments.identity_back_url) {
        documentUrls.identity_card_back_url = existingDocuments.identity_back_url;
      }
      if (existingDocuments.tax_liasse_url) {
        documentUrls.tax_liasse_url = existingDocuments.tax_liasse_url;
      }
      if (existingDocuments.business_plan_url) {
        documentUrls.business_plan_url = existingDocuments.business_plan_url;
      }
      
      // Override with newly uploaded files
      uploadResults.forEach(result => {
        if (result.url) {
          documentUrls[result.key] = result.url;
        }
      });

      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          durationMonths: selectedDuration,
          companyData,
          deliveryAddress: deliveryAddresses.find(a => a.id === selectedAddressId),
          signerData,
          documentUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la commande');
      }

      // Envoyer l'événement GTM new_lead pour le tracking
      const orderValue = totals.monthlyTTC * selectedDuration;
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: 'new_lead',
          order_id: data.order.id,
          order_value: orderValue,
          currency: 'EUR',
          order_items_count: totals.itemCount,
          leasing_duration_months: selectedDuration,
        });
      }

      router.push(`/orders/${data.order.id}/confirmation`);
    } catch (error: any) {
      setValidationErrors([error.message]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-marlon-green" />
        <span className="ml-2 text-gray-600">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Stepper Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-center">
            {/* Steps indicator */}
            <div className="flex items-center gap-2 sm:gap-4">
              {[
                { num: 1, label: 'Entreprise' },
                { num: 2, label: 'Livraison' },
                { num: 3, label: 'Finalisation' },
              ].map((step, index) => (
                <div key={step.num} className="flex items-center">
                  {index > 0 && (
                    <div className={`w-8 sm:w-16 h-0.5 mr-2 sm:mr-4 ${currentStep > index ? 'bg-marlon-green' : 'bg-gray-300'}`} />
                  )}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                        currentStep > step.num
                          ? 'bg-marlon-green text-white'
                          : currentStep === step.num
                          ? 'border-2 border-marlon-green text-marlon-green bg-white'
                          : 'border-2 border-gray-300 text-gray-400 bg-white'
                      }`}
                    >
                      {currentStep > step.num ? (
                        <Icon icon="mdi:check" className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        step.num
                      )}
                    </div>
                    <span className={`mt-1 text-[10px] sm:text-xs ${currentStep >= step.num ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-48 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Back button */}
            <button
              onClick={currentStep === 1 ? () => router.push('/catalog') : handlePrevStep}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
            >
              <Icon icon="mdi:arrow-left" className="h-4 w-4" />
              <span>Retour</span>
            </button>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Veuillez corriger les erreurs suivantes :</p>
                    <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Company */}
            {currentStep === 1 && (
              <div>
                <h1 className="text-2xl font-bold text-[#1a365d] mb-2">Ajoutez le détail de votre entreprise</h1>
                <p className="text-gray-600 mb-6">
                  Pour passer votre commande, donnez-nous plus d&apos;informations sur votre entreprise.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raison sociale <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent ${
                        !companyData.name && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nom de votre entreprise"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro SIREN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyData.siret}
                      onChange={(e) => setCompanyData({ ...companyData, siret: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent ${
                        !companyData.siret && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse <span className="text-red-500">*</span>
                    </label>
                    <AddressAutocomplete
                      value={companyData.address}
                      onChange={(value) => setCompanyData({ ...companyData, address: value })}
                      onAddressSelect={(components) => {
                        setCompanyData({
                          ...companyData,
                          address: components.address,
                          city: components.city,
                          postal_code: components.postal_code,
                          country: components.country,
                        });
                      }}
                      placeholder="Rechercher une adresse..."
                      error={!companyData.address && validationErrors.length > 0}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={companyData.postal_code}
                        onChange={(e) => setCompanyData({ ...companyData, postal_code: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent ${
                          !companyData.postal_code && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="75010"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={companyData.city}
                        onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent ${
                          !companyData.city && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Paris"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pays <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyData.country}
                      onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green focus:border-transparent ${
                        !companyData.country && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="France"
                      readOnly
                    />
                  </div>
                </div>

                {/* Benefits section */}
                <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
                  <p className="text-center text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
                    La 1ère marketplace de location d&apos;équipements médicaux pensée et développée en collaboration avec des professionnels de santé.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {[
                      { icon: 'mdi:hand-heart', label: 'Les meilleurs équipements' },
                      { icon: 'mdi:thumb-up', label: 'Un outil de gestion de vos équipements' },
                      { icon: 'mdi:cash-multiple', label: 'Une trésorerie maîtrisée' },
                      { icon: 'mdi:leaf', label: 'Une politique RSE Responsable' },
                    ].map((benefit, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                          <Icon icon={benefit.icon} className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-600">{benefit.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Delivery */}
            {currentStep === 2 && (
              <div>
                <h1 className="text-2xl font-bold text-[#1a365d] mb-2">Confirmer l&apos;adresse de livraison</h1>
                <p className="text-gray-600 mb-6">
                  Merci de préciser à quelle adresse doit être livrée cette commande
                </p>

                <div className={`border rounded-lg p-4 mb-6 ${
                  !selectedAddressId && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Envoyer à :</span>
                    <button
                      onClick={() => setShowAddAddress(true)}
                      className="flex items-center gap-1 text-marlon-green hover:text-marlon-green/80"
                    >
                      <Icon icon="mdi:plus" className="h-4 w-4" />
                      Ajouter une adresse
                    </button>
                  </div>

                  {deliveryAddresses.length > 0 ? (
                    <div className="space-y-3">
                      {deliveryAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            selectedAddressId === addr.id
                              ? 'border-marlon-green bg-marlon-green/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative mt-1">
                              <input
                                type="radio"
                                name="delivery_address"
                                checked={selectedAddressId === addr.id}
                                onChange={() => setSelectedAddressId(addr.id || null)}
                                className="sr-only"
                              />
                              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                                selectedAddressId === addr.id 
                                  ? 'bg-marlon-green border-marlon-green' 
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {selectedAddressId === addr.id && (
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                )}
                              </div>
                            </div>
                            <label 
                              className="flex-1 cursor-pointer"
                              onClick={() => setSelectedAddressId(addr.id || null)}
                            >
                              <p className="font-medium text-gray-900">{addr.name}</p>
                              <p className="text-sm text-gray-600">
                                Adresse: {addr.address}, {addr.postal_code} {addr.city}, {addr.country}
                              </p>
                              {addr.contact_name && (
                                <p className="text-sm text-gray-600">
                                  Contact: {addr.contact_name}{addr.contact_phone ? `, ${addr.contact_phone}` : ''}
                                </p>
                              )}
                              {addr.instructions && (
                                <p className="text-sm text-gray-600">
                                  Instructions de livraison: {addr.instructions}
                                </p>
                              )}
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAddress(addr);
                                }}
                                className="p-2 text-gray-400 hover:text-marlon-green hover:bg-gray-100 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Icon icon="mdi:pencil" className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) {
                                    handleDeleteAddress(addr.id || '');
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Icon icon="mdi:delete" className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Aucune adresse de livraison enregistrée. Ajoutez-en une.
                    </p>
                  )}
                </div>

                {/* Add/Edit address form */}
                {showAddAddress && (
                  <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">
                        {editingAddressId ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                      </h3>
                      {editingAddressId && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          Modification
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nom (ex: Cabinet, Bureau...) *"
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      />
                      <AddressAutocomplete
                        value={newAddress.address}
                        onChange={(value) => setNewAddress({ ...newAddress, address: value })}
                        onAddressSelect={(components) => {
                          setNewAddress({
                            ...newAddress,
                            address: components.address,
                            city: components.city,
                            postal_code: components.postal_code,
                            country: components.country,
                          });
                        }}
                        placeholder="Rechercher une adresse..."
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Code postal *"
                          value={newAddress.postal_code}
                          onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        />
                        <input
                          type="text"
                          placeholder="Ville *"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Nom du contact"
                          value={newAddress.contact_name || ''}
                          onChange={(e) => setNewAddress({ ...newAddress, contact_name: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        />
                        <input
                          type="text"
                          placeholder="Téléphone du contact"
                          value={newAddress.contact_phone || ''}
                          onChange={(e) => setNewAddress({ ...newAddress, contact_phone: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Instructions de livraison"
                        value={newAddress.instructions || ''}
                        onChange={(e) => setNewAddress({ ...newAddress, instructions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={editingAddressId ? handleUpdateAddress : handleAddAddress}
                          disabled={!newAddress.name || !newAddress.address || !newAddress.city || !newAddress.postal_code || savingAddress}
                          className="px-4 py-2 bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90 disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingAddress ? (
                            <>
                              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <Icon icon={editingAddressId ? "mdi:check" : "mdi:plus"} className="h-4 w-4" />
                              {editingAddressId ? 'Enregistrer' : 'Ajouter'}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelAddressForm}
                          disabled={savingAddress}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Benefits */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-[#1a365d] mb-4">Les avantages inclus dans la location</h3>
                  <div className="space-y-3">
                    {[
                      { icon: 'mdi:cash-multiple', text: 'Location de l\'équipement' },
                      { icon: 'mdi:speedometer', text: 'Financement simple et rapide' },
                      { icon: 'mdi:shield-star', text: 'Garantie Premium Marlon' },
                      { icon: 'mdi:cog', text: 'Accès à la gestion de vos équipements' },
                      { icon: 'mdi:truck-delivery', text: 'Livraison partout en France' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Icon icon={item.icon} className="h-5 w-5 text-marlon-green" />
                        <span className="text-sm text-gray-900">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Finalization */}
            {currentStep === 3 && (
              <div>
                <h1 className="text-2xl font-bold text-[#1a365d] mb-2">Finaliser votre commande</h1>
                <p className="text-gray-600 mb-6">
                  Veuillez saisir les informations du signataire du contrat de location.
                </p>

                {/* Signer info */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  {!editingSigner ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="font-medium text-gray-900">{signerData.name || 'Nom du signataire'}</p>
                          <p className="text-sm text-gray-600">{signerData.phone || 'Téléphone non renseigné'}</p>
                          <p className="text-sm text-gray-600">{signerData.email || 'Email non renseigné'}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setEditingSigner(true)}
                          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded self-start flex-shrink-0"
                        >
                          Modifier le signataire
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <input
                            type="text"
                            placeholder="Ville de naissance *"
                            value={signerData.birth_city}
                            onChange={(e) => setSignerData({ ...signerData, birth_city: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.birth_city && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Date de naissance (JJ.MM.AAAA) *"
                            value={signerData.birth_date}
                            onChange={(e) => setSignerData({ ...signerData, birth_date: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.birth_date && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Modifier les informations du signataire</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom complet <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Nom et prénom"
                            value={signerData.name}
                            onChange={(e) => setSignerData({ ...signerData, name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.name && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Téléphone <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="06 12 34 56 78"
                            value={signerData.phone}
                            onChange={(e) => setSignerData({ ...signerData, phone: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.phone && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="email@exemple.com"
                            value={signerData.email}
                            onChange={(e) => setSignerData({ ...signerData, email: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.email && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ville de naissance <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ville de naissance"
                            value={signerData.birth_city}
                            onChange={(e) => setSignerData({ ...signerData, birth_city: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.birth_city && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date de naissance <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="JJ.MM.AAAA"
                            value={signerData.birth_date}
                            onChange={(e) => setSignerData({ ...signerData, birth_date: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-marlon-green ${
                              !signerData.birth_date && validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSigner(false)}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSigner(false)}
                          className="px-4 py-2 text-sm bg-marlon-green text-white rounded-lg hover:bg-marlon-green/90"
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Identity documents */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-4">Pièces justificatives</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <Icon icon="mdi:card-account-details" className="h-5 w-5 text-blue-500" />
                        Pièce d&apos;identité <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setDocuments({ ...documents, identity_front: e.target.files?.[0] || null })}
                            className="hidden"
                            id="identity_front"
                          />
                          <label
                            htmlFor="identity_front"
                            className={`flex-1 px-3 py-2 border border-dashed rounded-lg text-center cursor-pointer hover:border-marlon-green hover:bg-gray-50 ${
                              !documents.identity_front && !existingDocuments.identity_front_url && validationErrors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          >
                            {documents.identity_front ? (
                              <span className="text-marlon-green flex items-center justify-center gap-2">
                                <Icon icon="mdi:check-circle" className="h-4 w-4" />
                                {documents.identity_front.name}
                              </span>
                            ) : existingDocuments.identity_front_url ? (
                              <span className="text-marlon-green flex items-center justify-center gap-2">
                                <Icon icon="mdi:check-circle" className="h-4 w-4" />
                                Document existant ✓ (cliquez pour remplacer)
                              </span>
                            ) : (
                              'Recto (cliquez pour téléverser) *'
                            )}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setDocuments({ ...documents, identity_back: e.target.files?.[0] || null })}
                            className="hidden"
                            id="identity_back"
                          />
                          <label
                            htmlFor="identity_back"
                            className={`flex-1 px-3 py-2 border border-dashed rounded-lg text-center cursor-pointer hover:border-marlon-green hover:bg-gray-50 ${
                              !documents.identity_back && !existingDocuments.identity_back_url && validationErrors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          >
                            {documents.identity_back ? (
                              <span className="text-marlon-green flex items-center justify-center gap-2">
                                <Icon icon="mdi:check-circle" className="h-4 w-4" />
                                {documents.identity_back.name}
                              </span>
                            ) : existingDocuments.identity_back_url ? (
                              <span className="text-marlon-green flex items-center justify-center gap-2">
                                <Icon icon="mdi:check-circle" className="h-4 w-4" />
                                Document existant ✓ (cliquez pour remplacer)
                              </span>
                            ) : (
                              'Verso (cliquez pour téléverser) *'
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company info recap */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Informations de l&apos;entreprise</h3>
                  <p className="text-sm text-gray-600">Nom légal : {companyData.name}</p>
                  <p className="text-sm text-gray-600">
                    Siège social : {companyData.address}, {companyData.postal_code} {companyData.city}, {companyData.country}
                  </p>
                </div>

                {/* Company documents */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-4">Pièces justificatives</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <Icon icon="mdi:file-document" className="h-5 w-5 text-blue-500" />
                        Liasse fiscale 2035 ou dernier bilan comptable <span className="text-gray-400">(recommandé)</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => setDocuments({ ...documents, tax_liasse: e.target.files?.[0] || null })}
                        className="hidden"
                        id="tax_liasse"
                      />
                      <label
                        htmlFor="tax_liasse"
                        className="block px-3 py-2 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-marlon-green hover:bg-gray-50"
                      >
                        {documents.tax_liasse ? (
                          <span className="text-marlon-green flex items-center justify-center gap-2">
                            <Icon icon="mdi:check-circle" className="h-4 w-4" />
                            {documents.tax_liasse.name}
                          </span>
                        ) : existingDocuments.tax_liasse_url ? (
                          <span className="text-marlon-green flex items-center justify-center gap-2">
                            <Icon icon="mdi:check-circle" className="h-4 w-4" />
                            Document existant ✓ (cliquez pour remplacer)
                          </span>
                        ) : (
                          'Cliquez pour téléverser (recommandé)'
                        )}
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <Icon icon="mdi:file-chart" className="h-5 w-5 text-blue-500" />
                        Business plan <span className="text-gray-400">(recommandé)</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => setDocuments({ ...documents, business_plan: e.target.files?.[0] || null })}
                        className="hidden"
                        id="business_plan"
                      />
                      <label
                        htmlFor="business_plan"
                        className="block px-3 py-2 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-marlon-green hover:bg-gray-50"
                      >
                        {documents.business_plan ? (
                          <span className="text-marlon-green flex items-center justify-center gap-2">
                            <Icon icon="mdi:check-circle" className="h-4 w-4" />
                            {documents.business_plan.name}
                          </span>
                        ) : existingDocuments.business_plan_url ? (
                          <span className="text-marlon-green flex items-center justify-center gap-2">
                            <Icon icon="mdi:check-circle" className="h-4 w-4" />
                            Document existant ✓ (cliquez pour remplacer)
                          </span>
                        ) : (
                          'Cliquez pour téléverser (recommandé)'
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar - Summary (Desktop) */}
          <div className="hidden lg:block w-96 flex-shrink-0">
            <div className="sticky top-24">
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <h2 className="text-lg font-bold text-[#1a365d] mb-4">Récapitulatif</h2>

                {/* Products list */}
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => {
                    const product = item.products;
                    const price = prices[item.id] || calculateLocalPrice(item, selectedDuration);
                    const mainImage = product?.product_images?.sort((a, b) => a.order_index - b.order_index)[0]?.image_url;

                    return (
                      <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                          {mainImage ? (
                            <Image
                              src={mainImage}
                              alt={product?.name || 'Produit'}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">{product?.name}</p>
                          <p className="text-sm font-semibold text-marlon-green mt-1">
                            {pricesLoading ? (
                              <span className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
                            ) : (
                              <>{price.monthlyTTC.toFixed(2)} € TTC<span className="font-normal text-gray-500">/mois</span></>
                            )}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">x{item.quantity}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Duration selector */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <span className="text-sm font-medium text-[#1a365d]">Nombre de mensualités :</span>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-marlon-green"
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary box */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-3">Nombre d&apos;articles: {totals.itemCount}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-[#1a365d]">Loyer HT :</span>
                      <span className="text-gray-700">{pricesLoading ? <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse align-middle" /> : `${totals.monthlyHT.toFixed(2)} € / mois`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#1a365d]">Durée du contrat :</span>
                      <span className="text-gray-700">{selectedDuration} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-[#1a365d]">Livraison :</span>
                      <span className="text-marlon-green font-medium">Offerte</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-bold text-[#1a365d]">Loyer TTC :</span>
                      <span className="font-bold text-[#1a365d]">{pricesLoading ? <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse align-middle" /> : `${totals.monthlyTTC.toFixed(2)} € / mois`}</span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={currentStep === 3 ? handleSubmitOrder : handleNextStep}
                  disabled={submitting}
                  className="w-full py-3 bg-marlon-green text-white font-semibold rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                      Traitement...
                    </span>
                  ) : currentStep === 3 ? (
                    'Valider la commande'
                  ) : (
                    'Continuer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom summary */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
        {/* Toggle handle */}
        <button
          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          className="w-full flex flex-col items-center pt-2 pb-1"
          aria-label={isSummaryExpanded ? 'Réduire le récapitulatif' : 'Voir le récapitulatif'}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 mb-1" />
          <Icon
            icon={isSummaryExpanded ? 'mdi:chevron-down' : 'mdi:chevron-up'}
            className="h-5 w-5 text-gray-400"
          />
        </button>

        {/* Expandable content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isSummaryExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-0'
          }`}
        >
          <div className="px-4 pb-2">
            <h2 className="text-base font-bold text-[#1a365d] mb-3">Récapitulatif</h2>

            {/* Products list */}
            <div className="space-y-3 mb-4">
              {cartItems.map((item) => {
                const product = item.products;
                const price = prices[item.id] || calculateLocalPrice(item, selectedDuration);
                const mainImage = product?.product_images?.sort((a, b) => a.order_index - b.order_index)[0]?.image_url;

                return (
                  <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-100">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                      {mainImage ? (
                        <Image
                          src={mainImage}
                          alt={product?.name || 'Produit'}
                          fill
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Icon icon="mdi:image-off" className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-1">{product?.name}</p>
                      <p className="text-sm font-semibold text-marlon-green">
                        {pricesLoading ? (
                          <span className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        ) : (
                          <>{price.monthlyTTC.toFixed(2)} € TTC<span className="font-normal text-gray-500">/mois</span></>
                        )}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">x{item.quantity}</span>
                  </div>
                );
              })}
            </div>

            {/* Duration selector */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <span className="text-sm font-medium text-[#1a365d]">Mensualités :</span>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-marlon-green"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary details */}
            <div className="space-y-1.5 text-sm mb-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre d&apos;articles</span>
                <span className="text-gray-700">{totals.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loyer HT</span>
                <span className="text-gray-700">{pricesLoading ? <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse align-middle" /> : `${totals.monthlyHT.toFixed(2)} € / mois`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Livraison</span>
                <span className="text-marlon-green font-medium">Offerte</span>
              </div>
            </div>
          </div>
        </div>

        {/* Always visible: Total + CTA */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-[#1a365d]">Loyer TTC :</span>
            <span className="font-bold text-[#1a365d]">{pricesLoading ? <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse align-middle" /> : `${totals.monthlyTTC.toFixed(2)} € / mois`}</span>
          </div>
          <button
            onClick={currentStep === 3 ? handleSubmitOrder : handleNextStep}
            disabled={submitting}
            className="w-full py-3 bg-marlon-green text-white font-semibold rounded-lg hover:bg-marlon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                Traitement...
              </span>
            ) : currentStep === 3 ? (
              'Valider la commande'
            ) : (
              'Continuer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
