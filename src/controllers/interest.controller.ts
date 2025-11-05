import { Request, Response } from 'express';
import Interest from '@/models/interest.model';

// Create interest (public)
export const createInterest = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email already exists
    const existingInterest = await Interest.findOne({ email });
    if (existingInterest) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered for interest'
      });
    }

    const newInterest = new Interest({ email });
    const savedInterest = await newInterest.save();

    res.status(201).json({
      success: true,
      message: 'Interest registered successfully',
      data: {
        email: savedInterest.email,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error registering interest',
      error: error.message
    });
  }
};

// Get all interests (admin only)
export const getAllInterests = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Allow larger limits for export (up to 10,000)
    const maxLimit = 10000;
    const actualLimit = Math.min(Number(limit), maxLimit);

    const filter: any = {};

    // Search by email if specified
    if (search && search.toString().trim()) {
      filter.email = { $regex: search.toString().trim(), $options: 'i' };
    }

    const skip = (Number(page) - 1) * actualLimit;

    const interests = await Interest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit);

    const total = await Interest.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        interests,
        pagination: {
          page: Number(page),
          limit: actualLimit,
          total,
          totalPages: Math.ceil(total / actualLimit)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching interests',
      error: error.message
    });
  }
};

// Delete interest (admin only)
export const deleteInterest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const interest = await Interest.findById(id);
    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found'
      });
    }

    await Interest.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Interest deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting interest',
      error: error.message
    });
  }
};