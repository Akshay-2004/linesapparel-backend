import { Request, Response } from "express";
import { sendResponse } from "@/utils/response.util";
import { Cart } from "@/models/cart.model";
import User from "@/models/user.model";
import { Inquiry } from "@/models/inquiry.model";
import { Review } from "@/models/review.model";
import { Testimonial } from "@/models/testimonials.model";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get total carts/orders count
    const totalCarts = await Cart.countDocuments();

    // Get total inquiries count
    const totalInquiries = await Inquiry.countDocuments();

    // Get total reviews count
    const totalReviews = await Review.countDocuments();

    // Get total testimonials count
    const totalTestimonials = await Testimonial.countDocuments();

    // Calculate total sales from carts (sum of totalPrice)
    const carts = await Cart.find({}, 'totalPrice');
    const totalSales = carts.reduce((sum, cart) => sum + (cart.totalPrice || 0), 0);

    const stats = {
      totalUsers,
      totalCarts,
      totalInquiries,
      totalReviews,
      totalTestimonials,
      totalSales: Math.round(totalSales * 100) / 100 // Round to 2 decimal places
    };

    sendResponse(res, 200, "Dashboard stats retrieved successfully", stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    sendResponse(res, 500, "Failed to fetch dashboard stats", undefined, "Internal server error");
  }
};

export const getRecentOrders = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent carts/orders from database
    const recentCarts = await Cart.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Transform carts to match frontend expectations
    const recentOrders = recentCarts.map((cart) => ({
      id: cart._id.toString(),
      customer: (cart.userId as any)?.name || (cart.userId as any)?.email || "Unknown Customer",
      amount: `$${cart.totalPrice.toFixed(2)}`,
      status: "Completed", // Since these are completed carts
      date: new Date(cart.createdAt).toLocaleDateString()
    }));

    sendResponse(res, 200, "Recent orders retrieved successfully", recentOrders);
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    sendResponse(res, 500, "Failed to fetch recent orders", undefined, "Internal server error");
  }
};
