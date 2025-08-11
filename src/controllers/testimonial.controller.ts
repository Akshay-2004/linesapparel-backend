import { Request, Response } from 'express';
import { Testimonial } from '@/models/testimonials.model';
import { 
  handleOptionalImageUpload, 
  deleteImageFromUrl,
  getTestimonialUploadMiddleware 
} from '@/utils/imageUpload.helpers';

// Get all testimonials (public route)
export const getAllTestimonials = async (req: Request, res: Response) => {
  try {
    const { published, page = 1, limit = 10, stars, search } = req.query;
    
    const filter: any = {};
    
    // Filter by published status if specified
    if (published !== undefined) {
      filter.published = published === 'true';
    }
    
    // Filter by star rating if specified
    if (stars) {
      filter.stars = { $gte: Number(stars) };
    }

    // Search by name if specified (only if search is not empty)
    if (search && search.toString().trim()) {
      filter.name = { $regex: search.toString().trim(), $options: 'i' }; // Case-insensitive search
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Testimonial.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        testimonials,
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
      message: 'Error fetching testimonials',
      error: error.message
    });
  }
};

// Get published testimonials only (public route)
export const getPublishedTestimonials = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 6, stars } = req.query;
    
    const filter: any = { published: true };
    
    // Filter by star rating if specified
    if (stars) {
      filter.stars = { $gte: Number(stars) };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Testimonial.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        testimonials,
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
      message: 'Error fetching published testimonials',
      error: error.message
    });
  }
};

// Get single testimonial (public route)
export const getTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    res.status(200).json({
      success: true,
      data: testimonial
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching testimonial',
      error: error.message
    });
  }
};

// Create testimonial (admin only)
export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const { name, stars, quote, occupation, location, published = false } = req.body;

    if (!name || !stars || !quote || !occupation || !location) {
      return res.status(400).json({
        success: false,
        message: 'All fields except image are required'
      });
    }

    if (stars < 0 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be between 0 and 5'
      });
    }

    // Handle optional image upload using helper
    const imageUrl = await handleOptionalImageUpload(req);

    const newTestimonial = new Testimonial({
      name,
      stars: Number(stars),
      quote,
      imageUrl, // Will be undefined if no image uploaded
      occupation,
      location,
      published: published === 'true' || published === true
    });

    const savedTestimonial = await newTestimonial.save();
    
    res.status(201).json({
      success: true,
      message: 'Testimonial created successfully',
      data: savedTestimonial
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating testimonial',
      error: error.message
    });
  }
};

// Update testimonial (admin only)
export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, stars, quote, occupation, location, published } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Validate stars if provided
    if (stars !== undefined && (stars < 0 || stars > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be between 0 and 5'
      });
    }

    const updateFields: any = {};
    
    if (name !== undefined) updateFields.name = name;
    if (stars !== undefined) updateFields.stars = Number(stars);
    if (quote !== undefined) updateFields.quote = quote;
    if (occupation !== undefined) updateFields.occupation = occupation;
    if (location !== undefined) updateFields.location = location;
    if (published !== undefined) updateFields.published = published === 'true' || published === true;

    // Handle optional image update using helper
    const newImageUrl = await handleOptionalImageUpload(req, testimonial.imageUrl);
    if (newImageUrl) {
      updateFields.imageUrl = newImageUrl;
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Testimonial updated successfully',
      data: updatedTestimonial
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating testimonial',
      error: error.message
    });
  }
};

// Toggle publish status (admin only)
export const togglePublishStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

    if (published === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Published status is required'
      });
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      { published: published === 'true' || published === true },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: `Testimonial ${updatedTestimonial?.published ? 'published' : 'unpublished'} successfully`,
      data: updatedTestimonial
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating testimonial publish status',
      error: error.message
    });
  }
};

// Delete testimonial (admin only)
export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Delete associated image using helper (only if exists)
    if (testimonial.imageUrl) {
      await deleteImageFromUrl(testimonial.imageUrl);
    }

    await Testimonial.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting testimonial',
      error: error.message
    });
  }
};

// Export upload middleware using helper
export const uploadTestimonialImage = getTestimonialUploadMiddleware();
