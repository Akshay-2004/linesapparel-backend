import { Request, Response } from 'express';
import User, { EUserRole } from '@/models/user.model';

// Get all users (super admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    
    const filter: any = {};
    
    // Filter by role if specified
    if (role && Object.values(EUserRole).includes(role as EUserRole)) {
      filter.role = role;
    }

    // Search by name or email if specified
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const users = await User.find(filter)
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get single user by ID (user themselves or super admin only)
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;
    
    // Check if user is trying to access their own profile or if they're super admin
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === EUserRole.superAdmin;
    
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }
    
    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Change user role (super admin only)
export const changeUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const requestingUser = (req as any).user;

    // Validate role
    if (!role || !Object.values(EUserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles are: client, admin, super_admin'
      });
    }

    // Find the user to update
    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent super admin from demoting themselves
    if (userToUpdate._id.toString() === requestingUser._id.toString() && 
        requestingUser.role === EUserRole.superAdmin && 
        role !== EUserRole.superAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Super admins cannot demote themselves'
      });
    }

    // Prevent changing another super admin's role
    if (userToUpdate.role === EUserRole.superAdmin && 
        userToUpdate._id.toString() !== requestingUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change another super admin\'s role'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

// Get user statistics (super admin only)
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const clientUsers = await User.countDocuments({ role: EUserRole.client });
    const adminUsers = await User.countDocuments({ role: EUserRole.admin });
    const superAdminUsers = await User.countDocuments({ role: EUserRole.superAdmin });

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        clients: clientUsers,
        admins: adminUsers,
        superAdmins: superAdminUsers,
        recentSignups: recentUsers,
        breakdown: {
          clientPercentage: totalUsers > 0 ? ((clientUsers / totalUsers) * 100).toFixed(1) : '0',
          adminPercentage: totalUsers > 0 ? ((adminUsers / totalUsers) * 100).toFixed(1) : '0',
          superAdminPercentage: totalUsers > 0 ? ((superAdminUsers / totalUsers) * 100).toFixed(1) : '0'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
};

// Update user profile (users can update their own profile, super admins can update any)
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    const requestingUser = (req as any).user;
    
    // Check if user is trying to update their own profile or if they're super admin
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === EUserRole.superAdmin;
    
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own profile.'
      });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update object
    const updateFields: any = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone.trim();
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered by another user'
        });
      }
      
      updateFields.email = email.toLowerCase().trim();
    }

    // Handle address update
    if (address) {
      updateFields.address = {};
      if (address.street !== undefined) updateFields.address.street = address.street?.trim() || '';
      if (address.city !== undefined) updateFields.address.city = address.city?.trim() || '';
      if (address.state !== undefined) updateFields.address.state = address.state?.trim() || '';
      if (address.zip !== undefined) updateFields.address.zip = address.zip?.trim() || '';
      if (address.country !== undefined) updateFields.address.country = address.country?.trim() || '';
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Delete user (super admin only, cannot delete themselves)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;

    // Prevent super admin from deleting themselves
    if (requestingUser._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting another super admin
    if (userToDelete.role === EUserRole.superAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete another super admin account'
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// @desc    Add/Update user address
// @route   PUT /api/users/:id/address
export const updateUserAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { street, city, state, zip, country } = req.body;
    const requestingUser = (req as any).user;
    
    // Check if user is trying to update their own address or if they're super admin
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === EUserRole.superAdmin;
    
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own address.'
      });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build address object
    const addressData: any = {};
    if (street !== undefined) addressData['address.street'] = street?.trim() || '';
    if (city !== undefined) addressData['address.city'] = city?.trim() || '';
    if (state !== undefined) addressData['address.state'] = state?.trim() || '';
    if (zip !== undefined) addressData['address.zip'] = zip?.trim() || '';
    if (country !== undefined) addressData['address.country'] = country?.trim() || '';

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: addressData },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address: updatedUser?.address || null,
        user: updatedUser
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: error.message
    });
  }
};

// @desc    Get user address
// @route   GET /api/users/:id/address
export const getUserAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;
    
    // Check if user is trying to access their own address or if they're super admin
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === EUserRole.superAdmin;
    
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own address.'
      });
    }

    const user = await User.findById(id).select('address name email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        address: user.address || null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching address',
      error: error.message
    });
  }
};

// @desc    Delete user address
// @route   DELETE /api/users/:id/address
export const deleteUserAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;
    
    // Check if user is trying to delete their own address or if they're super admin
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === EUserRole.superAdmin;
    
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own address.'
      });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $unset: { address: 1 } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting address',
      error: error.message
    });
  }
};
