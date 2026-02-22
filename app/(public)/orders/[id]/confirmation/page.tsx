import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ViewOrdersButton from './ViewOrdersButton';

export default async function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        products:product_id(name, reference)
      )
    `)
    .eq('id', params.id)
    .single();

  if (!order) {
    redirect('/orders');
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-lg mx-auto text-center px-6 py-12">
        <div className="w-20 h-20 rounded-full bg-marlon-green/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-marlon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-[#1a365d] mb-4">
          Commande confirmée !
        </h1>
        
        <p className="text-gray-600 mb-2">
          Votre commande <span className="font-semibold">#{order.id.slice(0, 8)}</span> a été enregistrée avec succès.
        </p>
        
        <p className="text-gray-600 mb-8">
          Vous recevrez un email de confirmation avec les détails de votre commande.
          Notre équipe va étudier votre dossier et reviendra vers vous rapidement.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
          <h2 className="font-semibold text-[#1a365d] mb-4">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Durée du contrat</span>
              <span className="font-medium">{order.leasing_duration_months} mois</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre d'articles</span>
              <span className="font-medium">{order.order_items?.length || 0}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Montant total HT</span>
              <span className="font-semibold text-marlon-green">
                {parseFloat(order.total_amount_ht).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ViewOrdersButton />
          <Link
            href="/catalog"
            className="block w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Retour au catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
