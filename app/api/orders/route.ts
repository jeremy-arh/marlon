import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recalculateOrderPrices } from '@/lib/utils/pricing';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cartId, durationMonths, documentUrls, deliveryAddress, signerData } = body;

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userRole) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Get cart items
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select(`
        *,
        products(
          id,
          purchase_price_ht,
          marlon_margin_percent,
          default_leaser_id
        )
      `)
      .eq('cart_id', cartId);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Get default leaser (using first product's default leaser)
    const defaultLeaserId = cartItems[0].products.default_leaser_id;
    if (!defaultLeaserId) {
      return NextResponse.json(
        { error: 'No default leaser found for products' },
        { status: 400 }
      );
    }

    // Calculate initial total to find tranche
    let initialTotal = 0;
    const orderItemsData = cartItems.map((item) => {
      const purchasePrice = parseFloat(item.products.purchase_price_ht.toString());
      const margin = parseFloat(item.products.marlon_margin_percent.toString());
      const sellingPrice = purchasePrice * (1 + margin / 100);
      const itemTotal = sellingPrice * item.quantity;
      initialTotal += itemTotal;

      return {
        productId: item.products.id,
        purchasePrice,
        marginPercent: margin,
        quantity: item.quantity,
      };
    });

    // Recalculate prices based on total amount (uses default coefficients if not found in DB)
    const recalculatedItems = await recalculateOrderPrices(
      orderItemsData,
      initialTotal,
      defaultLeaserId,
      durationMonths
    );

    // Calculate final total (calculatedPrice already includes quantity)
    const finalTotal = recalculatedItems.reduce(
      (sum, item) => sum + item.calculatedPrice,
      0
    );

    // Handle delivery address
    let deliveryAddressId = null;
    
    // If it's an existing address (not a temp one), use it
    if (deliveryAddress?.id && !deliveryAddress.id.startsWith('temp-') && deliveryAddress.id !== 'org-default') {
      deliveryAddressId = deliveryAddress.id;
    }
    // If it's a new address (temp id) or org-default, save it first
    else if (deliveryAddress) {
      const { data: newAddress, error: addressError } = await supabase
        .from('delivery_addresses')
        .insert({
          organization_id: userRole.organization_id,
          name: deliveryAddress.name,
          address: deliveryAddress.address,
          city: deliveryAddress.city,
          postal_code: deliveryAddress.postal_code,
          country: deliveryAddress.country || 'France',
          contact_name: deliveryAddress.contact_name || null,
          contact_phone: deliveryAddress.contact_phone || null,
          instructions: deliveryAddress.instructions || null,
        })
        .select()
        .single();

      if (!addressError && newAddress) {
        deliveryAddressId = newAddress.id;
      }
    }

    // Create order with delivery address data
    const orderData: Record<string, any> = {
      organization_id: userRole.organization_id,
      user_id: user.id,
      status: 'pending',
      total_amount_ht: finalTotal,
      leasing_duration_months: durationMonths,
      leaser_id: defaultLeaserId,
    };

    // Add delivery address reference
    if (deliveryAddressId) {
      orderData.delivery_address_id = deliveryAddressId;
    }

    // Also store delivery info directly on order for historical purposes
    if (deliveryAddress) {
      orderData.delivery_name = deliveryAddress.name;
      orderData.delivery_address = deliveryAddress.address;
      orderData.delivery_city = deliveryAddress.city;
      orderData.delivery_postal_code = deliveryAddress.postal_code;
      orderData.delivery_country = deliveryAddress.country || 'France';
      orderData.delivery_contact_name = deliveryAddress.contact_name || null;
      orderData.delivery_contact_phone = deliveryAddress.contact_phone || null;
      orderData.delivery_instructions = deliveryAddress.instructions || null;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error('Failed to create order');
    }

    // Create order items - one per unit instead of grouping by quantity
    const orderItemsInsert: any[] = [];
    recalculatedItems.forEach((item) => {
      // Calculate price per unit (calculatedPrice includes quantity)
      const pricePerUnit = item.calculatedPrice / item.quantity;
      
      // Create one order_item per unit
      for (let i = 0; i < item.quantity; i++) {
        orderItemsInsert.push({
          order_id: order.id,
          product_id: item.productId,
          quantity: 1, // Each order_item represents a single unit
          purchase_price_ht: item.purchasePrice,
          margin_percent: item.marginPercent,
          calculated_price_ht: pricePerUnit, // Price per unit
          coefficient_used: item.coefficient,
        });
      }
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsInsert);

    if (itemsError) {
      throw itemsError;
    }

    // Create order tracking with document URLs
    const trackingData: Record<string, any> = {
      order_id: order.id,
      financing_status: 'pending',
      delivery_status: 'pending',
      contract_status: 'pending',
    };

    // Add document URLs if provided
    if (documentUrls) {
      if (documentUrls.identity_card_front_url) {
        trackingData.identity_card_front_url = documentUrls.identity_card_front_url;
      }
      if (documentUrls.identity_card_back_url) {
        trackingData.identity_card_back_url = documentUrls.identity_card_back_url;
      }
      if (documentUrls.tax_liasse_url) {
        trackingData.tax_liasse_url = documentUrls.tax_liasse_url;
      }
      if (documentUrls.business_plan_url) {
        trackingData.business_plan_url = documentUrls.business_plan_url;
      }
    }

    const { error: trackingError } = await supabase
      .from('order_tracking')
      .insert(trackingData);

    if (trackingError) {
      console.error('Error creating order tracking:', trackingError);
      // Don't throw - order is already created
    }

    // Save signer information to organization for future use
    if (signerData || documentUrls) {
      const organizationUpdate: Record<string, any> = {};
      
      if (signerData?.phone) {
        organizationUpdate.signer_phone = signerData.phone;
      }
      if (signerData?.birth_city) {
        organizationUpdate.signer_birth_city = signerData.birth_city;
      }
      if (signerData?.birth_date) {
        // Convert DD.MM.YYYY to YYYY-MM-DD format
        const dateParts = signerData.birth_date.split('.');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          organizationUpdate.signer_birth_date = `${year}-${month}-${day}`;
        }
      }
      if (documentUrls?.identity_card_front_url) {
        organizationUpdate.signer_identity_card_front_url = documentUrls.identity_card_front_url;
      }
      if (documentUrls?.identity_card_back_url) {
        organizationUpdate.signer_identity_card_back_url = documentUrls.identity_card_back_url;
      }
      if (documentUrls?.tax_liasse_url) {
        organizationUpdate.signer_tax_liasse_url = documentUrls.tax_liasse_url;
      }
      if (documentUrls?.business_plan_url) {
        organizationUpdate.signer_business_plan_url = documentUrls.business_plan_url;
      }

      if (Object.keys(organizationUpdate).length > 0) {
        await supabase
          .from('organizations')
          .update(organizationUpdate)
          .eq('id', userRole.organization_id);
      }
    }

    // Create initial status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        new_status: 'pending',
        changed_by: user.id,
      });

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userRole) {
      return NextResponse.json({ orders: [] });
    }

    // Get orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', userRole.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
