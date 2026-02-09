import { createServiceClient } from '../supabase/service';

interface CreateLogParams {
  organizationId: string;
  actionType: string;
  description: string;
  metadata?: any;
  userId?: string;
}

export async function createOrganizationLog({
  organizationId,
  actionType,
  description,
  metadata,
  userId,
}: CreateLogParams): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    
    await serviceClient
      .from('organization_logs')
      .insert({
        organization_id: organizationId,
        action_type: actionType,
        description,
        metadata: metadata || {},
        user_id: userId || null,
      });
  } catch (error) {
    // Log error but don't throw - we don't want log failures to break the main operation
    console.error('Failed to create organization log:', error);
  }
}
