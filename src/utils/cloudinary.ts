import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// Homepage images storage configuration
const homepageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shopify-ui/homepage",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ],
    resource_type: "image",
    public_id: (req: any, file: any) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
  } as any,
});

const homepageUploadMiddleware = multer({
  storage: homepageStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, callback) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"));
    }
  },
});

// Testimonial images storage configuration
const testimonialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shopify-ui/testimonials",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ],
    resource_type: "image",
    public_id: (req: any, file: any) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
      { width: 400, height: 400, crop: "fill" }, // Square format for testimonial avatars
    ],
  } as any,
});

const testimonialUploadMiddleware = multer({
  storage: testimonialStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, callback) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"));
    }
  },
});

// Review images storage configuration
const reviewStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shopify-ui/reviews",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ],
    resource_type: "image",
    public_id: (req: any, file: any) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
      { width: 800, height: 600, crop: "limit" }, // Limit size for review images
    ],
  } as any,
});

const reviewUploadMiddleware = multer({
  storage: reviewStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, callback) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"));
    }
  },
});

// Legal documents storage configuration
const legalDocumentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shopify-ui/legal-documents",
    resource_type: "raw", // Use 'raw' for non-image files
    public_id: (req: any, file: any) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    // Remove allowed_formats for raw files - Cloudinary doesn't use this for raw uploads
  } as any,
});

const legalDocumentUploadMiddleware = multer({
  storage: legalDocumentStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, callback) => {
    // Allow document files - be more permissive with markdown files
    const allowedMimeTypes = [
      "text/markdown",
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream" // Some browsers send .md files as this
    ];
    
    // Check by file extension for markdown files
    const isMarkdownFile = file.originalname.toLowerCase().endsWith('.md');
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
    
    if (isMarkdownFile || isMimeTypeAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Only document files (MD, TXT, PDF, DOC, DOCX) are allowed"));
    }
  },
});

// Homepage image uploads with multiple fields support
export const upload = {
  homepage: {
    single: (fieldName: string) => homepageUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 10) => {
      return (req: any, res: any, next: any) => {
        homepageUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err: any) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${
                    MAX_FILE_SIZE / 1024 / 1024
                  }MB.`,
                  error: "FILE_TOO_LARGE",
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR",
              });
            }
            next();
          }
        );
      };
    },
    any: () => {
      return (req: any, res: any, next: any) => {
        homepageUploadMiddleware.any()(req, res, (err: any) => {
          if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res.status(413).json({
                success: false,
                message: `File size too large. Maximum allowed size is ${
                  MAX_FILE_SIZE / 1024 / 1024
                }MB.`,
                error: "FILE_TOO_LARGE",
              });
            }
            return res.status(400).json({
              success: false,
              message: err.message,
              error: "UPLOAD_ERROR",
            });
          }
          next();
        });
      };
    },
    fields: (fields: { name: string; maxCount?: number }[]) => {
      return (req: any, res: any, next: any) => {
        homepageUploadMiddleware.fields(fields)(req, res, (err: any) => {
          if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res.status(413).json({
                success: false,
                message: `File size too large. Maximum allowed size is ${
                  MAX_FILE_SIZE / 1024 / 1024
                }MB.`,
                error: "FILE_TOO_LARGE",
              });
            }
            return res.status(400).json({
              success: false,
              message: err.message,
              error: "UPLOAD_ERROR",
            });
          }
          next();
        });
      };
    },
    optional: (fieldName: string) => (req: any, res: any, next: any) => {
      if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
        return next();
      }

      homepageUploadMiddleware.single(fieldName)(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ message: err.message });
        }
        next();
      });
    },
  },
  testimonial: {
    single: (fieldName: string) => testimonialUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 10) => {
      return (req: any, res: any, next: any) => {
        testimonialUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err: any) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${
                    MAX_FILE_SIZE / 1024 / 1024
                  }MB.`,
                  error: "FILE_TOO_LARGE",
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR",
              });
            }
            next();
          }
        );
      };
    },
  },
  review: {
    single: (fieldName: string) => reviewUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        reviewUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err: any) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${
                    MAX_FILE_SIZE / 1024 / 1024
                  }MB.`,
                  error: "FILE_TOO_LARGE",
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR",
              });
            }
            next();
          }
        );
      };
    },
  },
  legalDocument: {
    single: (fieldName: string) => legalDocumentUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        legalDocumentUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err: any) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${
                    MAX_FILE_SIZE / 1024 / 1024
                  }MB.`,
                  error: "FILE_TOO_LARGE",
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR",
              });
            }
            next();
          }
        );
      };
    },
    optional: (fieldName: string) => (req: any, res: any, next: any) => {
      if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
        return next();
      }

      legalDocumentUploadMiddleware.single(fieldName)(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ 
            success: false,
            message: err.message 
          });
        }
        next();
      });
    },
  },
};

// For backward compatibility
export const single = (fieldName: string) =>
  homepageUploadMiddleware.single(fieldName);
export const array = (fieldName: string, maxCount: number = 10) =>
  homepageUploadMiddleware.array(fieldName, maxCount);

export const deleteImage = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Error handling without logging
  }
};

export const getPublicIdFromUrl = (url: string) => {
  const splits = url.split("/");
  const filename = splits[splits.length - 1] || "";
  
  // Determine folder based on URL path
  let folderPath = "shopify-ui/homepage/";
  if (url.includes("/testimonials/")) {
    folderPath = "shopify-ui/testimonials/";
  } else if (url.includes("/legal-documents/")) {
    folderPath = "shopify-ui/legal-documents/";
  } else if (url.includes("/reviews/")) {
    folderPath = "shopify-ui/reviews/";
  }
  
  return `${folderPath}${filename.split(".")[0]}`;
};
