import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  updateProfile,
  changePassword,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword
} from '@/controllers/auth.controller';
import { validateUserAccess } from '@/middleware/auth.middleware';
import { 
  signupLimiter, 
  authLimiter, 
  passwordResetLimiter, 
  otpLimiter 
} from '@/middleware/rateLimiter.middleware';

const router = express.Router();

router.post('/register', signupLimiter, register);
router.post('/login', authLimiter, login);
router.get('/logout', logout);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/verify-forgot-password-otp', otpLimiter, verifyForgotPasswordOTP);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', validateUserAccess, getCurrentUser);
router.get('/refresh-token', validateUserAccess, refreshToken);
router.put('/update-profile', validateUserAccess, updateProfile);
router.put('/change-password', validateUserAccess, changePassword);

export default router;
