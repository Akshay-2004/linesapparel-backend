import express from 'express';
import * as testimonialController from '@/controllers/testimonial.controller';
import { validateUserAccess, validateAdminAccess } from '@/middleware/auth.middleware';

const testimonialsRouter = express.Router();

// Public routes - No authentication required
testimonialsRouter.get('/', testimonialController.getAllTestimonials);
testimonialsRouter.get('/published', testimonialController.getPublishedTestimonials);
testimonialsRouter.get('/:id', testimonialController.getTestimonial);

// Protected routes - Admin only
testimonialsRouter.use(validateUserAccess);
testimonialsRouter.use(validateAdminAccess);

// CRUD operations (admin only) - image upload is optional
testimonialsRouter.post('/', testimonialController.uploadTestimonialImage, testimonialController.createTestimonial);
testimonialsRouter.put('/:id', testimonialController.uploadTestimonialImage, testimonialController.updateTestimonial);
testimonialsRouter.delete('/:id', testimonialController.deleteTestimonial);

// Specific route for publishing/unpublishing (no image upload needed)
testimonialsRouter.patch('/:id/publish', testimonialController.togglePublishStatus);

export default testimonialsRouter;
