'use client';

import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  bucket?: string;
  maxImages?: number;
  label?: string;
}

export default function ImageUpload({
  images = [],
  onChange,
  bucket = 'product-images',
  maxImages = 10,
  label,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Vous ne pouvez pas ajouter plus de ${maxImages} images`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} n'est pas une image valide`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} est trop volumineux (max 5MB)`);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase Storage
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', filePath);
        formData.append('bucket', bucket);

        const response = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de l\'upload');
        }

        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload des images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-2">
      <div>
        {label && (
          <label className="mb-1 block text-xs font-medium text-black">
            {label}
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="h-20 w-20 overflow-hidden rounded-md border border-gray-300 bg-gray-100">
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Icon icon="mdi:close" className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-white text-gray-400 transition-colors hover:border-marlon-green hover:text-marlon-green disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                  <span className="mt-1 text-[10px]">Upload...</span>
                </>
              ) : (
                <>
                  <Icon icon="mdi:plus" className="h-5 w-5" />
                  <span className="mt-1 text-[10px]">Ajouter</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
        <p className="mt-1 text-[10px] text-gray-500">
          {images.length}/{maxImages} images • JPG, PNG, GIF • Max 5MB
        </p>
      </div>
    </div>
  );
}
