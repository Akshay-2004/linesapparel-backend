import express from 'express';
import * as inquiryController from '@/controllers/inquiry.controller';
import { validateUserAccess, validateAdminAccess } from '@/middleware/auth.middleware';

const inquiryRouter = express.Router();

// Public routes - No authentication required
inquiryRouter.post('/', inquiryController.createInquiry);

// Protected routes - Admin only
inquiryRouter.use(validateUserAccess);
inquiryRouter.use(validateAdminAccess);

// Admin routes
inquiryRouter.get('/', inquiryController.getAllInquiries);
inquiryRouter.get('/stats', inquiryController.getInquiryStats);
inquiryRouter.get('/:id', inquiryController.getInquiry);
inquiryRouter.patch('/:id/resolve', inquiryController.resolveInquiry);
inquiryRouter.patch('/:id/unresolve', inquiryController.unresolveInquiry);
inquiryRouter.delete('/:id', inquiryController.deleteInquiry);

export default inquiryRouter;
