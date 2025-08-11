import { Request, Response } from 'express';
import { Review } from '@/models/review.model';
import { 
  handleOptionalImageUpload, 
  deleteImageFromUrl,
  getReviewUploadMiddleware 
} from '@/utils/imageUpload.helpers';

// Get all reviews for a product (public route)
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter: any = { productId };
    
    // Filter by rating if specified
    if (rating) {
      filter.rating = Number(rating);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    
    const reviews = await Review.find(filter)
      .populate('userId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments(filter);
    const averageRating = await Review.aggregate([
      { $match: { productId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        averageRating: averageRating[0]?.avgRating || 0,
        totalReviews: averageRating[0]?.totalReviews || 0,
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
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Get all reviews (admin only)
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, rating, userId, productId } = req.query;
    
    const filter: any = {};
    
    if (rating) filter.rating = Number(rating);
    if (userId) filter.userId = userId;
    if (productId) filter.productId = productId;

    const skip = (Number(page) - 1) * Number(limit);
    
    const reviews = await Review.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        reviews,
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
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Get single review (public route)
export const getReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findById(id).populate('userId', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching review',
      error: error.message
    });
  }
};

// Create review (verified users only)
export const createReview = async (req: any, res: Response) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Handle optional image uploads
    const imageUrls = await handleOptionalImageUpload(req, undefined, true); // true for multiple images

    const newReview = new Review({
      userId,
      productId,
      rating: Number(rating),
      comment,
      stars: Number(rating), // stars same as rating
      imageUrls: imageUrls || [],
      verifiedBuyer: req.user.verified
    });

    const savedReview = await newReview.save();
    await savedReview.populate('userId', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: savedReview
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

// Update review (own review only)
export const updateReview = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const updateFields: any = {};
    
    if (rating !== undefined) {
      updateFields.rating = Number(rating);
      updateFields.stars = Number(rating);
    }
    if (comment !== undefined) updateFields.comment = comment;

    // Handle optional image update
    const newImageUrls = await handleOptionalImageUpload(req, review.imageUrls, true);
    if (newImageUrls) {
      updateFields.imageUrls = newImageUrls;
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

// Delete review (own review or admin only)
export const deleteReview = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns this review or is admin
    const isOwner = review.userId.toString() === userId.toString();
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews or you must be an admin'
      });
    }

    // Delete associated images if any
    if (review.imageUrls && review.imageUrls.length > 0) {
      for (const imageUrl of review.imageUrls) {
        await deleteImageFromUrl(imageUrl);
      }
    }

    await Review.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};

// Toggle found helpful (authenticated users only)
export const toggleFoundHelpful = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body; // true for helpful, false for not helpful

    if (helpful === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Helpful status is required'
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const updateFields: any = {};
    if (helpful === true || helpful === 'true') {
      updateFields.foundHelpful = (review.foundHelpful || 0) + 1;
    } else {
      updateFields.notHelpful = (review.notHelpful || 0) + 1;
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    res.status(200).json({
      success: true,
      message: `Review marked as ${helpful ? 'helpful' : 'not helpful'}`,
      data: updatedReview
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating review helpfulness',
      error: error.message
    });
  }
};

// Mark as verified buyer (admin only)
export const toggleVerifiedBuyer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verifiedBuyer } = req.body;

    if (verifiedBuyer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Verified buyer status is required'
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { verifiedBuyer: verifiedBuyer === 'true' || verifiedBuyer === true },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    res.status(200).json({
      success: true,
      message: `Review ${updatedReview?.verifiedBuyer ? 'marked as verified buyer' : 'removed verified buyer status'}`,
      data: updatedReview
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating verified buyer status',
      error: error.message
    });
  }
};

// Get user's own reviews (authenticated users only)
export const getUserReviews = async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const skip = (Number(page) - 1) * Number(limit);
    
    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        reviews,
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
      message: 'Error fetching user reviews',
      error: error.message
    });
  }
};

// Get star distribution for a product (public route)
export const getProductStarDistribution = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    // Aggregate to get count of reviews for each star rating
    const starDistribution = await Review.aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } // Sort by star rating (1-5)
    ]);

    // Create a complete distribution object (including 0 counts for missing ratings)
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    // Fill in the actual counts
    starDistribution.forEach(item => {
      distribution[item._id as keyof typeof distribution] = item.count;
    });

    // Calculate total reviews and average rating
    const totalReviews = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const weightedSum = Object.entries(distribution).reduce((sum, [star, count]) => {
      return sum + (Number(star) * count);
    }, 0);
    const averageRating = totalReviews > 0 ? Number((weightedSum / totalReviews).toFixed(2)) : 0;

    // Calculate percentages
    const percentageDistribution = Object.entries(distribution).reduce((acc, [star, count]) => {
      acc[star as keyof typeof acc] = totalReviews > 0 ? Number(((count / totalReviews) * 100).toFixed(1)) : 0;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      success: true,
      data: {
        productId,
        totalReviews,
        averageRating,
        distribution,
        percentageDistribution,
        breakdown: [
          { stars: 5, count: distribution[5], percentage: percentageDistribution['5'] },
          { stars: 4, count: distribution[4], percentage: percentageDistribution['4'] },
          { stars: 3, count: distribution[3], percentage: percentageDistribution['3'] },
          { stars: 2, count: distribution[2], percentage: percentageDistribution['2'] },
          { stars: 1, count: distribution[1], percentage: percentageDistribution['1'] }
        ]
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching star distribution',
      error: error.message
    });
  }
};

// Export upload middleware
export const uploadReviewImages = getReviewUploadMiddleware();
