import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { EUserRole, IUser } from '@/models/user.model';
import Otp, { IOtp } from '@/models/otp.model';
import shopifyService from '@/services/shopify.service';
import { sendOTPEmail, sendForgotPasswordOTP, sendPasswordResetSuccess } from '@/utils/mail.helpers';

const sendTokenResponse = (user: IUser, statusCode: number, res: Response, req: Request) => {
  // Get fingerprinting information
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Create a more secure token with additional claims
  const token = jwt.sign(
    { 
      id: user._id,
      role: user.role,
      email: user.email,
      fingerprint: {
        userAgent: userAgent.substring(0, 100), // Limit length for security
        ip: ipAddress
      },
      // Adding version number for future JWT structure changes
      version: 1
    },
    process.env.JWT_SECRET || 'your-secret-key',
    {
      expiresIn: '24h', // Longer expiry time to prevent frequent auth issues
    }
  );

  // Determine the correct cookie settings based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: isProduction, // Only secure in production (HTTPS)
    sameSite: isProduction ? ('none' as const) : ('lax' as const), // 'none' for cross-site in prod, 'lax' for same-site in dev
    path: '/', // Ensure cookie is sent for all paths
  };

  // Set cookie and send response with fields that match our user model
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
};

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        res.status(400).json({ message: 'Phone number already registered' });
        return;
      }
    }

    // Split name into first and last name for Shopify
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log('🛍️ Creating or linking Shopify customer for:', email);
    
    // Try to create customer in Shopify or link to existing one
    let shopifyCustomer;
    let customerAccessToken;
    let isExistingCustomer = false;
    
    try {
      // First, try to create a new customer
      shopifyCustomer = await shopifyService.createStorefrontCustomer({
        email,
        password,
        firstName,
        lastName,
        phone
      });

      // If customer creation failed (throttled), throw error
      if (!shopifyCustomer?.id) {
        throw new Error('Shopify customer creation failed or was throttled');
      }

      console.log('✅ New Shopify customer created');
    } catch (shopifyError: any) {
      console.log('🔍 Customer creation failed, checking if customer already exists:', shopifyError.message);
      
      // If throttled, stop registration and return error
      if (
        shopifyError.message &&
        shopifyError.message.includes('THROTTLED')
      ) {
        return res.status(429).json({
          success: false,
          message: 'Too many signups. Please try again in a few minutes.'
        });
      }

      // Check if the error is because customer already exists
      if (
        shopifyError.message &&
        (shopifyError.message.includes('Customer already exists') ||
         shopifyError.message.includes('CUSTOMER_ALREADY_EXISTS') ||
         shopifyError.message.includes('has already been taken'))
      ) {
        console.log('🔗 Customer already exists in Shopify, attempting to link account');
        isExistingCustomer = true;
        
        // Try to get access token for existing customer
        try {
          const tokenData = await shopifyService.createCustomerAccessToken(email, password);
          customerAccessToken = tokenData;
          
          // Get customer details using the access token
          const existingCustomer = await shopifyService.getCustomerWithAccessToken(tokenData.accessToken);
          if (existingCustomer) {
            shopifyCustomer = {
              id: existingCustomer.id,
              email: existingCustomer.email,
              firstName: existingCustomer.firstName,
              lastName: existingCustomer.lastName,
              phone: existingCustomer.phone
            };
            console.log('✅ Successfully linked to existing Shopify customer');
          } else {
            throw new Error('Could not retrieve existing customer details');
          }
        } catch (linkError: any) {
          console.error('❌ Failed to link to existing Shopify customer:', linkError.message);
          
          // If password doesn't match, inform user
          if (linkError.message && linkError.message.includes('Unidentified customer')) {
            return res.status(400).json({
              success: false,
              message: 'An account with this email already exists. Please use the correct password or try logging in instead.'
            });
          }
          
          return res.status(500).json({
            success: false,
            message: 'Failed to link to existing Shopify account. Please try again or contact support.'
          });
        }
      } else {
        console.error('❌ Shopify customer creation/linking failed:', shopifyError.message);
        return res.status(500).json({
          success: false,
          message: 'Shopify customer creation failed. Please try again later.'
        });
      }
    }

    // If we don't have a customer access token yet, try to get one
    if (!customerAccessToken && shopifyCustomer?.id) {
      try {
        const tokenData = await shopifyService.createCustomerAccessToken(email, password);
        customerAccessToken = tokenData;
        console.log('✅ Customer access token obtained');
      } catch (tokenError: any) {
        console.error('❌ Failed to get customer access token:', tokenError.message);
        // Continue without token - user can still register in our system
      }
    }

    // Only set Shopify fields if available
    const user = await User.create({
      name,
      email,
      password,
      verified: false,
      ...(phone ? { phone } : {}),
      shopify: shopifyCustomer?.id && customerAccessToken
        ? {
            customerId: shopifyCustomer.id,
            customerAccessToken: customerAccessToken.accessToken,
            customerAccessTokenExpiresAt: new Date(customerAccessToken.expiresAt)
          }
        : {}
    });

    if (isExistingCustomer) {
      console.log('✅ User created and linked to existing Shopify customer');
    } else {
      console.log('✅ User created with new Shopify customer');
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Check if OTP already exists for this email
    let otpRecord = await Otp.findOne({ email });
    
    if (otpRecord) {
      // Update existing OTP
      otpRecord.otp = otpCode;
      otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await otpRecord.save();
      console.log('✅ OTP updated for existing email');
    } else {
      // Create new OTP record
      otpRecord = await Otp.create({
        email,
        otp: otpCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      console.log('✅ New OTP created');
    }

    // Send OTP email
    try {
      const emailResult = await sendOTPEmail(email, otpCode, name, 10);
      if (emailResult.success) {
        console.log('✅ OTP email sent successfully');
      } else {
        console.error('❌ Failed to send OTP email:', emailResult.error);
      }
    } catch (emailError: any) {
      console.error('❌ Email sending error:', emailError.message);
    }

    // Return success response without token (user needs to verify first)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification code.',
      data: {
        email: user.email,
        name: user.name,
        verified: user.verified
      }
    });
  } catch (error: any) {
    console.error('❌ Registration failed:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check if password matches
    try {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      console.log('🔐 User authenticated, getting Shopify customer access token');
      
      // Get or refresh Shopify customer access token
      let customerAccessToken = user.shopify?.customerAccessToken;
      let tokenExpiresAt = user.shopify?.customerAccessTokenExpiresAt;
      
      // Check if token exists and is not expired
      const now = new Date();
      const tokenExpired = !tokenExpiresAt || tokenExpiresAt <= now;
      
      if (!customerAccessToken || tokenExpired) {
        console.log('🔄 Creating new customer access token');
        try {
          const tokenData = await shopifyService.createCustomerAccessToken(email, password);
          customerAccessToken = tokenData.accessToken;
          tokenExpiresAt = new Date(tokenData.expiresAt);
          
          // Update user with new token info
          await User.findByIdAndUpdate(user._id, {
            'shopify.customerAccessToken': customerAccessToken,
            'shopify.customerAccessTokenExpiresAt': tokenExpiresAt
          });
          
          console.log('✅ New customer access token created and saved');
        } catch (shopifyError: any) {
          console.error('❌ Failed to get Shopify customer access token:', shopifyError);
          // Don't fail the login if Shopify token creation fails
        }
      } else {
        console.log('✅ Using existing valid customer access token');
      }
      
      sendTokenResponse(user, 200, res, req);
    } catch (error) {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error: any) {
    console.error('❌ Login failed:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
export const logout = (req: Request, res: Response): void => {
  // Use the same secure cookie options when clearing (without expires)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/'
  };

  res.clearCookie('token', cookieOptions);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};// @desc    Get current logged in user
// @route   GET /api/auth/me
export const getCurrentUser = async (req: any, res: Response): Promise<void> => {
  try {
    // Assume you have a middleware that attaches user to request
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    
    // Only include fields from your user model
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        _id: req.user._id,
        name: req.user.name,
        image: req.user.image || null,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        verified: req.user.verified,
        address: req.user.address || null,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving user', error: error.message });
  }
};

// @desc    Refresh token while maintaining user session
// @route   GET /api/auth/refresh-token
export const refreshToken = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    
    // Create a new token with a fresh expiry
    sendTokenResponse(req.user, 200, res, req);
  } catch (error: any) {
    res.status(500).json({ message: 'Token refresh failed', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { name, phone } = req.body;
    const updateData: Partial<IUser> = {};

    // Only update fields that are provided
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    // Update user by ID
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Profile update failed', error: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Please provide both current and new password' });
      return;
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, req);
  } catch (error: any) {
    res.status(500).json({ message: 'Password change failed', error: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ 
        success: false,
        message: 'Please provide both email and OTP' 
      });
      return;
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email: email.toLowerCase().trim() });
    
    if (!otpRecord) {
      res.status(400).json({ 
        success: false,
        message: 'OTP not found. Please request a new verification code.' 
      });
      return;
    }

    // Check if OTP is expired
    if (otpRecord.isExpired()) {
      // Clean up expired OTP
      await Otp.deleteOne({ email: email.toLowerCase().trim() });
      res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new verification code.' 
      });
      return;
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      res.status(400).json({ 
        success: false,
        message: 'Invalid OTP. Please try again.' 
      });
      return;
    }

    // Find and update user verification status
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
      return;
    }

    // Update user verification status
    user.verified = true;
    await user.save();

    // Clean up OTP record
    await Otp.deleteOne({ email: email.toLowerCase().trim() });

    console.log('✅ User email verified successfully:', email);

    // Send token response for immediate login
    sendTokenResponse(user, 200, res, req);
  } catch (error: any) {
    console.error('❌ OTP verification failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'OTP verification failed', 
      error: error.message 
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ 
        success: false,
        message: 'Please provide email address' 
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
      return;
    }

    // Check if user is already verified
    if (user.verified) {
      res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
      return;
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update or create OTP record
    const otpRecord = await Otp.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { 
        otp: otpCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    // Send OTP email
    try {
      const emailResult = await sendOTPEmail(email, otpCode, user.name, 10);
      if (emailResult.success) {
        console.log('✅ OTP resent successfully to:', email);
        res.status(200).json({
          success: true,
          message: 'Verification code sent successfully! Please check your email.'
        });
      } else {
        console.error('❌ Failed to resend OTP email:', emailResult.error);
        res.status(500).json({ 
          success: false,
          message: 'Failed to send verification email. Please try again.' 
        });
      }
    } catch (emailError: any) {
      console.error('❌ Email sending error:', emailError.message);
      res.status(500).json({ 
        success: false,
        message: 'Failed to send verification email. Please try again.' 
      });
    }
  } catch (error: any) {
    console.error('❌ Resend OTP failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to resend OTP', 
      error: error.message 
    });
  }
};

// @desc    Send forgot password OTP
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      res.status(200).json({ 
        success: true,
        data: {
          message: 'If an account with this email exists, you will receive a password reset code.'
        }
      });
      return;
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Check if OTP already exists for this email
    let otpRecord = await Otp.findOne({ email: email.toLowerCase().trim() });
    
    if (otpRecord) {
      // Update existing OTP
      otpRecord.otp = otpCode;
      otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await otpRecord.save();
    } else {
      // Create new OTP record
      otpRecord = await Otp.create({
        email: email.toLowerCase().trim(),
        otp: otpCode,
      });
    }

    // Send forgot password OTP email
    try {
      const emailResult = await sendForgotPasswordOTP(user.email, otpCode, user.name, 10);
      if (emailResult.success) {
        console.log('✅ Forgot password OTP sent successfully to:', user.email);
      } else {
        console.error('❌ Failed to send forgot password email:', emailResult.error);
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send forgot password email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'If an account with this email exists, you will receive a password reset code.'
      }
    });
  } catch (error: any) {
    console.error('❌ Forgot password failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process forgot password request', 
      error: error.message 
    });
  }
};

// @desc    Verify forgot password OTP
// @route   POST /api/auth/verify-forgot-password-otp
export const verifyForgotPasswordOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ 
        success: false,
        message: 'Email and OTP are required' 
      });
      return;
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email: email.toLowerCase().trim() });
    
    if (!otpRecord) {
      res.status(400).json({ 
        success: false,
        message: 'Invalid or expired OTP' 
      });
      return;
    }

    // Check if OTP is expired
    if (otpRecord.isExpired()) {
      await Otp.deleteOne({ email: email.toLowerCase().trim() });
      res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      });
      return;
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      res.status(400).json({ 
        success: false,
        message: 'Invalid OTP' 
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
      return;
    }

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        purpose: 'password-reset',
        timestamp: Date.now()
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '15m',
      }
    );

    // Clean up OTP record
    await Otp.deleteOne({ email: email.toLowerCase().trim() });

    console.log('✅ Forgot password OTP verified successfully for:', email);

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP verified successfully',
        resetToken,
      }
    });
  } catch (error: any) {
    console.error('❌ Forgot password OTP verification failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'OTP verification failed', 
      error: error.message 
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      res.status(400).json({ 
        success: false,
        message: 'Reset token and new password are required' 
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
      return;
    }

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
      return;
    }

    // Check if token purpose is correct
    if (decoded.purpose !== 'password-reset') {
      res.status(400).json({ 
        success: false,
        message: 'Invalid reset token' 
      });
      return;
    }

    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
      return;
    }

    // Update password (will be hashed by the pre-save middleware)
    user.password = newPassword;
    await user.save();

    // Send password reset success email
    try {
      const emailResult = await sendPasswordResetSuccess(user.email, user.name);
      if (emailResult.success) {
        console.log('✅ Password reset success email sent to:', user.email);
      } else {
        console.error('❌ Failed to send password reset success email:', emailResult.error);
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send password reset success email:', emailError);
      // Don't fail the request if email fails
    }

    console.log('✅ Password reset successfully for:', user.email);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password has been reset successfully'
      }
    });
  } catch (error: any) {
    console.error('❌ Password reset failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Password reset failed', 
      error: error.message 
    });
  }
};
