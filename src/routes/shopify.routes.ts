import { Router } from "express";
import * as shopifyController from "@/controllers/shopify.controller";
import * as webhookController from "@/controllers/webhook.controller";
import { validateShopifyWebhook } from "@/middleware/validateWebhook.middleware";
import { validateAdminAccess, validateUserAccess } from "@/middleware/auth.middleware";

const shopifyRouter = Router();

// Authentication
shopifyRouter.post("/auth/callback", shopifyController.handleAuthCallback);
shopifyRouter.get("/auth/status", shopifyController.checkAuthStatus);

// Products
shopifyRouter.get("/products", shopifyController.getProducts);
shopifyRouter.get("/products/:id", shopifyController.getProduct);
shopifyRouter.get(
  "/products/handle/:handle",
  shopifyController.getProductByHandle
); // Add this line
shopifyRouter.post(
  "/products",
  validateAdminAccess,
  shopifyController.createProduct
);
shopifyRouter.put(
  "/products/:id",
  validateAdminAccess,
  shopifyController.updateProduct
);
shopifyRouter.delete(
  "/products/:id",
  validateAdminAccess,
  shopifyController.deleteProduct
);
shopifyRouter.get(
  "/products/:id/variants",
  shopifyController.getProductVariants
);

// Orders
shopifyRouter.get("/orders", shopifyController.getOrders);
shopifyRouter.get("/orders/:id", shopifyController.getOrder);
shopifyRouter.get("/orders/user/my-orders", validateUserAccess, shopifyController.getUserOrders);
shopifyRouter.post(
  "/orders",
  // validateAdminAccess,
  shopifyController.createOrder
);
shopifyRouter.put(
  "/orders/:id",
  validateAdminAccess,
  shopifyController.updateOrder
);
shopifyRouter.get(
  "/orders/status/:status",
  shopifyController.getOrdersByStatus
);
shopifyRouter.post(
  "/orders/:id/fulfill",
  validateAdminAccess,
  shopifyController.fulfillOrder
);
shopifyRouter.post(
  "/orders/:id/cancel",
  validateAdminAccess,
  shopifyController.cancelOrder
);

// Customers
shopifyRouter.get("/customers", shopifyController.getCustomers);
shopifyRouter.get("/customers/:id", shopifyController.getCustomer);
shopifyRouter.post(
  "/customers",
  validateAdminAccess,
  shopifyController.createCustomer
);
shopifyRouter.put(
  "/customers/:id",
  validateAdminAccess,
  shopifyController.updateCustomer
);
shopifyRouter.get("/customers/:id/orders", shopifyController.getCustomerOrders);
shopifyRouter.get("/customers/search", shopifyController.searchCustomers);

// Inventory
shopifyRouter.get("/inventory", shopifyController.getInventoryLevels);
shopifyRouter.post(
  "/inventory/adjust",
  validateAdminAccess,
  shopifyController.adjustInventory
);
shopifyRouter.get(
  "/inventory/locations",
  shopifyController.getInventoryLocations
);

// Collections
shopifyRouter.get("/collections", shopifyController.getCollections);
shopifyRouter.get("/collections/:id", shopifyController.getCollection);
shopifyRouter.get(
  "/collections/handle/:handle",
  shopifyController.getCollectionByHandle
);
shopifyRouter.get(
  "/collections/:id/products",
  shopifyController.getCollectionProducts
);
shopifyRouter.post(
  "/collections",
  validateAdminAccess,
  shopifyController.createCollection
);
shopifyRouter.put(
  "/collections/:id",
  validateAdminAccess,
  shopifyController.updateCollection
);

// Webhooks
shopifyRouter.post(
  "/webhooks",
  validateAdminAccess,
  shopifyController.registerWebhook
);
shopifyRouter.delete(
  "/webhooks/:id",
  validateAdminAccess,
  shopifyController.removeWebhook
);
shopifyRouter.get(
  "/webhooks",
  validateAdminAccess,
  shopifyController.listWebhooks
);

// Webhook endpoints (protect with validateShopifyWebhook middleware)
shopifyRouter.post(
  "/webhook/order-created",
  validateShopifyWebhook,
  webhookController.orderCreated
);
shopifyRouter.post(
  "/webhook/order-updated",
  validateShopifyWebhook,
  webhookController.orderUpdated
);
shopifyRouter.post(
  "/webhook/product-updated",
  validateShopifyWebhook,
  webhookController.productUpdated
);
shopifyRouter.post(
  "/webhook/inventory-updated",
  validateShopifyWebhook,
  webhookController.inventoryUpdated
);

// Analytics and reports
shopifyRouter.get(
  "/analytics/sales",
  validateAdminAccess,
  shopifyController.getSalesAnalytics
);
shopifyRouter.get(
  "/analytics/customers",
  validateAdminAccess,
  shopifyController.getCustomerAnalytics
);
shopifyRouter.get(
  "/analytics/products",
  validateAdminAccess,
  shopifyController.getProductAnalytics
);
shopifyRouter.get(
  "/reports/sales",
  validateAdminAccess,
  shopifyController.generateSalesReport
);

export default shopifyRouter;
