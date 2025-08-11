import { Request, Response } from "express";
import { Cart } from "@/models/cart.model";
import shopifyService from "@/services/shopify.service";

// Get user's cart
export const getCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
};

// Add item to cart
export const addToCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { productId, variantId, quantity, price, title } = req.body;

    if (!productId || !variantId || !quantity || !price || !title) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID, variant ID, quantity, price, and title are required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === productId && item.variantId === variantId
    );

    let image: string | undefined = undefined;
    if (existingItemIndex === -1) {
      // Extract numeric product ID if it's a Shopify GraphQL global ID
      let numericProductId = productId;
      const match = typeof productId === "string" && productId.match(/(\d+)$/);
      if (match) {
        numericProductId = match[1];
      }
      // Fetch product image from Shopify
      const product = await shopifyService.getProduct(numericProductId);
      // Shopify REST API returns images as an array
      if (product && product.images && product.images.length > 0) {
        image = product.images[0].src;
      }
    }

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += Number(quantity);
    } else {
      // Add new item with image
      cart.items.push({
        productId,
        variantId,
        quantity: Number(quantity),
        price: Number(price),
        title,
        image, // store image url in cart item
      });
    }

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: cart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error adding item to cart",
      error: error.message,
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { variantId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required (minimum 1)",
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variantId === variantId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = Number(quantity);

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: cart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message,
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { variantId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variantId === variantId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Remove item
    cart.items.splice(itemIndex, 1);

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      data: cart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message,
    });
  }
};

// Clear entire cart
export const clearCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    cart.totalPrice = 0;

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
};

// Get cart item count
export const getCartItemCount = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });

    const itemCount = cart
      ? cart.items.reduce((total, item) => total + item.quantity, 0)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        itemCount,
        totalItems: cart ? cart.items.length : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart item count",
      error: error.message,
    });
  }
};

// Admin: Get all carts (admin only)
export const getAllCarts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;

    const filter: any = {};
    if (userId) filter.userId = userId;

    const skip = (Number(page) - 1) * Number(limit);

    const carts = await Cart.find(filter)
      .populate("userId", "name email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Cart.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        carts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching carts",
      error: error.message,
    });
  }
};

// Admin: Delete any cart (admin only)
export const deleteCart = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Check if user is admin
    const isAdmin = userRole === "admin" || userRole === "super_admin";

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const cart = await Cart.findById(id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    await Cart.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Cart deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error deleting cart",
      error: error.message,
    });
  }
};
