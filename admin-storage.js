/**
 * BURGER UNIVERSITY - ADMIN STORAGE SERVICE
 * Dedicated service for secure menu image uploads, client-side compression,
 * validation, and lifecycle cleanup in Supabase Storage ('menu-images' bucket).
 */

(function (window) {
  'use strict';

  const BUCKET_NAME = 'menu-images';
  const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_WIDTH_OR_HEIGHT = 1200;

  const AdminStorage = {
    /**
     * Validates a file against allowed MIME types and 2 MB size limit.
     * @param {File} file
     * @returns {{ valid: boolean, error?: string }}
     */
    validateImageFile(file) {
      if (!file) {
        return { valid: false, error: 'No file selected. Please choose an image to upload.' };
      }

      // 1. MIME Type check
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        return {
          valid: false,
          error: `Invalid file format "${file.type || 'unknown'}". Only JPEG, PNG, and WebP images are allowed.`
        };
      }

      // 2. Maximum file size check (2 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
          valid: false,
          error: `File is too large (${sizeInMB} MB). Maximum allowed file size is 2.0 MB.`
        };
      }

      return { valid: true };
    },

    /**
     * Compresses/resizes an image file to max 1200px before uploading.
     * Uses browser-image-compression if available, with Canvas fallback.
     * @param {File} file
     * @param {function(number)} [onProgress]
     * @returns {Promise<File|Blob>}
     */
    async compressImage(file, onProgress) {
      // 1. Try browser-image-compression library if loaded
      if (typeof window.imageCompression === 'function') {
        const options = {
          maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
          maxSizeMB: 1.0,
          useWebWorker: true,
          fileType: file.type === 'image/png' ? 'image/png' : 'image/webp',
          initialQuality: 0.85,
          onProgress: onProgress || (() => {})
        };

        try {
          const compressed = await window.imageCompression(file, options);
          return compressed;
        } catch (err) {
          console.warn('[AdminStorage] browser-image-compression failed, falling back to Canvas:', err);
        }
      }

      // 2. Fallback: HTML5 Canvas resizing
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > MAX_WIDTH_OR_HEIGHT || height > MAX_WIDTH_OR_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH_OR_HEIGHT) / width);
              width = MAX_WIDTH_OR_HEIGHT;
            } else {
              width = Math.round((width * MAX_WIDTH_OR_HEIGHT) / height);
              height = MAX_WIDTH_OR_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: outputType }));
              } else {
                resolve(file); // fallback to original if canvas toBlob fails
              }
            },
            outputType,
            0.85
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image for client-side compression.'));
        };

        img.src = objectUrl;
      });
    },

    /**
     * Determines the appropriate file extension based on MIME type.
     * @param {string} mimeType
     * @returns {string}
     */
    getFileExtension(mimeType) {
      switch (mimeType.toLowerCase()) {
        case 'image/png':
          return 'png';
        case 'image/webp':
          return 'webp';
        case 'image/jpeg':
        case 'image/jpg':
        default:
          return 'jpg';
      }
    },

    /**
     * Extracts the relative object path from a Supabase Storage public URL.
     * Example: https://.../storage/v1/object/public/menu-images/dish-uuid.webp -> dish-uuid.webp
     * @param {string} url
     * @returns {string|null}
     */
    extractPathFromUrl(url) {
      if (!url || typeof url !== 'string') return null;
      const marker = `/${BUCKET_NAME}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return null;
      // Strip any query parameters
      const pathWithQuery = url.substring(idx + marker.length);
      return pathWithQuery.split('?')[0];
    },

    /**
     * Uploads an image to the 'menu-images' Supabase storage bucket.
     * Generates a collision-resistant UUID filename so user file names are never exposed.
     * @param {File} file - Raw input file from user
     * @param {function(string)} [progressCallback] - Callback for status updates
     * @returns {Promise<{ publicUrl: string, path: string }>}
     */
    async uploadMenuImage(file, progressCallback) {
      // 1. Verify admin privilege
      if (!window.AdminAuth || !window.AdminAuth.isAdmin()) {
        throw new Error('Unauthorized: You must be logged in as an administrator to upload images.');
      }

      const supabase = window.AdminAuth.client;
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }

      // 2. Validate format and size
      if (progressCallback) progressCallback('Validating file format and size...');
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 3. Compress image before uploading
      if (progressCallback) progressCallback('Optimizing image in browser (max 1200px)...');
      let uploadFile;
      try {
        uploadFile = await this.compressImage(file);
      } catch (err) {
        console.warn('[AdminStorage] Compression issue, using original:', err);
        uploadFile = file;
      }

      // 4. Generate unique collision-proof filename using crypto.randomUUID()
      const ext = this.getFileExtension(uploadFile.type || file.type);
      const uniqueFileName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = uniqueFileName;

      // 5. Upload to Supabase Storage
      if (progressCallback) progressCallback('Uploading to Supabase Storage...');
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, uploadFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: uploadFile.type || file.type
        });

      if (error) {
        // Human-friendly error translation
        if (error.statusCode === '403' || error.message.includes('row-level security') || error.message.includes('policy')) {
          throw new Error('Storage permission denied. Please verify your admin role and bucket policies.');
        } else if (error.message.includes('Bucket not found') || error.statusCode === '404') {
          throw new Error('Storage bucket "menu-images" was not found. Please run the setup SQL first.');
        }
        throw new Error(error.message || 'Upload failed.');
      }

      // 6. Retrieve public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to generate public URL for the uploaded image.');
      }

      return {
        publicUrl: urlData.publicUrl,
        path: storagePath
      };
    },

    /**
     * Deletes an image from the 'menu-images' bucket if it resides in Supabase storage.
     * Gracefully ignores external URLs (e.g. Google Usercontent or Unsplash).
     * @param {string} imageUrlOrPath
     * @returns {Promise<boolean>}
     */
    async deleteMenuImage(imageUrlOrPath) {
      if (!imageUrlOrPath) return false;

      // Extract relative path inside bucket if full URL passed
      let path = imageUrlOrPath;
      if (imageUrlOrPath.startsWith('http://') || imageUrlOrPath.startsWith('https://')) {
        path = this.extractPathFromUrl(imageUrlOrPath);
      }

      // If it doesn't belong to menu-images bucket, skip deletion
      if (!path) {
        return false;
      }

      const supabase = window.AdminAuth && window.AdminAuth.client;
      if (!supabase) return false;

      try {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([path]);

        if (error) {
          console.warn('[AdminStorage] Could not remove old image from bucket:', error);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('[AdminStorage] Error deleting image:', err);
        return false;
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.AdminStorage = AdminStorage;
  }

})(typeof window !== 'undefined' ? window : globalThis);
