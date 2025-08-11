import { Request, Response } from "express";
import shopifyService from "@/services/shopify.service";
import { sendResponse } from "@/utils/response.util";

// Authentication
export const handleAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, shop } = req.query;
    const result = await shopifyService.handleOAuthCallback(
      code as string,
      shop as string
    );
    return sendResponse(res, 200, "Authentication successful", result);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Authentication failed",
      undefined,
      error.message
    );
  }
};

export const checkAuthStatus = async (req: Request, res: Response) => {
  try {
    const isValid = await shopifyService.validateCurrentSession();
    return sendResponse(res, 200, "Auth status checked", {
      authenticated: isValid,
    });
  } catch (error: any) {
    return sendResponse(
      res,
      401,
      "Authentication check failed",
      { authenticated: false },
      error.message
    );
  }
};

// Products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const collection = req.query.collection as string;
    const query = req.query.query as string;
    const sortBy = req.query.sortBy as string;
    const reverse = req.query.reverse === "true";

    const products = await shopifyService.getProducts({
      limit,
      collection_id: collection,
      query,
      sort: sortBy,
      reverse,
    });

    return sendResponse(res, 200, "Products retrieved successfully", products);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch products",
      undefined,
      error.message
    );
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await shopifyService.getProduct(id);

    if (!product) {
      return sendResponse(res, 404, "Product not found");
    }

    return sendResponse(res, 200, "Product retrieved successfully", product);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch product",
      undefined,
      error.message
    );
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const productData = req.body;
    const newProduct = await shopifyService.createProduct(productData);
    return sendResponse(res, 201, "Product created successfully", newProduct);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to create product",
      undefined,
      error.message
    );
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    const updatedProduct = await shopifyService.updateProduct(id, productData);
    return sendResponse(
      res,
      200,
      "Product updated successfully",
      updatedProduct
    );
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to update product",
      undefined,
      error.message
    );
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await shopifyService.deleteProduct(id);
    return sendResponse(res, 204, "Product deleted successfully");
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to delete product",
      undefined,
      error.message
    );
  }
};

export const getProductVariants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const variants = await shopifyService.getProductVariants(id);
    return sendResponse(
      res,
      200,
      "Product variants retrieved successfully",
      variants
    );
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch product variants",
      undefined,
      error.message
    );
  }
};

// Orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    // const page = parseInt(req.query.page as string) || 1;
    const status = req.query.status as string;
    const financialStatus = req.query.financialStatus as string;
    const fulfillmentStatus = req.query.fulfillmentStatus as string;

    const orders = await shopifyService.getOrders({
      limit,
      // page,
      status,
      financial_status: financialStatus,
      fulfillment_status: fulfillmentStatus,
    });

    return sendResponse(res, 200, "Orders retrieved successfully", orders);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch orders",
      undefined,
      error.message
    );
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await shopifyService.getOrder(id);

    if (!order) {
      return sendResponse(res, 404, "Order not found");
    }

    return sendResponse(res, 200, "Order retrieved successfully", order);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch order",
      undefined,
      error.message
    );
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;

    // Create draft order instead of completed order
    const draftOrder = await shopifyService.createDraftOrder(orderData);

    return sendResponse(res, 201, "Draft order created successfully", {
      draft_order: draftOrder,
      invoice_url: draftOrder.invoice_url, // Shopify's payment portal URL
      draft_order_id: draftOrder.id,
    });
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to create draft order",
      undefined,
      error.message
    );
  }
};

export const completeDraftOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const completedOrder = await shopifyService.completeDraftOrder(id, true);
    return sendResponse(
      res,
      200,
      "Draft order completed successfully",
      completedOrder
    );
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to complete draft order",
      undefined,
      error.message
    );
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderData = req.body;
    const updatedOrder = await shopifyService.updateOrder(id, orderData);
    return sendResponse(res, 200, "Order updated successfully", updatedOrder);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to update order",
      undefined,
      error.message
    );
  }
};

export const getOrdersByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const orders = await shopifyService.getOrdersByStatus(status);
    return sendResponse(res, 200, "Orders retrieved successfully", orders);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch orders by status",
      undefined,
      error.message
    );
  }
};

export const fulfillOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fulfillmentData = req.body;
    const result = await shopifyService.fulfillOrder(id, fulfillmentData);
    return sendResponse(res, 200, "Order fulfilled successfully", result);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fulfill order",
      undefined,
      error.message
    );
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await shopifyService.cancelOrder(id);
    return sendResponse(res, 200, "Order cancelled successfully", result);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to cancel order",
      undefined,
      error.message
    );
  }
};

// Customers
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const query = req.query.query as string;

    const customers = await shopifyService.getCustomers({
      limit,
      page,
      query,
    });

    return sendResponse(
      res,
      200,
      "Customers retrieved successfully",
      customers
    );
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch customers",
      undefined,
      error.message
    );
  }
};

export const getCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await shopifyService.getCustomer(id);

    if (!customer) {
      return sendResponse(res, 404, "Customer not found");
    }

    return sendResponse(res, 200, "Customer retrieved successfully", customer);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch customer",
      undefined,
      error.message
    );
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customerData = req.body;
    const newCustomer = await shopifyService.createCustomer(customerData);
    return sendResponse(res, 201, "Customer created successfully", newCustomer);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to create customer",
      undefined,
      error.message
    );
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerData = req.body;
    const updatedCustomer = await shopifyService.updateCustomer(
      id,
      customerData
    );
    return sendResponse(
      res,
      200,
      "Customer updated successfully",
      updatedCustomer
    );
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to update customer",
      undefined,
      error.message
    );
  }
};

export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orders = await shopifyService.getCustomerOrders(id);
    return sendResponse(
      res,
      200,
      "Customer orders retrieved successfully",
      orders
    );
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch customer orders",
      undefined,
      error.message
    );
  }
};

export const searchCustomers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const customers = await shopifyService.searchCustomers(query);
    return sendResponse(res, 200, "Customer search completed", customers);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to search customers",
      undefined,
      error.message
    );
  }
};

// Inventory
export const getInventoryLevels = async (req: Request, res: Response) => {
  try {
    const locationId = req.query.location_id as string;
    const inventoryLevels = await shopifyService.getInventoryLevels(locationId);
    res.json(inventoryLevels);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch inventory levels",
      message: error.message,
    });
  }
};

export const adjustInventory = async (req: Request, res: Response) => {
  try {
    const adjustmentData = req.body;
    const result = await shopifyService.adjustInventory(adjustmentData);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to adjust inventory",
      message: error.message,
    });
  }
};

export const getInventoryLocations = async (req: Request, res: Response) => {
  try {
    const locations = await shopifyService.getInventoryLocations();
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch inventory locations",
      message: error.message,
    });
  }
};

// Collections
export const getCollections = async (req: Request, res: Response) => {
  try {
    const collections = await shopifyService.getCollections();
    return sendResponse(
      res,
      200,
      "Collections retrieved successfully",
      collections
    );
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch collections",
      message: error.message,
    });
  }
};

export const getCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collection = await shopifyService.getCollection(id);

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    res.json(collection);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch collection",
      message: error.message,
    });
  }
};

export const getCollectionByHandle = async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const collection = await shopifyService.getCollectionByHandle(
      handle,
      limit
    );

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    return sendResponse(
      res,
      200,
      "Collection retrieved successfully",
      collection
    );
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch collection by handle",
      message: error.message,
    });
  }
};

export const getCollectionProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const products = await shopifyService.getCollectionProducts(id);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch collection products",
      message: error.message,
    });
  }
};

export const createCollection = async (req: Request, res: Response) => {
  try {
    const collectionData = req.body;
    const newCollection = await shopifyService.createCollection(collectionData);
    res.status(201).json(newCollection);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to create collection",
      message: error.message,
    });
  }
};

export const updateCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collectionData = req.body;
    const updatedCollection = await shopifyService.updateCollection(
      id,
      collectionData
    );
    res.json(updatedCollection);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to update collection",
      message: error.message,
    });
  }
};

// Webhooks
export const registerWebhook = async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    const result = await shopifyService.registerWebhook(webhookData);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to register webhook",
      message: error.message,
    });
  }
};

export const removeWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await shopifyService.removeWebhook(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to remove webhook",
      message: error.message,
    });
  }
};

export const listWebhooks = async (req: Request, res: Response) => {
  try {
    const webhooks = await shopifyService.listWebhooks();
    res.json(webhooks);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to list webhooks",
      message: error.message,
    });
  }
};

// Analytics and reports
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const analytics = await shopifyService.getSalesAnalytics(
      startDate,
      endDate
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch sales analytics",
      message: error.message,
    });
  }
};

export const getCustomerAnalytics = async (req: Request, res: Response) => {
  try {
    const analytics = await shopifyService.getCustomerAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch customer analytics",
      message: error.message,
    });
  }
};

export const getProductAnalytics = async (req: Request, res: Response) => {
  try {
    const analytics = await shopifyService.getProductAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch product analytics",
      message: error.message,
    });
  }
};

export const generateSalesReport = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = (req.query.format as string) || "json";

    const report = await shopifyService.generateSalesReport(
      startDate,
      endDate,
      format
    );

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales-report.csv"
      );
      return res.send(report);
    }

    res.json(report);
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to generate sales report",
      message: error.message,
    });
  }
};

export const getProductByHandle = async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;
    const product = await shopifyService.getProductByHandle(handle);

    if (!product) {
      return sendResponse(res, 404, "Product not found");
    }

    return sendResponse(res, 200, "Product retrieved successfully", product);
  } catch (error: any) {
    return sendResponse(
      res,
      500,
      "Failed to fetch product by handle",
      undefined,
      error.message
    );
  }
};
