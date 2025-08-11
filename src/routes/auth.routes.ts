import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  updateProfile,
  changePassword
} from '@/controllers/auth.controller';
import { validateUserAccess } from '@/middleware/auth.middleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', validateUserAccess, getCurrentUser);
router.get('/refresh-token', validateUserAccess, refreshToken);
router.put('/update-profile', validateUserAccess, updateProfile);
router.put('/change-password', validateUserAccess, changePassword);

export default router;
