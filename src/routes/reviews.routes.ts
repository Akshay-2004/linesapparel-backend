import express from 'express';
import * as reviewController from '@/controllers/review.controller';
import { validateUserAccess, validateAdminAccess } from '@/middleware/auth.middleware';

const reviewsRouter = express.Router();

// Public routes - No authentication required
reviewsRouter.get('/product/:productId', reviewController.getProductReviews);
reviewsRouter.get('/product/:productId/distribution', reviewController.getProductStarDistribution);
reviewsRouter.get('/:id', reviewController.getReview);

// Protected routes - Authenticated users only
reviewsRouter.use(validateUserAccess);

// User routes - Verified users only (for creating reviews)
reviewsRouter.post('/', reviewController.uploadReviewImages, reviewController.createReview);
reviewsRouter.get('/user/my-reviews', reviewController.getUserReviews);
reviewsRouter.put('/:id', reviewController.uploadReviewImages, reviewController.updateReview);
reviewsRouter.delete('/:id', reviewController.deleteReview); // Own reviews or admin
reviewsRouter.patch('/:id/helpful', reviewController.toggleFoundHelpful);

// Admin only routes
reviewsRouter.get('/', validateAdminAccess, reviewController.getAllReviews);
reviewsRouter.patch('/:id/verified-buyer', validateAdminAccess, reviewController.toggleVerifiedBuyer);

export default reviewsRouter;
