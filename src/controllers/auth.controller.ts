import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { EUserRole, IUser } from '@/models/user.model';

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
  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none' as const, // Allow cross-site cookies in both environments
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
        role: user.role
      },
    });
};

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
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

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      ...(phone ? { phone } : {})
    });

    sendTokenResponse(user, 201, res, req);
  } catch (error: any) {
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
      
      sendTokenResponse(user, 200, res, req);
    } catch (error) {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
export const logout = (req: Request, res: Response): void => {
  // Use the same secure cookie options when clearing (without expires)
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/'
  };
  
  res.clearCookie('token', cookieOptions);
  
  res.status(200).json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
};

// @desc    Get current logged in user
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
