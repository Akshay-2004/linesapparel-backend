import { Request, Response } from 'express';
import { Inquiry } from '@/models/inquiry.model';

// Get all inquiries (admin only)
export const getAllInquiries = async (req: Request, res: Response) => {
  try {
    const { resolved, page = 1, limit = 10, search } = req.query;
    
    const filter: any = {};
    
    // Filter by resolved status if specified
    if (resolved !== undefined) {
      filter.resolved = resolved === 'true';
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
    
    const inquiries = await Inquiry.find(filter)
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Inquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        inquiries,
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
      message: 'Error fetching inquiries',
      error: error.message
    });
  }
};

// Get single inquiry (admin only)
export const getInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const inquiry = await Inquiry.findById(id)
      .populate('resolvedBy', 'name email');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry',
      error: error.message
    });
  }
};

// Create inquiry (public route)
export const createInquiry = async (req: Request, res: Response) => {
  try {
    const { name, email, purpose, message } = req.body;

    if (!name || !email || !purpose || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, purpose, and message are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const newInquiry = new Inquiry({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      purpose: purpose.trim(),
      message: message.trim()
    });

    const savedInquiry = await newInquiry.save();
    
    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: savedInquiry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating inquiry',
      error: error.message
    });
  }
};

// Resolve inquiry (admin only)
export const resolveInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolvingMessage } = req.body;
    const adminUser = (req as any).user;

    if (!resolvingMessage || !resolvingMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Resolving message is required'
      });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    if (inquiry.resolved) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is already resolved'
      });
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedBy: adminUser._id,
        resolvingMessage: resolvingMessage.trim(),
        resolvedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('resolvedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Inquiry resolved successfully',
      data: updatedInquiry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error resolving inquiry',
      error: error.message
    });
  }
};

// Unresolve inquiry (admin only)
export const unresolveInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    if (!inquiry.resolved) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is not resolved'
      });
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      id,
      {
        resolved: false,
        $unset: {
          resolvedBy: 1,
          resolvingMessage: 1,
          resolvedAt: 1
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Inquiry marked as unresolved',
      data: updatedInquiry
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error unresolving inquiry',
      error: error.message
    });
  }
};

// Delete inquiry (admin only)
export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    await Inquiry.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting inquiry',
      error: error.message
    });
  }
};

// Get inquiry stats (admin only)
export const getInquiryStats = async (req: Request, res: Response) => {
  try {
    const totalInquiries = await Inquiry.countDocuments();
    const resolvedInquiries = await Inquiry.countDocuments({ resolved: true });
    const pendingInquiries = await Inquiry.countDocuments({ resolved: false });

    // Get recent inquiries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentInquiries = await Inquiry.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalInquiries,
        resolved: resolvedInquiries,
        pending: pendingInquiries,
        recent: recentInquiries,
        resolutionRate: totalInquiries > 0 ? ((resolvedInquiries / totalInquiries) * 100).toFixed(1) : '0'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry stats',
      error: error.message
    });
  }
};
