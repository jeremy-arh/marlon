/**
 * Script to create Supabase Storage buckets
 * Run this script using Node.js after setting up your Supabase project
 * 
 * Usage:
 *   node scripts/create-storage-buckets.js
 * 
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

async function createBuckets() {
  console.log('Creating Supabase Storage buckets...\n');

  for (const bucket of buckets) {
    try {
      // Check if bucket already exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`Error listing buckets: ${listError.message}`);
        continue;
      }

      const bucketExists = existingBuckets?.some(b => b.id === bucket.id);

      if (bucketExists) {
        console.log(`✓ Bucket "${bucket.id}" already exists, skipping...`);
        continue;
      }

      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (error) {
        console.error(`✗ Error creating bucket "${bucket.id}": ${error.message}`);
      } else {
        console.log(`✓ Created bucket "${bucket.id}" (public: ${bucket.public})`);
      }
    } catch (error) {
      console.error(`✗ Unexpected error creating bucket "${bucket.id}": ${error.message}`);
    }
  }

  console.log('\nDone!');
  console.log('\nNext steps:');
  console.log('1. Apply the storage policies migration: supabase/migrations/008_storage_policies.sql');
  console.log('2. Upload your logo and favicon to the static-assets bucket');
}

createBuckets().catch(console.error);
