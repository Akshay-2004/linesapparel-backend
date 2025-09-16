import { Request, Response } from 'express';
import { Page } from '@/models/page.model';
import { IHomepageData } from '@/types/homepage.types';
import { 
  handleHomepageImageUploads, 
  deleteHomepageImages 
} from '@/utils/homepage.helpers';
import { getHomepageUploadMiddleware } from '@/utils/imageUpload.helpers';
import { upload } from '@/utils/cloudinary';
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Create a new page
export const createPage = async (req: Request, res: Response) => {
  try {
    const { name, path, data } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const newPage = new Page({
      name,
      path,
      data,
      createdBy: userId,
      updatedBy: userId
    });

    const savedPage = await newPage.save();
    
    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      data: savedPage
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Page with this path already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating page',
      error: error.message
    });
  }
};

// Get all pages
export const getAllPages = async (req: Request, res: Response) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    
    const filter: any = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const pages = await Page.find(filter)
      .populate('createdBy updatedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Page.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        pages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pages',
      error: error.message
    });
  }
};

// Get page by ID or path
export const getPage = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    const page = await Page.findOne({
      $or: [
        { _id: identifier },
        { path: identifier }
      ]
    }).populate('createdBy updatedBy', 'name email');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: page
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching page',
      error: error.message
    });
  }
};

// Update page with image upload handling
export const updatePage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let { name, path, data, isActive } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Parse JSON data if it's a string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON data format'
        });
      }
    }

    // Handle image uploads using helper
    let updatedData = data;
    if (data && req.files) {
      updatedData = await handleHomepageImageUploads(data as IHomepageData, req.files as any, page.data);
    }

    const updateFields: any = {
      updatedBy: userId,
      version: page.version + 1
    };

    if (name !== undefined) updateFields.name = name;
    if (path !== undefined) updateFields.path = path;
    if (updatedData !== undefined) updateFields.data = updatedData;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updatedPage = await Page.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('createdBy updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Page updated successfully',
      data: updatedPage
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Page with this path already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating page',
      error: error.message
    });
  }
};

// Delete page
export const deletePage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Delete associated images using helper
    await deleteHomepageImages(page.data as IHomepageData);

    await Page.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting page',
      error: error.message
    });
  }
};

// Homepage-specific CRUD operations

// Get homepage (public route)
export const getHomepage = async (req: Request, res: Response) => {
  try {
    const homepage = await Page.findOne({ path: '/homepage' })
      .populate('createdBy updatedBy', 'name email');

    if (!homepage) {
      return res.status(404).json({
        success: false,
        message: 'Homepage not found'
      });
    }

    res.status(200).json({
      success: true,
      data: homepage
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching homepage',
      error: error.message
    });
  }
};

// Create homepage
export const createHomepage = async (req: Request, res: Response) => {
  try {
    let { data } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if homepage already exists
    const existingHomepage = await Page.findOne({ path: '/homepage' });
    if (existingHomepage) {
      return res.status(409).json({
        success: false,
        message: 'Homepage already exists. Use update endpoint to modify it.'
      });
    }

    // Parse JSON data if it's a string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON data format'
        });
      }
    }

    // Handle image uploads using helper
    let homepageData = data;
    if (data && req.files) {
      homepageData = await handleHomepageImageUploads(data as IHomepageData, req.files as any);
    }

    const newHomepage = new Page({
      name: 'Homepage',
      path: '/homepage',
      data: homepageData,
      createdBy: userId,
      updatedBy: userId
    });

    const savedHomepage = await newHomepage.save();
    
    res.status(201).json({
      success: true,
      message: 'Homepage created successfully',
      data: savedHomepage
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating homepage',
      error: error.message
    });
  }
};

// Update homepage
export const updateHomepage = async (req: Request, res: Response) => {
  try {
    let { data, isActive } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const homepage = await Page.findOne({ path: '/homepage' });
    if (!homepage) {
      return res.status(404).json({
        success: false,
        message: 'Homepage not found. Create it first.'
      });
    }

    // Parse JSON data if it's a string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON data format'
        });
      }
    }

    // Handle image uploads using helper
    let updatedData = data;
    if (data && req.files) {
      updatedData = await handleHomepageImageUploads(data as IHomepageData, req.files as any, homepage.data);
    }

    const updateFields: any = {
      updatedBy: userId,
      version: homepage.version + 1
    };

    if (updatedData !== undefined) updateFields.data = updatedData;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updatedHomepage = await Page.findOneAndUpdate(
      { path: '/homepage' },
      updateFields,
      { new: true, runValidators: true }
    ).populate('createdBy updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Homepage updated successfully',
      data: updatedHomepage
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating homepage',
      error: error.message
    });
  }
};

// Delete homepage
export const deleteHomepage = async (req: Request, res: Response) => {
  try {
    const homepage = await Page.findOne({ path: '/homepage' });
    if (!homepage) {
      return res.status(404).json({
        success: false,
        message: 'Homepage not found'
      });
    }

    // Delete associated images using helper
    await deleteHomepageImages(homepage.data as IHomepageData);

    await Page.findOneAndDelete({ path: '/homepage' });

    res.status(200).json({
      success: true,
      message: 'Homepage deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting homepage',
      error: error.message
    });
  }
};

// Legal page types
const LEGAL_PAGE_TYPES = {
  PRIVACY_POLICY: '/legal/privacy-policy',
  TERMS_OF_SERVICE: '/legal/terms-of-service',
  COOKIE_POLICY: '/legal/cookie-policy',
  REFUND_POLICY: '/legal/refund-policy',
  SHIPPING_POLICY: '/legal/shipping-policy'
} as const;

// Get all legal pages (public route)
export const getAllLegalPages = async (req: Request, res: Response) => {
  try {
    const legalPages = await Page.find({
      path: { $regex: '^/legal/' }
    })
      .populate('createdBy updatedBy', 'name email')
      .sort({ path: 1 });

    res.status(200).json({
      success: true,
      data: legalPages
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching legal pages',
      error: error.message
    });
  }
};

// Get specific legal page by type (public route)
export const getLegalPageByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    
    // Validate legal page type
    const validTypes = Object.keys(LEGAL_PAGE_TYPES).map(key => 
      key.toLowerCase().replace(/_/g, '-')
    );
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid legal page type'
      });
    }

    const path = `/legal/${type}`;
    const legalPage = await Page.findOne({ path })
      .populate('createdBy updatedBy', 'name email');

    if (!legalPage) {
      return res.status(404).json({
        success: false,
        message: 'Legal page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: legalPage
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching legal page',
      error: error.message
    });
  }
};

// Create or update legal page
export const createOrUpdateLegalPage = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    let { data, isActive } = req.body;
    const userId = (req as any).user?.id;
    const uploadedFile = req.file;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate legal page type
    const validTypes = Object.keys(LEGAL_PAGE_TYPES).map(key => 
      key.toLowerCase().replace(/_/g, '-')
    );
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid legal page type'
      });
    }

    const path = `/legal/${type}`;
    const pageName = type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    // Parse JSON data if it's a string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON data format'
        });
      }
    }

    // Initialize data object if not provided
    if (!data) {
      data = {};
    }

    // Check if legal page already exists
    const existingPage = await Page.findOne({ path });

    // For new pages, require markdown file
    if (!existingPage && !uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'Markdown file is required for new legal pages'
      });
    }

    // Process markdown file if provided
    if (uploadedFile) {
      try {
        // Read the uploaded Markdown content
        let markdownContent = '';
        let fileUrl = '';
        
        // Handle different Cloudinary response formats
        if ((uploadedFile as any).secure_url) {
          // Standard Cloudinary response with secure_url
          fileUrl = (uploadedFile as any).secure_url;
          try {
            const response = await axios.get(fileUrl);
            markdownContent = response.data;
          } catch (fetchError) {
            throw new Error('Failed to fetch file content from Cloudinary');
          }
        } else if ((uploadedFile as any).url) {
          // Alternative Cloudinary response with url
          fileUrl = (uploadedFile as any).url;
          try {
            const response = await axios.get(fileUrl);
            markdownContent = response.data;
          } catch (fetchError) {
            throw new Error('Failed to fetch file content from Cloudinary');
          }
        } else if ((uploadedFile as any).path && (uploadedFile as any).path.startsWith('http')) {
          // Some configurations use 'path' for the Cloudinary URL
          fileUrl = (uploadedFile as any).path;
          try {
            const response = await axios.get(fileUrl);
            markdownContent = response.data;
          } catch (fetchError) {
            throw new Error('Failed to fetch file content from Cloudinary');
          }
        } else if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
          // Fallback to local file if available
          markdownContent = fs.readFileSync(uploadedFile.path, 'utf8');
          // For local files, we might not have a URL yet
          fileUrl = `local://${uploadedFile.path}`;
        } else if (uploadedFile.buffer) {
          // If file is in buffer
          markdownContent = uploadedFile.buffer.toString('utf8');
          fileUrl = 'buffer://uploaded-file';
        } else {
          return res.status(400).json({
            success: false,
            message: 'Unable to access uploaded file content. Please try uploading again.'
          });
        }

        // Store both the file URL and the content, always as markdown
        data.markdownUrl = fileUrl;
        data.content = markdownContent;
        data.contentType = 'markdown';
        
        // Clean up local file if it exists and we have a remote URL
        if (uploadedFile.path && fs.existsSync(uploadedFile.path) && fileUrl.startsWith('http')) {
          fs.unlinkSync(uploadedFile.path);
        }
      } catch (fileError) {
        return res.status(400).json({
          success: false,
          message: 'Error processing uploaded Markdown file',
          error: fileError.message
        });
      }
    }

    if (existingPage) {
      // Update existing legal page
      const updateFields: any = {
        updatedBy: userId,
        version: existingPage.version + 1
      };

      if (data !== undefined && Object.keys(data).length > 0) {
        // Merge with existing data, ensuring we preserve important fields
        updateFields.data = { 
          ...existingPage.data, 
          ...data,
          lastUpdated: new Date().toISOString()
        };
      }
      if (isActive !== undefined) updateFields.isActive = isActive;

      const updatedPage = await Page.findOneAndUpdate(
        { path },
        updateFields,
        { new: true, runValidators: true }
      ).populate('createdBy updatedBy', 'name email');

      res.status(200).json({
        success: true,
        message: `${pageName} updated successfully`,
        data: updatedPage
      });
    } else {
      // Create new legal page
      const pageData = {
        ...data,
        lastUpdated: new Date().toISOString()
      };

      const newPageData = {
        name: pageName,
        path,
        data: pageData,
        createdBy: userId,
        updatedBy: userId,
        isActive: isActive !== undefined ? isActive : true
      };

      const newPage = new Page(newPageData);
      const savedPage = await newPage.save();
      
      res.status(201).json({
        success: true,
        message: `${pageName} created successfully`,
        data: savedPage
      });
    }
  } catch (error: any) {
    // Handle Cloudinary-specific errors
    if (error.message && error.message.includes('file format not allowed')) {
      return res.status(400).json({
        success: false,
        message: 'File format not supported. Please upload a valid Markdown (.md) file.',
        error: 'UNSUPPORTED_FILE_FORMAT'
      });
    }
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Check if it's a path duplicate error
      if (error.keyPattern && error.keyPattern.path) {
        return res.status(400).json({
          success: false,
          message: 'A legal page with this path already exists'
        });
      }
      
      // Generic duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry detected. Please try again.'
      });
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating/updating legal page',
      error: error.message
    });
  }
};

// Delete legal page
export const deleteLegalPage = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validate legal page type
    const validTypes = Object.keys(LEGAL_PAGE_TYPES).map(key => 
      key.toLowerCase().replace(/_/g, '-')
    );
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid legal page type'
      });
    }

    const path = `/legal/${type}`;
    const legalPage = await Page.findOne({ path });

    if (!legalPage) {
      return res.status(404).json({
        success: false,
        message: 'Legal page not found'
      });
    }

    await Page.findOneAndDelete({ path });

    const pageName = type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    res.status(200).json({
      success: true,
      message: `${pageName} deleted successfully`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting legal page',
      error: error.message
    });
  }
};

// Get legal page types
export const getLegalPageTypes = async (req: Request, res: Response) => {
  try {
    const types = Object.keys(LEGAL_PAGE_TYPES).map(key => ({
      key: key.toLowerCase().replace(/_/g, '-'),
      name: key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' '),
      path: LEGAL_PAGE_TYPES[key as keyof typeof LEGAL_PAGE_TYPES]
    }));

    res.status(200).json({
      success: true,
      data: types
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching legal page types',
      error: error.message
    });
  }
};

// Export upload middleware using helper
export const uploadHomepageImages = getHomepageUploadMiddleware();

// Export upload middleware for legal documents
export const uploadLegalDocument = upload.legalDocument.single('markdownFile');

// ==================== NAVBAR MANAGEMENT ====================

// Get navbar configuration
export const getNavbar = async (req: Request, res: Response) => {
  try {
    const navbar = await Page.findOne({ path: 'navbar' })
      .populate('createdBy updatedBy', 'email name')
      .sort({ createdAt: -1 });

    if (!navbar) {
      // Return default navbar structure if none exists
      const defaultNavbarData = {
        navItems: [
          {
            id: uuidv4(),
            title: "WOMEN",
            order: 1,
            categories: [
              {
                id: uuidv4(),
                title: "Women's Clothing",
                order: 1,
                items: [
                  { label: "T-Shirts", keyword: "womens-tshirts", href: "/womens/t-shirts", order: 1 },
                  { label: "Skirts", keyword: "womens-skirts", href: "/womens/skirts", order: 2 },
                  { label: "Shorts", keyword: "womens-shorts", href: "/womens/shorts", order: 3 },
                  { label: "Jeans", keyword: "womens-jeans", href: "/womens/jeans", order: 4 }
                ]
              }
            ]
          },
          {
            id: uuidv4(),
            title: "MEN",
            order: 2,
            categories: [
              {
                id: uuidv4(),
                title: "Men's Clothing",
                order: 1,
                items: [
                  { label: "T-Shirts", keyword: "mens-tshirts", href: "/mens/t-shirts", order: 1 },
                  { label: "Shirts", keyword: "mens-shirts", href: "/mens/shirts", order: 2 },
                  { label: "Jeans", keyword: "mens-jeans", href: "/mens/jeans", order: 3 }
                ]
              }
            ]
          }
        ]
      };

      return res.status(200).json({
        success: true,
        message: 'Default navbar configuration retrieved',
        data: defaultNavbarData
      });
    }

    res.status(200).json({
      success: true,
      message: 'Navbar configuration retrieved successfully',
      data: navbar.data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving navbar configuration',
      error: error.message
    });
  }
};

// Create or update navbar configuration
export const updateNavbar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { navItems } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!navItems || !Array.isArray(navItems)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid navbar data. navItems array is required.'
      });
    }

    // Process navItems to add IDs and proper ordering
    const processedNavItems = navItems.map((section: any, sectionIndex: number) => ({
      id: uuidv4(),
      title: section.title,
      order: sectionIndex + 1,
      categories: section.categories.map((category: any, categoryIndex: number) => ({
        id: uuidv4(),
        title: category.title,
        order: categoryIndex + 1,
        items: category.items.map((item: any, itemIndex: number) => ({
          label: item.label,
          keyword: item.keyword,
          href: item.href,
          order: itemIndex + 1
        }))
      }))
    }));

    const navbarData = {
      navItems: processedNavItems
    };

    // Check if navbar page exists
    let navbar = await Page.findOne({ path: 'navbar' });

    if (navbar) {
      // Update existing navbar
      navbar.data = navbarData;
      navbar.updatedBy = userId;
      navbar.version = (navbar.version || 1) + 1;
      await navbar.save();
    } else {
      // Create new navbar page
      navbar = new Page({
        name: 'Navbar Configuration',
        path: 'navbar',
        data: navbarData,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
        version: 1
      });
      await navbar.save();
    }

    res.status(200).json({
      success: true,
      message: 'Navbar configuration updated successfully',
      data: navbar.data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating navbar configuration',
      error: error.message
    });
  }
};

// Delete navbar configuration (reset to default)
export const deleteNavbar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Delete the navbar page
    await Page.deleteOne({ path: 'navbar' });

    res.status(200).json({
      success: true,
      message: 'Navbar configuration reset to default successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error resetting navbar configuration',
      error: error.message
    });
  }
};
