import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const buckets = [
  {
    id: 'product-images',
    name: 'product-images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    id: 'category-images',
    name: 'category-images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    id: 'contracts',
    name: 'contracts',
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['application/pdf'],
  },
  {
    id: 'invoices',
    name: 'invoices',
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    id: 'static-assets',
    name: 'static-assets',
    public: true,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/x-icon', 'image/jpeg'],
  },
];

export async function POST() {
  try {
    const supabase = createServiceClient();
    const results: any[] = [];

    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json(
        { error: `Error listing buckets: ${listError.message}` },
        { status: 500 }
      );
    }

    const existingBucketIds = existingBuckets?.map(b => b.id) || [];

    // Create buckets
    for (const bucket of buckets) {
      if (existingBucketIds.includes(bucket.id)) {
        results.push({
          bucket: bucket.id,
          status: 'exists',
          message: 'Bucket already exists',
        });
        continue;
      }

      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (error) {
        results.push({
          bucket: bucket.id,
          status: 'error',
          message: error.message,
        });
      } else {
        results.push({
          bucket: bucket.id,
          status: 'created',
          message: `Bucket created successfully (public: ${bucket.public})`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Bucket creation process completed',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
