import { Request, Response } from "express";
import { TextBanner } from "../models/text-banner.model";

// Create text banner
export const createTextBanner = async (req: Request, res: Response) => {
  try {
    const { content, isActive } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Content is required"
      });
    }

    const newTextBanner = new TextBanner({
      content,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedTextBanner = await newTextBanner.save();

    res.status(201).json({
      success: true,
      message: "Text banner created successfully",
      data: savedTextBanner
    });
  } catch (error: any) {
    console.error("Error creating text banner:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create text banner",
      error: error.message
    });
  }
};

// Get all text banners
export const getAllTextBanners = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let query: any = {};

    if (search) {
      query.content = { $regex: search, $options: "i" };
    }

    const textBanners = await TextBanner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await TextBanner.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        textBanners,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error: any) {
    console.error("Error fetching text banners:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch text banners",
      error: error.message
    });
  }
};

// Get single text banner
export const getTextBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const textBanner = await TextBanner.findById(id);

    if (!textBanner) {
      return res.status(404).json({
        success: false,
        message: "Text banner not found"
      });
    }

    res.status(200).json({
      success: true,
      data: textBanner
    });
  } catch (error: any) {
    console.error("Error fetching text banner:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch text banner",
      error: error.message
    });
  }
};

// Update text banner
export const updateTextBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, isActive } = req.body;

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedTextBanner = await TextBanner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTextBanner) {
      return res.status(404).json({
        success: false,
        message: "Text banner not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Text banner updated successfully",
      data: updatedTextBanner
    });
  } catch (error: any) {
    console.error("Error updating text banner:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update text banner",
      error: error.message
    });
  }
};

// Delete text banner
export const deleteTextBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedTextBanner = await TextBanner.findByIdAndDelete(id);

    if (!deletedTextBanner) {
      return res.status(404).json({
        success: false,
        message: "Text banner not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Text banner deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting text banner:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete text banner",
      error: error.message
    });
  }
};

// Toggle active status
export const toggleTextBannerStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const textBanner = await TextBanner.findById(id);

    if (!textBanner) {
      return res.status(404).json({
        success: false,
        message: "Text banner not found"
      });
    }

    textBanner.isActive = !textBanner.isActive;
    await textBanner.save();

    res.status(200).json({
      success: true,
      message: `Text banner ${textBanner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: textBanner
    });
  } catch (error: any) {
    console.error("Error toggling text banner status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle text banner status",
      error: error.message
    });
  }
};

// Get all active text banners (public route)
export const getActiveTextBanners = async (req: Request, res: Response) => {
  try {
    const activeTextBanners = await TextBanner.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: activeTextBanners
    });
  } catch (error: any) {
    console.error("Error fetching active text banners:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active text banners",
      error: error.message
    });
  }
};