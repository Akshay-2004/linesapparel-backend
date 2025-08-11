import { IHomepageData } from '@/types/homepage.types';
import { deleteImage, getPublicIdFromUrl } from '@/utils/cloudinary';

// Handle homepage image uploads
export const handleHomepageImageUploads = async (
  data: IHomepageData,
  files: any,
  oldData?: any
): Promise<IHomepageData> => {
  const updatedData = { ...data };

  // Convert files array to object for easier access
  const filesMap: Record<string, any> = {};
  if (Array.isArray(files)) {
    files.forEach((file: any) => {
      if (!filesMap[file.fieldname]) {
        filesMap[file.fieldname] = [];
      }
      filesMap[file.fieldname].push(file);
    });
  } else {
    Object.assign(filesMap, files);
  }

  // Handle hero slides images
  if (updatedData.hero?.slides) {
    for (let i = 0; i < updatedData.hero.slides.length; i++) {
      const fieldName = `hero_slide_${i}`;
      if (filesMap[fieldName] && filesMap[fieldName][0]) {
        // Delete old image if exists
        if (oldData?.hero?.slides?.[i]?.imageUrl) {
          const oldPublicId = getPublicIdFromUrl(oldData.hero.slides[i].imageUrl);
          await deleteImage(oldPublicId);
        }
        // Use the correct property for Cloudinary URL
        const imageUrl = filesMap[fieldName][0].path || filesMap[fieldName][0].location || filesMap[fieldName][0].secure_url;
        updatedData.hero.slides[i].imageUrl = imageUrl;
      }
    }
  }

  // Handle fashion banners images
  if (updatedData.fashion?.banners) {
    for (let i = 0; i < updatedData.fashion.banners.length; i++) {
      const fieldName = `fashion_banner_${i}`;
      if (filesMap[fieldName] && filesMap[fieldName][0]) {
        // Delete old image if exists
        if (oldData?.fashion?.banners?.[i]?.imageUrl) {
          const oldPublicId = getPublicIdFromUrl(oldData.fashion.banners[i].imageUrl);
          await deleteImage(oldPublicId);
        }
        // Use the correct property for Cloudinary URL
        const imageUrl = filesMap[fieldName][0].path || filesMap[fieldName][0].location || filesMap[fieldName][0].secure_url;
        updatedData.fashion.banners[i].imageUrl = imageUrl;
      }
    }
  }

  // Handle banner images
  for (let i = 0; i < (updatedData.banners?.length || 0); i++) {
    const fieldName = `banner_${i}`;
    if (filesMap[fieldName] && filesMap[fieldName][0] && updatedData.banners[i]) {
      if (oldData?.banners?.[i]?.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(oldData.banners[i].imageUrl);
        await deleteImage(oldPublicId);
      }
      // Use the correct property for Cloudinary URL
      const imageUrl = filesMap[fieldName][0].path || filesMap[fieldName][0].location || filesMap[fieldName][0].secure_url;
      updatedData.banners[i].imageUrl = imageUrl;
    }
  }
  return updatedData;
};

// Delete homepage images
export const deleteHomepageImages = async (data: IHomepageData): Promise<void> => {
  try {
    // Delete hero slides images
    if (data.hero?.slides) {
      for (const slide of data.hero.slides) {
        if (slide.imageUrl) {
          const publicId = getPublicIdFromUrl(slide.imageUrl);
          await deleteImage(publicId);
        }
      }
    }

    // Delete fashion banners images
    if (data.fashion?.banners) {
      for (const banner of data.fashion.banners) {
        if (banner.imageUrl) {
          const publicId = getPublicIdFromUrl(banner.imageUrl);
          await deleteImage(publicId);
        }
      }
    }

    // Delete banner images
    if (data.banners) {
      for (const banner of data.banners) {
        if (banner.imageUrl) {
          const publicId = getPublicIdFromUrl(banner.imageUrl);
          await deleteImage(publicId);
        }
      }
    }
  } catch (error) {
    console.error('Error deleting homepage images:', error);
  }
};
