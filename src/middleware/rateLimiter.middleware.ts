import rateLimit from 'express-rate-limit';

// Rate limiter for general API requests
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter specifically for authentication endpoints (login, register, etc.)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
});

// Rate limiter for password reset attempts
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OTP requests
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 OTP requests per 10 minutes
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again after 10 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for signup specifically
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signup attempts per hour
  message: {
    success: false,
    message: 'Too many signup attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't skip successful requests for signup
  skipSuccessfulRequests: false,
});