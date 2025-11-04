import { Router } from 'express';
import {
  createInterest,
  getAllInterests,
  deleteInterest
} from '@/controllers/interest.controller';
import { validateAdminAccess } from '@/middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/', createInterest);

// Admin routes
router.get('/', validateAdminAccess, getAllInterests);
router.delete('/:id', validateAdminAccess, deleteInterest);

export default router;