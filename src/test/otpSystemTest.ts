/**
 * OTP System Test Guide
 * 
 * This file provides instructions for testing the newly implemented OTP email verification system.
 */

// Test Steps:

// 1. REGISTRATION WITH OTP
// POST /api/auth/register
// Body: {
//   "name": "Test User",
//   "email": "test@example.com", 
//   "password": "password123",
//   "phone": "1234567890"
// }
// Expected: User created with verified: false, OTP email sent

// 2. VERIFY OTP
// POST /api/auth/verify-otp
// Body: {
//   "email": "test@example.com",
//   "otp": "123456" // Use the OTP from the email
// }
// Expected: User verified: true, authentication token provided

// 3. RESEND OTP (if needed)
// POST /api/auth/resend-otp
// Body: {
//   "email": "test@example.com"
// }
// Expected: New OTP sent to email

// Frontend Flow:
// 1. Go to /sign-up
// 2. Fill out registration form
// 3. Submit form → redirected to /verify?email=test@example.com
// 4. Enter OTP from email
// 5. Successful verification → redirected to homepage (/)

// Database Changes:
// - Users created with verified: false initially
// - OTP documents created in 'otps' collection with TTL expiry
// - Upon verification, user.verified set to true, OTP document deleted

// Email Templates:
// - EMAIL_VERIFICATION_OTP template used for sending OTP codes
// - Professional HTML email with 6-digit OTP code
// - 10-minute expiry time for security

export const testRegistrationData = {
  name: "John Doe",
  email: "john.doe@example.com",
  password: "securePassword123",
  phone: "1234567890"
};

export const testOTPData = {
  email: "john.doe@example.com",
  otp: "123456" // Replace with actual OTP from email
};

// Curl commands for API testing:

// Registration:
// curl -X POST http://localhost:5000/api/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{"name":"Test User","email":"test@example.com","password":"password123","phone":"1234567890"}'

// OTP Verification:
// curl -X POST http://localhost:5000/api/auth/verify-otp \
//   -H "Content-Type: application/json" \
//   -d '{"email":"test@example.com","otp":"123456"}'

// Resend OTP:
// curl -X POST http://localhost:5000/api/auth/resend-otp \
//   -H "Content-Type: application/json" \
//   -d '{"email":"test@example.com"}'
