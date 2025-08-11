import { upload, deleteImage, getPublicIdFromUrl } from '@/utils/cloudinary';

// Generic image upload handler
export const handleSingleImageUpload = async (
  req: any,
  currentImageUrl?: string
): Promise<string> => {
  if (!req.file) {
    throw new Error('No image file provided');
  }

  // Delete old image if exists
  if (currentImageUrl) {
    const oldPublicId = getPublicIdFromUrl(currentImageUrl);
    await deleteImage(oldPublicId);
  }

  // Return new image URL
  return req.file.path || req.file.location || req.file.secure_url || '';
};

// Optional image upload handler (supports single or multiple images)
export const handleOptionalImageUpload = async (
  req: any,
  currentImageUrl?: string | string[],
  multiple: boolean = false
): Promise<string | string[] | undefined> => {
  if (multiple) {
    // Handle multiple images
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return undefined;
    }

    // Delete old images if exists and we're replacing them
    if (currentImageUrl && Array.isArray(currentImageUrl)) {
      for (const imageUrl of currentImageUrl) {
        const oldPublicId = getPublicIdFromUrl(imageUrl);
        await deleteImage(oldPublicId);
      }
    }

    // Return new image URLs
    return req.files.map((file: any) => file.path || file.location || file.secure_url || '');
  } else {
    // Handle single image
    if (!req.file) {
      return undefined;
    }

    // Delete old image if exists and we're replacing it
    if (currentImageUrl && typeof currentImageUrl === 'string') {
      const oldPublicId = getPublicIdFromUrl(currentImageUrl);
      await deleteImage(oldPublicId);
    }

    // Return new image URL
    return req.file.path || req.file.location || req.file.secure_url || '';
  }
};

// Delete image helper
export const deleteImageFromUrl = async (imageUrl?: string): Promise<void> => {
  if (imageUrl) {
    const publicId = getPublicIdFromUrl(imageUrl);
    await deleteImage(publicId);
  }
};

// Get upload middleware for testimonials (optional)
export const getTestimonialUploadMiddleware = () => {
  return (req: any, res: any, next: any) => {
    const singleUpload = upload.testimonial.single('image');

    // Use optional upload - don't fail if no file
    singleUpload(req, res, (err: any) => {
      // Only pass errors that aren't "no file" errors
      if (err && err.code !== 'LIMIT_UNEXPECTED_FILE') {
        return next(err);
      }
      // Continue even if no file was uploaded
      next();
    });
  };
};

// Get upload middleware for reviews (supports multiple images)
export const getReviewUploadMiddleware = () => {
  return (req: any, res: any, next: any) => {
    const multipleUpload = upload.review.array('images', 5); // Allow up to 5 images

    // Use optional upload - don't fail if no file
    multipleUpload(req, res, (err: any) => {
      // Only pass errors that aren't "no file" errors
      if (err && err.code !== 'LIMIT_UNEXPECTED_FILE') {
        return next(err);
      }
      // Continue even if no files were uploaded
      next();
    });
  };
};

// Get upload middleware for homepage
export const getHomepageUploadMiddleware = () => {
  return upload.homepage.any();
};
