import { createServiceClient } from '../supabase/service';

interface CreateLogParams {
  orderId: string;
  actionType: string;
  description: string;
  metadata?: any;
  userId?: string;
}

export async function createOrderLog({
  orderId,
  actionType,
  description,
  metadata,
  userId,
}: CreateLogParams): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    
    await serviceClient
      .from('order_logs')
      .insert({
        order_id: orderId,
        action_type: actionType,
        description,
        metadata: metadata || {},
        user_id: userId || null,
      });
  } catch (error) {
    // Log error but don't throw - we don't want log failures to break the main operation
    console.error('Failed to create order log:', error);
  }
}
