'use strict';

var dotenv = require('dotenv');
var express7 = require('express');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var mongoose6 = require('mongoose');
var bcrypt = require('bcrypt');
var cloudinary = require('cloudinary');
var multerStorageCloudinary = require('multer-storage-cloudinary');
var multer = require('multer');
var fs = require('fs');
var axios = require('axios');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var dotenv__default = /*#__PURE__*/_interopDefault(dotenv);
var express7__default = /*#__PURE__*/_interopDefault(express7);
var cookieParser__default = /*#__PURE__*/_interopDefault(cookieParser);
var cors__default = /*#__PURE__*/_interopDefault(cors);
var crypto__default = /*#__PURE__*/_interopDefault(crypto);
var jwt__default = /*#__PURE__*/_interopDefault(jwt);
var mongoose6__default = /*#__PURE__*/_interopDefault(mongoose6);
var bcrypt__default = /*#__PURE__*/_interopDefault(bcrypt);
var multer__default = /*#__PURE__*/_interopDefault(multer);
var fs__default = /*#__PURE__*/_interopDefault(fs);
var axios__default = /*#__PURE__*/_interopDefault(axios);

// src/index.ts

// src/config/shopify.config.ts
var shopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecret: process.env.SHOPIFY_API_SECRET || "",
  storeUrl: process.env.SHOPIFY_STORE_URL || "",
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN || "",
  apiVersion: "2023-07",
  // Using a stable API version
  scopes: [
    "read_products",
    "write_products",
    "read_orders",
    "write_orders",
    "read_customers",
    "write_customers",
    "read_inventory",
    "write_inventory",
    "read_fulfillments",
    "write_fulfillments",
    "read_shipping",
    "write_shipping",
    "read_analytics"
  ].join(","),
  webhooks: {
    orderCreated: {
      topic: "orders/create",
      address: `${process.env.APP_URL || "https://your-app.com"}/api/shopify/webhook/order-created`
    },
    orderUpdated: {
      topic: "orders/updated",
      address: `${process.env.APP_URL || "https://your-app.com"}/api/shopify/webhook/order-updated`
    },
    productUpdated: {
      topic: "products/update",
      address: `${process.env.APP_URL || "https://your-app.com"}/api/shopify/webhook/product-updated`
    },
    inventoryUpdated: {
      topic: "inventory_levels/update",
      address: `${process.env.APP_URL || "https://your-app.com"}/api/shopify/webhook/inventory-updated`
    }
  }
};
var validateShopifyConfig = () => {
  const { apiKey, apiSecret, storeUrl, accessToken } = shopifyConfig;
  if (!apiKey || !apiSecret || !storeUrl || !accessToken) {
    console.error("\u274C Missing Shopify configuration. Please check your .env file.");
    return false;
  }
  if (!storeUrl.includes("myshopify.com") && !storeUrl.includes("shopify.com")) {
    console.warn("\u26A0\uFE0F Shopify store URL might be invalid. Expected format: yourstore.myshopify.com");
  }
  console.log("\u2705 Shopify configuration validated");
  return true;
};
var ShopifyService = class {
  baseUrl;
  headers;
  constructor() {
    this.baseUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": shopifyConfig.accessToken
    };
  }
  async makeRequest(endpoint, method = "GET", data) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: this.headers
    };
    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Shopify API error (${response.status}): ${JSON.stringify(errorData)}`
        );
      }
      if (response.status === 204) {
        return {
          data: {},
          headers: response.headers,
          status: response.status
        };
      }
      const responseData = await response.json();
      return {
        data: responseData,
        headers: response.headers,
        status: response.status
      };
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }
  async makeGraphQLRequest(query, variables) {
    const url = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/graphql.json`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyConfig.accessToken
      },
      body: JSON.stringify({
        query,
        variables: variables || {}
      })
    };
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Shopify GraphQL API error (${response.status}): ${JSON.stringify(
            errorData
          )}`
        );
      }
      const responseData = await response.json();
      if (responseData.errors && responseData.errors.length > 0) {
        throw new Error(
          `GraphQL errors: ${JSON.stringify(responseData.errors)}`
        );
      }
      return responseData;
    } catch (error) {
      console.error("Error making GraphQL request:", error);
      throw error;
    }
  }
  buildQueryString(params) {
    if (!params || Object.keys(params).length === 0) return "";
    const validParams = Object.entries(params).filter(([_, value]) => value !== void 0 && value !== null).map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    );
    return validParams.length > 0 ? `?${validParams.join("&")}` : "";
  }
  // Authentication methods
  async handleOAuthCallback(code, shop) {
    try {
      const url = `https://${shop}/admin/oauth/access_token`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: shopifyConfig.apiKey,
          client_secret: shopifyConfig.apiSecret,
          code
        })
      });
      if (!response.ok) {
        throw new Error(`OAuth error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("OAuth callback error:", error);
      throw error;
    }
  }
  async validateCurrentSession() {
    try {
      const response = await this.makeRequest("/shop.json");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
  // Product methods
  async getProducts(params = {}) {
    const queryString = this.buildQueryString(params);
    const response = await this.makeRequest(
      `/products.json${queryString}`
    );
    return response.data;
  }
  async getProduct(productId) {
    const response = await this.makeRequest(`/products/${productId}.json`);
    return response.data.product;
  }
  async createProduct(productData) {
    const response = await this.makeRequest("/products.json", "POST", {
      product: productData
    });
    return response.data.product;
  }
  async updateProduct(productId, productData) {
    const response = await this.makeRequest(
      `/products/${productId}.json`,
      "PUT",
      { product: productData }
    );
    return response.data.product;
  }
  async deleteProduct(productId) {
    await this.makeRequest(`/products/${productId}.json`, "DELETE");
    return { success: true };
  }
  async getProductVariants(productId) {
    const response = await this.makeRequest(
      `/products/${productId}/variants.json`
    );
    return response.data.variants;
  }
  // Order methods
  async getOrders(params = {}) {
    const queryString = this.buildQueryString(params);
    const response = await this.makeRequest(`/orders.json${queryString}`);
    return response.data;
  }
  async getOrder(orderId) {
    const response = await this.makeRequest(`/orders/${orderId}.json`);
    return response.data.order;
  }
  async createOrder(orderData) {
    const response = await this.makeRequest("/orders.json", "POST", {
      order: orderData
    });
    return response.data.order;
  }
  async updateOrder(orderId, orderData) {
    const response = await this.makeRequest(
      `/orders/${orderId}.json`,
      "PUT",
      { order: orderData }
    );
    return response.data.order;
  }
  async getOrdersByStatus(status) {
    return this.getOrders({ status });
  }
  async fulfillOrder(orderId, fulfillmentData) {
    const response = await this.makeRequest(
      `/orders/${orderId}/fulfillments.json`,
      "POST",
      { fulfillment: fulfillmentData }
    );
    return response.data.fulfillment;
  }
  async cancelOrder(orderId) {
    const response = await this.makeRequest(
      `/orders/${orderId}/cancel.json`,
      "POST"
    );
    return response.data;
  }
  // Customer methods
  async getCustomers(params = {}) {
    const queryString = this.buildQueryString(params);
    const response = await this.makeRequest(
      `/customers.json${queryString}`
    );
    return response.data;
  }
  async getCustomer(customerId) {
    const response = await this.makeRequest(
      `/customers/${customerId}.json`
    );
    return response.data.customer;
  }
  async createCustomer(customerData) {
    const response = await this.makeRequest("/customers.json", "POST", {
      customer: customerData
    });
    return response.data.customer;
  }
  async updateCustomer(customerId, customerData) {
    const response = await this.makeRequest(
      `/customers/${customerId}.json`,
      "PUT",
      { customer: customerData }
    );
    return response.data.customer;
  }
  async getCustomerOrders(customerId) {
    return this.getOrders({ customer_id: customerId });
  }
  async searchCustomers(query) {
    return this.getCustomers({ query });
  }
  // Inventory methods
  async getInventoryLevels(locationId) {
    const queryString = locationId ? `?location_id=${locationId}` : "";
    const response = await this.makeRequest(
      `/inventory_levels.json${queryString}`
    );
    return response.data.inventory_levels;
  }
  async adjustInventory(adjustmentData) {
    const response = await this.makeRequest(
      "/inventory_levels/adjust.json",
      "POST",
      adjustmentData
    );
    return response.data.inventory_level;
  }
  async getInventoryLocations() {
    const response = await this.makeRequest("/locations.json");
    return response.data.locations;
  }
  // Collection methods
  async getCollections() {
    const customResponse = await this.makeRequest(
      "/custom_collections.json"
    );
    const smartResponse = await this.makeRequest(
      "/smart_collections.json"
    );
    return {
      custom_collections: customResponse.data.custom_collections,
      smart_collections: smartResponse.data.smart_collections
    };
  }
  async getCollection(collectionId, type = "custom") {
    const endpoint = type === "custom" ? `/custom_collections/${collectionId}.json` : `/smart_collections/${collectionId}.json`;
    const response = await this.makeRequest(endpoint);
    return type === "custom" ? response.data.custom_collection : response.data.smart_collection;
  }
  async getCollectionProducts(collectionId) {
    const response = await this.makeRequest(
      `/collections/${collectionId}/products.json`
    );
    return response.data.products;
  }
  async createCollection(collectionData, type = "custom") {
    const endpoint = type === "custom" ? "/custom_collections.json" : "/smart_collections.json";
    const dataKey = type === "custom" ? "custom_collection" : "smart_collection";
    const response = await this.makeRequest(endpoint, "POST", {
      [dataKey]: collectionData
    });
    return response.data[dataKey];
  }
  async updateCollection(collectionId, collectionData, type = "custom") {
    const endpoint = type === "custom" ? `/custom_collections/${collectionId}.json` : `/smart_collections/${collectionId}.json`;
    const dataKey = type === "custom" ? "custom_collection" : "smart_collection";
    const response = await this.makeRequest(endpoint, "PUT", {
      [dataKey]: collectionData
    });
    return response.data[dataKey];
  }
  async getCollectionByHandle(handle, limit) {
    try {
      const query = `
        query getCollectionByHandle($handle: String!, $limit: Int!) {
          collectionByHandle(handle: $handle) {
            id
            handle
            title
            description
            image {
              url
              altText
            }
            products(first: $limit) {
              edges {
                node {
                  id
                  handle
                  title
                  description
                  images(first: 10) {
                    edges {
                      node {
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 100) {
                    edges {
                      node {
                        id
                        title
                        price
                        compareAtPrice
                        availableForSale
                        inventoryQuantity
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      const variables = { handle, limit };
      const response = await this.makeGraphQLRequest(query, variables);
      return response.data?.collectionByHandle || null;
    } catch (error) {
      console.error("Error fetching collection by handle:", error);
      throw error;
    }
  }
  // Webhook methods
  async registerWebhook(webhookData) {
    const response = await this.makeRequest("/webhooks.json", "POST", {
      webhook: webhookData
    });
    return response.data.webhook;
  }
  async removeWebhook(webhookId) {
    await this.makeRequest(`/webhooks/${webhookId}.json`, "DELETE");
    return { success: true };
  }
  async listWebhooks() {
    const response = await this.makeRequest("/webhooks.json");
    return response.data.webhooks;
  }
  // Analytics and reporting methods
  async getSalesAnalytics(startDate, endDate) {
    const params = { created_at_min: startDate, created_at_max: endDate };
    const orders = await this.getOrders(params);
    const totalSales = orders.orders.reduce(
      (sum, order) => sum + parseFloat(order.total_price),
      0
    );
    const totalOrders = orders.orders.length;
    const averageOrderValue = totalSales / totalOrders || 0;
    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      startDate,
      endDate,
      currency: orders.orders[0]?.currency || "USD"
    };
  }
  async getCustomerAnalytics() {
    const customers = await this.getCustomers({ limit: 250 });
    const total = customers.customers.length;
    return {
      totalCustomers: total
      // Add more metrics as needed
    };
  }
  async getProductAnalytics() {
    const products = await this.getProducts({ limit: 250 });
    const totalProducts = products.products.length;
    const totalInventory = products.products.reduce(
      (sum, product) => {
        const inventoryTotal = product.variants.reduce(
          (variantSum, variant) => variantSum + (variant.inventory_quantity || 0),
          0
        );
        return sum + inventoryTotal;
      },
      0
    );
    return {
      totalProducts,
      totalInventory
      // Add more metrics as needed
    };
  }
  async generateSalesReport(startDate, endDate, format = "json") {
    const params = {
      created_at_min: startDate,
      created_at_max: endDate,
      limit: 250
    };
    const response = await this.getOrders(params);
    const orders = response.orders;
    if (format === "json") {
      return orders;
    } else if (format === "csv") {
      const header = "Order ID,Date,Customer,Total,Status\n";
      const rows = orders.map((order) => {
        return `${order.id},${order.created_at},${order.customer?.email || "N/A"},${order.total_price},${order.financial_status}`;
      }).join("\n");
      return header + rows;
    }
    return orders;
  }
  // Webhook processing methods
  async processNewOrder(orderData) {
    console.log("Processing new order", orderData.id);
    return true;
  }
  async processOrderUpdate(orderData) {
    console.log("Processing order update", orderData.id);
    return true;
  }
  async processProductUpdate(productData) {
    console.log("Processing product update", productData.id);
    return true;
  }
  async processInventoryUpdate(inventoryData) {
    console.log(
      "Processing inventory update for item",
      inventoryData.inventory_item_id
    );
    return true;
  }
  // Helper methods for webhook validation
  validateHmac(body, hmac) {
    const calculatedHmac = crypto.createHmac("sha256", shopifyConfig.apiSecret).update(body, "utf8").digest("base64");
    return calculatedHmac === hmac;
  }
  async getProductByHandle(handle) {
    try {
      const query = `
        query getProductByHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id
            title
            handle
            description
            descriptionHtml
            vendor
            productType
            tags
            images(first: 10) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                  sku
                  availableForSale
                  inventoryQuantity
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            options {
              name
              values
            }
          }
        }
      `;
      const variables = { handle };
      const response = await this.makeGraphQLRequest(query, variables);
      return response.data?.productByHandle || null;
    } catch (error) {
      console.error("Error fetching product by handle:", error);
      throw error;
    }
  }
  // Draft Order methods
  async createDraftOrder(orderData) {
    const draftOrderPayload = {
      ...orderData,
      // Ensure invoice is sent (this generates the invoice_url)
      invoice_sent_at: null,
      // Set up for payment
      use_customer_default_address: orderData.use_customer_default_address || false
    };
    const response = await this.makeRequest("/draft_orders.json", "POST", {
      draft_order: draftOrderPayload
    });
    const draftOrder = response.data.draft_order;
    if (!draftOrder.invoice_url && draftOrder.id) {
      try {
        const invoiceResponse = await this.sendDraftOrderInvoice(draftOrder.id.toString());
        if (invoiceResponse && invoiceResponse.invoice_url) {
          draftOrder.invoice_url = invoiceResponse.invoice_url;
        }
      } catch (error) {
        console.error("Failed to send draft order invoice:", error);
      }
    }
    return draftOrder;
  }
  async sendDraftOrderInvoice(draftOrderId, customMessage) {
    const payload = {};
    if (customMessage) {
      payload.draft_order_invoice = {
        to: null,
        from: null,
        subject: null,
        custom_message: customMessage
      };
    }
    const response = await this.makeRequest(
      `/draft_orders/${draftOrderId}/send_invoice.json`,
      "POST",
      payload
    );
    return response.data.draft_order_invoice;
  }
  async completeDraftOrder(draftOrderId, paymentPending = false) {
    const response = await this.makeRequest(
      `/draft_orders/${draftOrderId}/complete.json`,
      "PUT",
      { payment_pending: paymentPending }
    );
    return response.data.draft_order;
  }
  async getDraftOrder(draftOrderId) {
    const response = await this.makeRequest(`/draft_orders/${draftOrderId}.json`);
    return response.data.draft_order;
  }
};
var shopify_service_default = new ShopifyService();

// src/utils/response.util.ts
var sendResponse = (res, statusCode, message, data, error) => {
  const response = {
    statusCode,
    message,
    ...data && { data },
    ...error && { error }
  };
  return res.status(statusCode).json(response);
};

// src/controllers/shopify.controller.ts
var handleAuthCallback = async (req, res) => {
  try {
    const { code, shop } = req.query;
    const result = await shopify_service_default.handleOAuthCallback(
      code,
      shop
    );
    return sendResponse(res, 200, "Authentication successful", result);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Authentication failed",
      void 0,
      error.message
    );
  }
};
var checkAuthStatus = async (req, res) => {
  try {
    const isValid = await shopify_service_default.validateCurrentSession();
    return sendResponse(res, 200, "Auth status checked", {
      authenticated: isValid
    });
  } catch (error) {
    return sendResponse(
      res,
      401,
      "Authentication check failed",
      { authenticated: false },
      error.message
    );
  }
};
var getProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const collection = req.query.collection;
    const query = req.query.query;
    const sortBy = req.query.sortBy;
    const reverse = req.query.reverse === "true";
    const products = await shopify_service_default.getProducts({
      limit,
      collection_id: collection,
      query,
      sort: sortBy,
      reverse
    });
    return sendResponse(res, 200, "Products retrieved successfully", products);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch products",
      void 0,
      error.message
    );
  }
};
var getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await shopify_service_default.getProduct(id);
    if (!product) {
      return sendResponse(res, 404, "Product not found");
    }
    return sendResponse(res, 200, "Product retrieved successfully", product);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch product",
      void 0,
      error.message
    );
  }
};
var createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const newProduct = await shopify_service_default.createProduct(productData);
    return sendResponse(res, 201, "Product created successfully", newProduct);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to create product",
      void 0,
      error.message
    );
  }
};
var updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    const updatedProduct = await shopify_service_default.updateProduct(id, productData);
    return sendResponse(
      res,
      200,
      "Product updated successfully",
      updatedProduct
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to update product",
      void 0,
      error.message
    );
  }
};
var deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await shopify_service_default.deleteProduct(id);
    return sendResponse(res, 204, "Product deleted successfully");
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to delete product",
      void 0,
      error.message
    );
  }
};
var getProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const variants = await shopify_service_default.getProductVariants(id);
    return sendResponse(
      res,
      200,
      "Product variants retrieved successfully",
      variants
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch product variants",
      void 0,
      error.message
    );
  }
};
var getOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;
    const financialStatus = req.query.financialStatus;
    const fulfillmentStatus = req.query.fulfillmentStatus;
    const orders = await shopify_service_default.getOrders({
      limit,
      // page,
      status,
      financial_status: financialStatus,
      fulfillment_status: fulfillmentStatus
    });
    return sendResponse(res, 200, "Orders retrieved successfully", orders);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch orders",
      void 0,
      error.message
    );
  }
};
var getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await shopify_service_default.getOrder(id);
    if (!order) {
      return sendResponse(res, 404, "Order not found");
    }
    return sendResponse(res, 200, "Order retrieved successfully", order);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch order",
      void 0,
      error.message
    );
  }
};
var createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const draftOrder = await shopify_service_default.createDraftOrder(orderData);
    return sendResponse(res, 201, "Draft order created successfully", {
      draft_order: draftOrder,
      invoice_url: draftOrder.invoice_url,
      // Shopify's payment portal URL
      draft_order_id: draftOrder.id
    });
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to create draft order",
      void 0,
      error.message
    );
  }
};
var updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderData = req.body;
    const updatedOrder = await shopify_service_default.updateOrder(id, orderData);
    return sendResponse(res, 200, "Order updated successfully", updatedOrder);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to update order",
      void 0,
      error.message
    );
  }
};
var getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const orders = await shopify_service_default.getOrdersByStatus(status);
    return sendResponse(res, 200, "Orders retrieved successfully", orders);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch orders by status",
      void 0,
      error.message
    );
  }
};
var fulfillOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const fulfillmentData = req.body;
    const result = await shopify_service_default.fulfillOrder(id, fulfillmentData);
    return sendResponse(res, 200, "Order fulfilled successfully", result);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fulfill order",
      void 0,
      error.message
    );
  }
};
var cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await shopify_service_default.cancelOrder(id);
    return sendResponse(res, 200, "Order cancelled successfully", result);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to cancel order",
      void 0,
      error.message
    );
  }
};
var getCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const query = req.query.query;
    const customers = await shopify_service_default.getCustomers({
      limit,
      page,
      query
    });
    return sendResponse(
      res,
      200,
      "Customers retrieved successfully",
      customers
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch customers",
      void 0,
      error.message
    );
  }
};
var getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await shopify_service_default.getCustomer(id);
    if (!customer) {
      return sendResponse(res, 404, "Customer not found");
    }
    return sendResponse(res, 200, "Customer retrieved successfully", customer);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch customer",
      void 0,
      error.message
    );
  }
};
var createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    const newCustomer = await shopify_service_default.createCustomer(customerData);
    return sendResponse(res, 201, "Customer created successfully", newCustomer);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to create customer",
      void 0,
      error.message
    );
  }
};
var updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = req.body;
    const updatedCustomer = await shopify_service_default.updateCustomer(
      id,
      customerData
    );
    return sendResponse(
      res,
      200,
      "Customer updated successfully",
      updatedCustomer
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to update customer",
      void 0,
      error.message
    );
  }
};
var getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await shopify_service_default.getCustomerOrders(id);
    return sendResponse(
      res,
      200,
      "Customer orders retrieved successfully",
      orders
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch customer orders",
      void 0,
      error.message
    );
  }
};
var searchCustomers = async (req, res) => {
  try {
    const query = req.query.q;
    const customers = await shopify_service_default.searchCustomers(query);
    return sendResponse(res, 200, "Customer search completed", customers);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to search customers",
      void 0,
      error.message
    );
  }
};
var getInventoryLevels = async (req, res) => {
  try {
    const locationId = req.query.location_id;
    const inventoryLevels = await shopify_service_default.getInventoryLevels(locationId);
    res.json(inventoryLevels);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch inventory levels",
      message: error.message
    });
  }
};
var adjustInventory = async (req, res) => {
  try {
    const adjustmentData = req.body;
    const result = await shopify_service_default.adjustInventory(adjustmentData);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to adjust inventory",
      message: error.message
    });
  }
};
var getInventoryLocations = async (req, res) => {
  try {
    const locations = await shopify_service_default.getInventoryLocations();
    res.json(locations);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch inventory locations",
      message: error.message
    });
  }
};
var getCollections = async (req, res) => {
  try {
    const collections = await shopify_service_default.getCollections();
    return sendResponse(
      res,
      200,
      "Collections retrieved successfully",
      collections
    );
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch collections",
      message: error.message
    });
  }
};
var getCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const collection = await shopify_service_default.getCollection(id);
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    res.json(collection);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch collection",
      message: error.message
    });
  }
};
var getCollectionByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const collection = await shopify_service_default.getCollectionByHandle(
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
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch collection by handle",
      message: error.message
    });
  }
};
var getCollectionProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const products = await shopify_service_default.getCollectionProducts(id);
    res.json(products);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch collection products",
      message: error.message
    });
  }
};
var createCollection = async (req, res) => {
  try {
    const collectionData = req.body;
    const newCollection = await shopify_service_default.createCollection(collectionData);
    res.status(201).json(newCollection);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create collection",
      message: error.message
    });
  }
};
var updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const collectionData = req.body;
    const updatedCollection = await shopify_service_default.updateCollection(
      id,
      collectionData
    );
    res.json(updatedCollection);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update collection",
      message: error.message
    });
  }
};
var registerWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const result = await shopify_service_default.registerWebhook(webhookData);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to register webhook",
      message: error.message
    });
  }
};
var removeWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    await shopify_service_default.removeWebhook(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: "Failed to remove webhook",
      message: error.message
    });
  }
};
var listWebhooks = async (req, res) => {
  try {
    const webhooks = await shopify_service_default.listWebhooks();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({
      error: "Failed to list webhooks",
      message: error.message
    });
  }
};
var getSalesAnalytics = async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const analytics = await shopify_service_default.getSalesAnalytics(
      startDate,
      endDate
    );
    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch sales analytics",
      message: error.message
    });
  }
};
var getCustomerAnalytics = async (req, res) => {
  try {
    const analytics = await shopify_service_default.getCustomerAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch customer analytics",
      message: error.message
    });
  }
};
var getProductAnalytics = async (req, res) => {
  try {
    const analytics = await shopify_service_default.getProductAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch product analytics",
      message: error.message
    });
  }
};
var generateSalesReport = async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const format = req.query.format || "json";
    const report = await shopify_service_default.generateSalesReport(
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
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate sales report",
      message: error.message
    });
  }
};
var getProductByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    const product = await shopify_service_default.getProductByHandle(handle);
    if (!product) {
      return sendResponse(res, 404, "Product not found");
    }
    return sendResponse(res, 200, "Product retrieved successfully", product);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to fetch product by handle",
      void 0,
      error.message
    );
  }
};

// src/controllers/webhook.controller.ts
var orderCreated = async (req, res) => {
  try {
    const orderData = req.body;
    await shopify_service_default.processNewOrder(orderData);
    res.status(200).send();
  } catch (error) {
    console.error("Error processing order created webhook:", error);
    res.status(200).send();
  }
};
var orderUpdated = async (req, res) => {
  try {
    const orderData = req.body;
    await shopify_service_default.processOrderUpdate(orderData);
    res.status(200).send();
  } catch (error) {
    console.error("Error processing order updated webhook:", error);
    res.status(200).send();
  }
};
var productUpdated = async (req, res) => {
  try {
    const productData = req.body;
    await shopify_service_default.processProductUpdate(productData);
    res.status(200).send();
  } catch (error) {
    console.error("Error processing product updated webhook:", error);
    res.status(200).send();
  }
};
var inventoryUpdated = async (req, res) => {
  try {
    const inventoryData = req.body;
    await shopify_service_default.processInventoryUpdate(inventoryData);
    res.status(200).send();
  } catch (error) {
    console.error("Error processing inventory updated webhook:", error);
    res.status(200).send();
  }
};
var validateShopifyWebhook = (req, res, next) => {
  try {
    const hmacHeader = req.header("X-Shopify-Hmac-Sha256");
    if (!hmacHeader) {
      return res.status(401).json({ error: "Missing HMAC header" });
    }
    const body = JSON.stringify(req.body);
    const calculatedHmac = crypto__default.default.createHmac("sha256", shopifyConfig.apiSecret).update(body, "utf8").digest("base64");
    if (calculatedHmac !== hmacHeader) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    const shopDomain = req.header("X-Shopify-Shop-Domain");
    if (shopDomain && !shopDomain.includes(shopifyConfig.storeUrl)) {
      return res.status(401).json({ error: "Invalid shop domain" });
    }
    const topic = req.header("X-Shopify-Topic");
    if (!topic) {
      return res.status(400).json({ error: "Missing webhook topic" });
    }
    next();
  } catch (error) {
    console.error("Webhook validation error:", error);
    res.status(500).json({ error: "Failed to validate webhook" });
  }
};
var EUserRole = /* @__PURE__ */ ((EUserRole3) => {
  EUserRole3["client"] = "client";
  EUserRole3["admin"] = "admin";
  EUserRole3["superAdmin"] = "super_admin";
  return EUserRole3;
})(EUserRole || {});
var UserSchema = new mongoose6.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  address: {
    street: {
      type: String,
      trim: true,
      required: false
    },
    city: {
      type: String,
      trim: true,
      required: false
    },
    state: {
      type: String,
      trim: true,
      required: false
    },
    zip: {
      type: String,
      trim: true,
      required: false
    },
    country: {
      type: String,
      trim: true,
      required: false
    }
  },
  role: {
    type: String,
    enum: Object.values(EUserRole),
    default: "client" /* client */
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  wishlisted: {
    type: [String],
    default: []
  }
}, { timestamps: true });
UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt__default.default.genSalt(10);
    this.password = await bcrypt__default.default.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt__default.default.compare(candidatePassword, this.password);
};
var user_model_default = mongoose6__default.default.model("User", UserSchema);

// src/middleware/auth.middleware.ts
var validateUserAccess = async (req, res, next) => {
  try {
    let token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt__default.default.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await user_model_default.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.verified) {
      return res.status(403).json({ error: "User not verified" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
var validateAdminAccess = async (req, res, next) => {
  try {
    let token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt__default.default.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await user_model_default.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role !== "admin" /* admin */ && user.role !== "super_admin" /* superAdmin */) {
      return res.status(403).json({ error: "Access denied" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
var validateSuperAdminAccess = async (req, res, next) => {
  try {
    let token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt__default.default.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await user_model_default.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role !== "super_admin" /* superAdmin */) {
      return res.status(403).json({ error: "Super admin access required" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};

// src/routes/shopify.routes.ts
var shopifyRouter = express7.Router();
shopifyRouter.post("/auth/callback", handleAuthCallback);
shopifyRouter.get("/auth/status", checkAuthStatus);
shopifyRouter.get("/products", getProducts);
shopifyRouter.get("/products/:id", getProduct);
shopifyRouter.get(
  "/products/handle/:handle",
  getProductByHandle
);
shopifyRouter.post(
  "/products",
  validateAdminAccess,
  createProduct
);
shopifyRouter.put(
  "/products/:id",
  validateAdminAccess,
  updateProduct
);
shopifyRouter.delete(
  "/products/:id",
  validateAdminAccess,
  deleteProduct
);
shopifyRouter.get(
  "/products/:id/variants",
  getProductVariants
);
shopifyRouter.get("/orders", getOrders);
shopifyRouter.get("/orders/:id", getOrder);
shopifyRouter.post(
  "/orders",
  createOrder
);
shopifyRouter.put(
  "/orders/:id",
  validateAdminAccess,
  updateOrder
);
shopifyRouter.get(
  "/orders/status/:status",
  getOrdersByStatus
);
shopifyRouter.post(
  "/orders/:id/fulfill",
  validateAdminAccess,
  fulfillOrder
);
shopifyRouter.post(
  "/orders/:id/cancel",
  validateAdminAccess,
  cancelOrder
);
shopifyRouter.get("/customers", getCustomers);
shopifyRouter.get("/customers/:id", getCustomer);
shopifyRouter.post(
  "/customers",
  validateAdminAccess,
  createCustomer
);
shopifyRouter.put(
  "/customers/:id",
  validateAdminAccess,
  updateCustomer
);
shopifyRouter.get("/customers/:id/orders", getCustomerOrders);
shopifyRouter.get("/customers/search", searchCustomers);
shopifyRouter.get("/inventory", getInventoryLevels);
shopifyRouter.post(
  "/inventory/adjust",
  validateAdminAccess,
  adjustInventory
);
shopifyRouter.get(
  "/inventory/locations",
  getInventoryLocations
);
shopifyRouter.get("/collections", getCollections);
shopifyRouter.get("/collections/:id", getCollection);
shopifyRouter.get(
  "/collections/handle/:handle",
  getCollectionByHandle
);
shopifyRouter.get(
  "/collections/:id/products",
  getCollectionProducts
);
shopifyRouter.post(
  "/collections",
  validateAdminAccess,
  createCollection
);
shopifyRouter.put(
  "/collections/:id",
  validateAdminAccess,
  updateCollection
);
shopifyRouter.post(
  "/webhooks",
  validateAdminAccess,
  registerWebhook
);
shopifyRouter.delete(
  "/webhooks/:id",
  validateAdminAccess,
  removeWebhook
);
shopifyRouter.get(
  "/webhooks",
  validateAdminAccess,
  listWebhooks
);
shopifyRouter.post(
  "/webhook/order-created",
  validateShopifyWebhook,
  orderCreated
);
shopifyRouter.post(
  "/webhook/order-updated",
  validateShopifyWebhook,
  orderUpdated
);
shopifyRouter.post(
  "/webhook/product-updated",
  validateShopifyWebhook,
  productUpdated
);
shopifyRouter.post(
  "/webhook/inventory-updated",
  validateShopifyWebhook,
  inventoryUpdated
);
shopifyRouter.get(
  "/analytics/sales",
  validateAdminAccess,
  getSalesAnalytics
);
shopifyRouter.get(
  "/analytics/customers",
  validateAdminAccess,
  getCustomerAnalytics
);
shopifyRouter.get(
  "/analytics/products",
  validateAdminAccess,
  getProductAnalytics
);
shopifyRouter.get(
  "/reports/sales",
  validateAdminAccess,
  generateSalesReport
);
var shopify_routes_default = shopifyRouter;
var sendTokenResponse = (user, statusCode, res, req) => {
  const userAgent = req.headers["user-agent"] || "unknown";
  const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
  const token = jwt__default.default.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      fingerprint: {
        userAgent: userAgent.substring(0, 100),
        // Limit length for security
        ip: ipAddress
      },
      // Adding version number for future JWT structure changes
      version: 1
    },
    process.env.JWT_SECRET || "your-secret-key",
    {
      expiresIn: "24h"
      // Longer expiry time to prevent frequent auth issues
    }
  );
  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1e3),
    // 24 hours
    httpOnly: true,
    secure: true,
    // Required for SameSite=None
    sameSite: "none",
    // Allow cross-site cookies in both environments
    path: "/"
    // Ensure cookie is sent for all paths
  };
  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    token,
    data: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
};
var register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const emailExists = await user_model_default.findOne({ email });
    if (emailExists) {
      res.status(400).json({ message: "Email already registered" });
      return;
    }
    if (phone) {
      const phoneExists = await user_model_default.findOne({ phone });
      if (phoneExists) {
        res.status(400).json({ message: "Phone number already registered" });
        return;
      }
    }
    const user = await user_model_default.create({
      name,
      email,
      password,
      ...phone ? { phone } : {}
    });
    sendTokenResponse(user, 201, res, req);
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Please provide email and password" });
      return;
    }
    const user = await user_model_default.findOne({ email }).select("+password");
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    try {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      sendTokenResponse(user, 200, res, req);
    } catch (error) {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
var logout = (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
  };
  res.clearCookie("token", cookieOptions);
  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
};
var getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
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
        address: req.user.address || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user", error: error.message });
  }
};
var refreshToken = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    sendTokenResponse(req.user, 200, res, req);
  } catch (error) {
    res.status(500).json({ message: "Token refresh failed", error: error.message });
  }
};
var updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { name, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    const user = await user_model_default.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(404).json({ message: "User not found" });
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
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Profile update failed", error: error.message });
  }
};
var changePassword = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Please provide both current and new password" });
      return;
    }
    const user = await user_model_default.findById(req.user._id).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }
    user.password = newPassword;
    await user.save();
    sendTokenResponse(user, 200, res, req);
  } catch (error) {
    res.status(500).json({ message: "Password change failed", error: error.message });
  }
};

// src/routes/auth.routes.ts
var router = express7__default.default.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", validateUserAccess, getCurrentUser);
router.get("/refresh-token", validateUserAccess, refreshToken);
router.put("/update-profile", validateUserAccess, updateProfile);
router.put("/change-password", validateUserAccess, changePassword);
var auth_routes_default = router;
var PageSchema = new mongoose6.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    path: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    data: {
      type: mongoose6.Schema.Types.Mixed,
      default: {}
    },
    updatedBy: {
      type: mongoose6.Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    createdBy: {
      type: mongoose6.Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);
var Page = mongoose6__default.default.model("Page", PageSchema);
var MAX_FILE_SIZE = 10 * 1024 * 1024;
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || ""
});
var homepageStorage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "shopify-ui/homepage",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ],
    resource_type: "image",
    public_id: (req, file) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" }
    ]
  }
});
var homepageUploadMiddleware = multer__default.default({
  storage: homepageStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"));
    }
  }
});
var testimonialStorage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "shopify-ui/testimonials",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ],
    resource_type: "image",
    public_id: (req, file) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
      { width: 400, height: 400, crop: "fill" }
      // Square format for testimonial avatars
    ]
  }
});
var testimonialUploadMiddleware = multer__default.default({
  storage: testimonialStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"));
    }
  }
});
var reviewStorage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "shopify-ui/reviews",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ],
    resource_type: "image",
    public_id: (req, file) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public",
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
      { width: 800, height: 600, crop: "limit" }
      // Limit size for review images
    ]
  }
});
var reviewUploadMiddleware = multer__default.default({
  storage: reviewStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed"));
    }
  }
});
var legalDocumentStorage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "shopify-ui/legal-documents",
    resource_type: "raw",
    // Use 'raw' for non-image files
    public_id: (req, file) => {
      const filename = `${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      return filename;
    },
    access_mode: "public"
    // Remove allowed_formats for raw files - Cloudinary doesn't use this for raw uploads
  }
});
var legalDocumentUploadMiddleware = multer__default.default({
  storage: legalDocumentStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = [
      "text/markdown",
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream"
      // Some browsers send .md files as this
    ];
    const isMarkdownFile = file.originalname.toLowerCase().endsWith(".md");
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
    if (isMarkdownFile || isMimeTypeAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Only document files (MD, TXT, PDF, DOC, DOCX) are allowed"));
    }
  }
});
var upload = {
  homepage: {
    single: (fieldName) => homepageUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 10) => {
      return (req, res, next) => {
        homepageUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
                  error: "FILE_TOO_LARGE"
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR"
              });
            }
            next();
          }
        );
      };
    },
    any: () => {
      return (req, res, next) => {
        homepageUploadMiddleware.any()(req, res, (err) => {
          if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res.status(413).json({
                success: false,
                message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
                error: "FILE_TOO_LARGE"
              });
            }
            return res.status(400).json({
              success: false,
              message: err.message,
              error: "UPLOAD_ERROR"
            });
          }
          next();
        });
      };
    },
    fields: (fields) => {
      return (req, res, next) => {
        homepageUploadMiddleware.fields(fields)(req, res, (err) => {
          if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return res.status(413).json({
                success: false,
                message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
                error: "FILE_TOO_LARGE"
              });
            }
            return res.status(400).json({
              success: false,
              message: err.message,
              error: "UPLOAD_ERROR"
            });
          }
          next();
        });
      };
    },
    optional: (fieldName) => (req, res, next) => {
      if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
        return next();
      }
      homepageUploadMiddleware.single(fieldName)(req, res, (err) => {
        if (err) {
          return res.status(400).json({ message: err.message });
        }
        next();
      });
    }
  },
  testimonial: {
    single: (fieldName) => testimonialUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 10) => {
      return (req, res, next) => {
        testimonialUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
                  error: "FILE_TOO_LARGE"
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR"
              });
            }
            next();
          }
        );
      };
    }
  },
  review: {
    single: (fieldName) => reviewUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        reviewUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
                  error: "FILE_TOO_LARGE"
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR"
              });
            }
            next();
          }
        );
      };
    }
  },
  legalDocument: {
    single: (fieldName) => legalDocumentUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        legalDocumentUploadMiddleware.array(fieldName, maxCount)(
          req,
          res,
          (err) => {
            if (err) {
              if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                  success: false,
                  message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
                  error: "FILE_TOO_LARGE"
                });
              }
              return res.status(400).json({
                success: false,
                message: err.message,
                error: "UPLOAD_ERROR"
              });
            }
            next();
          }
        );
      };
    },
    optional: (fieldName) => (req, res, next) => {
      if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
        return next();
      }
      legalDocumentUploadMiddleware.single(fieldName)(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        next();
      });
    }
  }
};
var deleteImage = async (publicId) => {
  try {
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
  }
};
var getPublicIdFromUrl = (url) => {
  const splits = url.split("/");
  const filename = splits[splits.length - 1] || "";
  let folderPath = "shopify-ui/homepage/";
  if (url.includes("/testimonials/")) {
    folderPath = "shopify-ui/testimonials/";
  } else if (url.includes("/legal-documents/")) {
    folderPath = "shopify-ui/legal-documents/";
  } else if (url.includes("/reviews/")) {
    folderPath = "shopify-ui/reviews/";
  }
  return `${folderPath}${filename.split(".")[0]}`;
};

// src/utils/homepage.helpers.ts
var handleHomepageImageUploads = async (data, files, oldData) => {
  const updatedData = { ...data };
  const filesMap = {};
  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (!filesMap[file.fieldname]) {
        filesMap[file.fieldname] = [];
      }
      filesMap[file.fieldname].push(file);
    });
  } else {
    Object.assign(filesMap, files);
  }
  if (updatedData.hero?.slides) {
    for (let i = 0; i < updatedData.hero.slides.length; i++) {
      const fieldName = `hero_slide_${i}`;
      if (filesMap[fieldName] && filesMap[fieldName][0]) {
        if (oldData?.hero?.slides?.[i]?.imageUrl) {
          const oldPublicId = getPublicIdFromUrl(oldData.hero.slides[i].imageUrl);
          await deleteImage(oldPublicId);
        }
        const imageUrl = filesMap[fieldName][0].path || filesMap[fieldName][0].location || filesMap[fieldName][0].secure_url;
        updatedData.hero.slides[i].imageUrl = imageUrl;
      }
    }
  }
  if (updatedData.fashion?.banners) {
    for (let i = 0; i < updatedData.fashion.banners.length; i++) {
      const fieldName = `fashion_banner_${i}`;
      if (filesMap[fieldName] && filesMap[fieldName][0]) {
        if (oldData?.fashion?.banners?.[i]?.imageUrl) {
          const oldPublicId = getPublicIdFromUrl(oldData.fashion.banners[i].imageUrl);
          await deleteImage(oldPublicId);
        }
        const imageUrl = filesMap[fieldName][0].path || filesMap[fieldName][0].location || filesMap[fieldName][0].secure_url;
        updatedData.fashion.banners[i].imageUrl = imageUrl;
      }
    }
  }
  for (let i = 0; i < (updatedData.banners?.length || 0); i++) {
    const fieldName = `banner_${i}`;
    if (filesMap[fieldName] && filesMap[fieldName][0] && updatedData.banners[i]) {
      if (oldData?.banners?.[i]?.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(oldData.banners[i].imageUrl);
        await deleteImage(oldPublicId);
      }
      const imageUrl = filesMap[fieldName][0].path || filesMap[fieldName][0].location || filesMap[fieldName][0].secure_url;
      updatedData.banners[i].imageUrl = imageUrl;
    }
  }
  return updatedData;
};
var deleteHomepageImages = async (data) => {
  try {
    if (data.hero?.slides) {
      for (const slide of data.hero.slides) {
        if (slide.imageUrl) {
          const publicId = getPublicIdFromUrl(slide.imageUrl);
          await deleteImage(publicId);
        }
      }
    }
    if (data.fashion?.banners) {
      for (const banner of data.fashion.banners) {
        if (banner.imageUrl) {
          const publicId = getPublicIdFromUrl(banner.imageUrl);
          await deleteImage(publicId);
        }
      }
    }
    if (data.banners) {
      for (const banner of data.banners) {
        if (banner.imageUrl) {
          const publicId = getPublicIdFromUrl(banner.imageUrl);
          await deleteImage(publicId);
        }
      }
    }
  } catch (error) {
    console.error("Error deleting homepage images:", error);
  }
};

// src/utils/imageUpload.helpers.ts
var handleOptionalImageUpload = async (req, currentImageUrl, multiple = false) => {
  if (multiple) {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return void 0;
    }
    if (currentImageUrl && Array.isArray(currentImageUrl)) {
      for (const imageUrl of currentImageUrl) {
        const oldPublicId = getPublicIdFromUrl(imageUrl);
        await deleteImage(oldPublicId);
      }
    }
    return req.files.map((file) => file.path || file.location || file.secure_url || "");
  } else {
    if (!req.file) {
      return void 0;
    }
    if (currentImageUrl && typeof currentImageUrl === "string") {
      const oldPublicId = getPublicIdFromUrl(currentImageUrl);
      await deleteImage(oldPublicId);
    }
    return req.file.path || req.file.location || req.file.secure_url || "";
  }
};
var deleteImageFromUrl = async (imageUrl) => {
  if (imageUrl) {
    const publicId = getPublicIdFromUrl(imageUrl);
    await deleteImage(publicId);
  }
};
var getTestimonialUploadMiddleware = () => {
  return (req, res, next) => {
    const singleUpload = upload.testimonial.single("image");
    singleUpload(req, res, (err) => {
      if (err && err.code !== "LIMIT_UNEXPECTED_FILE") {
        return next(err);
      }
      next();
    });
  };
};
var getReviewUploadMiddleware = () => {
  return (req, res, next) => {
    const multipleUpload = upload.review.array("images", 5);
    multipleUpload(req, res, (err) => {
      if (err && err.code !== "LIMIT_UNEXPECTED_FILE") {
        return next(err);
      }
      next();
    });
  };
};
var getHomepageUploadMiddleware = () => {
  return upload.homepage.any();
};
var createPage = async (req, res) => {
  try {
    const { name, path, data } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const newPage = new Page({
      name,
      path,
      data,
      createdBy: userId,
      updatedBy: userId
    });
    const savedPage = await newPage.save();
    res.status(201).json({
      success: true,
      message: "Page created successfully",
      data: savedPage
    });
  } catch (error) {
    if (error.code === 11e3) {
      return res.status(400).json({
        success: false,
        message: "Page with this path already exists"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating page",
      error: error.message
    });
  }
};
var getAllPages = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (isActive !== void 0) {
      filter.isActive = isActive === "true";
    }
    const skip = (Number(page) - 1) * Number(limit);
    const pages = await Page.find(filter).populate("createdBy updatedBy", "name email").sort({ updatedAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Page.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: {
        pages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pages",
      error: error.message
    });
  }
};
var getPage = async (req, res) => {
  try {
    const { identifier } = req.params;
    const page = await Page.findOne({
      $or: [
        { _id: identifier },
        { path: identifier }
      ]
    }).populate("createdBy updatedBy", "name email");
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found"
      });
    }
    res.status(200).json({
      success: true,
      data: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching page",
      error: error.message
    });
  }
};
var updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, path, data, isActive } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found"
      });
    }
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON data format"
        });
      }
    }
    let updatedData = data;
    if (data && req.files) {
      updatedData = await handleHomepageImageUploads(data, req.files, page.data);
    }
    const updateFields = {
      updatedBy: userId,
      version: page.version + 1
    };
    if (name !== void 0) updateFields.name = name;
    if (path !== void 0) updateFields.path = path;
    if (updatedData !== void 0) updateFields.data = updatedData;
    if (isActive !== void 0) updateFields.isActive = isActive;
    const updatedPage = await Page.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate("createdBy updatedBy", "name email");
    res.status(200).json({
      success: true,
      message: "Page updated successfully",
      data: updatedPage
    });
  } catch (error) {
    if (error.code === 11e3) {
      return res.status(400).json({
        success: false,
        message: "Page with this path already exists"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating page",
      error: error.message
    });
  }
};
var deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found"
      });
    }
    await deleteHomepageImages(page.data);
    await Page.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Page deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting page",
      error: error.message
    });
  }
};
var getHomepage = async (req, res) => {
  try {
    const homepage = await Page.findOne({ path: "/homepage" }).populate("createdBy updatedBy", "name email");
    if (!homepage) {
      return res.status(404).json({
        success: false,
        message: "Homepage not found"
      });
    }
    res.status(200).json({
      success: true,
      data: homepage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching homepage",
      error: error.message
    });
  }
};
var createHomepage = async (req, res) => {
  try {
    let { data } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const existingHomepage = await Page.findOne({ path: "/homepage" });
    if (existingHomepage) {
      return res.status(409).json({
        success: false,
        message: "Homepage already exists. Use update endpoint to modify it."
      });
    }
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON data format"
        });
      }
    }
    let homepageData = data;
    if (data && req.files) {
      homepageData = await handleHomepageImageUploads(data, req.files);
    }
    const newHomepage = new Page({
      name: "Homepage",
      path: "/homepage",
      data: homepageData,
      createdBy: userId,
      updatedBy: userId
    });
    const savedHomepage = await newHomepage.save();
    res.status(201).json({
      success: true,
      message: "Homepage created successfully",
      data: savedHomepage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating homepage",
      error: error.message
    });
  }
};
var updateHomepage = async (req, res) => {
  try {
    let { data, isActive } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const homepage = await Page.findOne({ path: "/homepage" });
    if (!homepage) {
      return res.status(404).json({
        success: false,
        message: "Homepage not found. Create it first."
      });
    }
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON data format"
        });
      }
    }
    let updatedData = data;
    if (data && req.files) {
      updatedData = await handleHomepageImageUploads(data, req.files, homepage.data);
    }
    const updateFields = {
      updatedBy: userId,
      version: homepage.version + 1
    };
    if (updatedData !== void 0) updateFields.data = updatedData;
    if (isActive !== void 0) updateFields.isActive = isActive;
    const updatedHomepage = await Page.findOneAndUpdate(
      { path: "/homepage" },
      updateFields,
      { new: true, runValidators: true }
    ).populate("createdBy updatedBy", "name email");
    res.status(200).json({
      success: true,
      message: "Homepage updated successfully",
      data: updatedHomepage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating homepage",
      error: error.message
    });
  }
};
var deleteHomepage = async (req, res) => {
  try {
    const homepage = await Page.findOne({ path: "/homepage" });
    if (!homepage) {
      return res.status(404).json({
        success: false,
        message: "Homepage not found"
      });
    }
    await deleteHomepageImages(homepage.data);
    await Page.findOneAndDelete({ path: "/homepage" });
    res.status(200).json({
      success: true,
      message: "Homepage deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting homepage",
      error: error.message
    });
  }
};
var LEGAL_PAGE_TYPES = {
  PRIVACY_POLICY: "/legal/privacy-policy",
  TERMS_OF_SERVICE: "/legal/terms-of-service",
  COOKIE_POLICY: "/legal/cookie-policy",
  REFUND_POLICY: "/legal/refund-policy",
  SHIPPING_POLICY: "/legal/shipping-policy"
};
var getAllLegalPages = async (req, res) => {
  try {
    const legalPages = await Page.find({
      path: { $regex: "^/legal/" }
    }).populate("createdBy updatedBy", "name email").sort({ path: 1 });
    res.status(200).json({
      success: true,
      data: legalPages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching legal pages",
      error: error.message
    });
  }
};
var getLegalPageByType = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = Object.keys(LEGAL_PAGE_TYPES).map(
      (key) => key.toLowerCase().replace(/_/g, "-")
    );
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid legal page type"
      });
    }
    const path = `/legal/${type}`;
    const legalPage = await Page.findOne({ path }).populate("createdBy updatedBy", "name email");
    if (!legalPage) {
      return res.status(404).json({
        success: false,
        message: "Legal page not found"
      });
    }
    res.status(200).json({
      success: true,
      data: legalPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching legal page",
      error: error.message
    });
  }
};
var createOrUpdateLegalPage = async (req, res) => {
  try {
    const { type } = req.params;
    let { data, isActive } = req.body;
    const userId = req.user?.id;
    const uploadedFile = req.file;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const validTypes = Object.keys(LEGAL_PAGE_TYPES).map(
      (key) => key.toLowerCase().replace(/_/g, "-")
    );
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid legal page type"
      });
    }
    const path = `/legal/${type}`;
    const pageName = type.split("-").map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON data format"
        });
      }
    }
    if (!data) {
      data = {};
    }
    const existingPage = await Page.findOne({ path });
    if (!existingPage && !uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Markdown file is required for new legal pages"
      });
    }
    if (uploadedFile) {
      try {
        let markdownContent = "";
        let fileUrl = "";
        if (uploadedFile.secure_url) {
          fileUrl = uploadedFile.secure_url;
          try {
            const response = await axios__default.default.get(fileUrl);
            markdownContent = response.data;
          } catch (fetchError) {
            throw new Error("Failed to fetch file content from Cloudinary");
          }
        } else if (uploadedFile.url) {
          fileUrl = uploadedFile.url;
          try {
            const response = await axios__default.default.get(fileUrl);
            markdownContent = response.data;
          } catch (fetchError) {
            throw new Error("Failed to fetch file content from Cloudinary");
          }
        } else if (uploadedFile.path && uploadedFile.path.startsWith("http")) {
          fileUrl = uploadedFile.path;
          try {
            const response = await axios__default.default.get(fileUrl);
            markdownContent = response.data;
          } catch (fetchError) {
            throw new Error("Failed to fetch file content from Cloudinary");
          }
        } else if (uploadedFile.path && fs__default.default.existsSync(uploadedFile.path)) {
          markdownContent = fs__default.default.readFileSync(uploadedFile.path, "utf8");
          fileUrl = `local://${uploadedFile.path}`;
        } else if (uploadedFile.buffer) {
          markdownContent = uploadedFile.buffer.toString("utf8");
          fileUrl = "buffer://uploaded-file";
        } else {
          return res.status(400).json({
            success: false,
            message: "Unable to access uploaded file content. Please try uploading again."
          });
        }
        data.markdownUrl = fileUrl;
        data.content = markdownContent;
        data.contentType = "markdown";
        if (uploadedFile.path && fs__default.default.existsSync(uploadedFile.path) && fileUrl.startsWith("http")) {
          fs__default.default.unlinkSync(uploadedFile.path);
        }
      } catch (fileError) {
        return res.status(400).json({
          success: false,
          message: "Error processing uploaded Markdown file",
          error: fileError.message
        });
      }
    }
    if (existingPage) {
      const updateFields = {
        updatedBy: userId,
        version: existingPage.version + 1
      };
      if (data !== void 0 && Object.keys(data).length > 0) {
        updateFields.data = {
          ...existingPage.data,
          ...data,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      if (isActive !== void 0) updateFields.isActive = isActive;
      const updatedPage = await Page.findOneAndUpdate(
        { path },
        updateFields,
        { new: true, runValidators: true }
      ).populate("createdBy updatedBy", "name email");
      res.status(200).json({
        success: true,
        message: `${pageName} updated successfully`,
        data: updatedPage
      });
    } else {
      const pageData = {
        ...data,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      const newPageData = {
        name: pageName,
        path,
        data: pageData,
        createdBy: userId,
        updatedBy: userId,
        isActive: isActive !== void 0 ? isActive : true
      };
      const newPage = new Page(newPageData);
      const savedPage = await newPage.save();
      res.status(201).json({
        success: true,
        message: `${pageName} created successfully`,
        data: savedPage
      });
    }
  } catch (error) {
    if (error.message && error.message.includes("file format not allowed")) {
      return res.status(400).json({
        success: false,
        message: "File format not supported. Please upload a valid Markdown (.md) file.",
        error: "UNSUPPORTED_FILE_FORMAT"
      });
    }
    if (error.code === 11e3) {
      if (error.keyPattern && error.keyPattern.path) {
        return res.status(400).json({
          success: false,
          message: "A legal page with this path already exists"
        });
      }
      return res.status(400).json({
        success: false,
        message: "Duplicate entry detected. Please try again."
      });
    }
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating/updating legal page",
      error: error.message
    });
  }
};
var deleteLegalPage = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = Object.keys(LEGAL_PAGE_TYPES).map(
      (key) => key.toLowerCase().replace(/_/g, "-")
    );
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid legal page type"
      });
    }
    const path = `/legal/${type}`;
    const legalPage = await Page.findOne({ path });
    if (!legalPage) {
      return res.status(404).json({
        success: false,
        message: "Legal page not found"
      });
    }
    await Page.findOneAndDelete({ path });
    const pageName = type.split("-").map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
    res.status(200).json({
      success: true,
      message: `${pageName} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting legal page",
      error: error.message
    });
  }
};
var getLegalPageTypes = async (req, res) => {
  try {
    const types = Object.keys(LEGAL_PAGE_TYPES).map((key) => ({
      key: key.toLowerCase().replace(/_/g, "-"),
      name: key.split("_").map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" "),
      path: LEGAL_PAGE_TYPES[key]
    }));
    res.status(200).json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching legal page types",
      error: error.message
    });
  }
};
var uploadHomepageImages = getHomepageUploadMiddleware();
var uploadLegalDocument = upload.legalDocument.single("markdownFile");

// src/routes/pages.routes.ts
var pagesRouter = express7__default.default.Router();
pagesRouter.get("/homepage", getHomepage);
pagesRouter.get("/legal", getAllLegalPages);
pagesRouter.get("/legal/types", getLegalPageTypes);
pagesRouter.get("/legal/:type", getLegalPageByType);
pagesRouter.use(validateUserAccess);
pagesRouter.use(validateAdminAccess);
pagesRouter.post("/homepage", uploadHomepageImages, createHomepage);
pagesRouter.put("/homepage", uploadHomepageImages, updateHomepage);
pagesRouter.delete("/homepage", deleteHomepage);
pagesRouter.put("/legal/:type", uploadLegalDocument, createOrUpdateLegalPage);
pagesRouter.delete("/legal/:type", deleteLegalPage);
pagesRouter.get("/", getAllPages);
pagesRouter.get("/:identifier", getPage);
pagesRouter.post("/", uploadHomepageImages, createPage);
pagesRouter.put("/:id", uploadHomepageImages, updatePage);
pagesRouter.delete("/:id", deletePage);
var pages_routes_default = pagesRouter;
var testimonialSchema = new mongoose6.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    stars: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },
    published: {
      type: Boolean,
      default: false
    },
    quote: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String,
      required: false
      // Made optional
    },
    occupation: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);
var Testimonial = mongoose6__default.default.model("Testimonial", testimonialSchema);

// src/controllers/testimonial.controller.ts
var getAllTestimonials = async (req, res) => {
  try {
    const { published, page = 1, limit = 10, stars, search } = req.query;
    const filter = {};
    if (published !== void 0) {
      filter.published = published === "true";
    }
    if (stars) {
      filter.stars = { $gte: Number(stars) };
    }
    if (search && search.toString().trim()) {
      filter.name = { $regex: search.toString().trim(), $options: "i" };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const testimonials = await Testimonial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Testimonial.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: {
        testimonials,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials",
      error: error.message
    });
  }
};
var getPublishedTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 6, stars } = req.query;
    const filter = { published: true };
    if (stars) {
      filter.stars = { $gte: Number(stars) };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const testimonials = await Testimonial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Testimonial.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: {
        testimonials,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching published testimonials",
      error: error.message
    });
  }
};
var getTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    res.status(200).json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching testimonial",
      error: error.message
    });
  }
};
var createTestimonial = async (req, res) => {
  try {
    const { name, stars, quote, occupation, location, published = false } = req.body;
    if (!name || !stars || !quote || !occupation || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields except image are required"
      });
    }
    if (stars < 0 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: "Stars must be between 0 and 5"
      });
    }
    const imageUrl = await handleOptionalImageUpload(req);
    const newTestimonial = new Testimonial({
      name,
      stars: Number(stars),
      quote,
      imageUrl,
      // Will be undefined if no image uploaded
      occupation,
      location,
      published: published === "true" || published === true
    });
    const savedTestimonial = await newTestimonial.save();
    res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: savedTestimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating testimonial",
      error: error.message
    });
  }
};
var updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stars, quote, occupation, location, published } = req.body;
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    if (stars !== void 0 && (stars < 0 || stars > 5)) {
      return res.status(400).json({
        success: false,
        message: "Stars must be between 0 and 5"
      });
    }
    const updateFields = {};
    if (name !== void 0) updateFields.name = name;
    if (stars !== void 0) updateFields.stars = Number(stars);
    if (quote !== void 0) updateFields.quote = quote;
    if (occupation !== void 0) updateFields.occupation = occupation;
    if (location !== void 0) updateFields.location = location;
    if (published !== void 0) updateFields.published = published === "true" || published === true;
    const newImageUrl = await handleOptionalImageUpload(req, testimonial.imageUrl);
    if (newImageUrl) {
      updateFields.imageUrl = newImageUrl;
    }
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );
    res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: updatedTestimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating testimonial",
      error: error.message
    });
  }
};
var togglePublishStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;
    if (published === void 0) {
      return res.status(400).json({
        success: false,
        message: "Published status is required"
      });
    }
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      { published: published === "true" || published === true },
      { new: true, runValidators: true }
    );
    res.status(200).json({
      success: true,
      message: `Testimonial ${updatedTestimonial?.published ? "published" : "unpublished"} successfully`,
      data: updatedTestimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating testimonial publish status",
      error: error.message
    });
  }
};
var deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    if (testimonial.imageUrl) {
      await deleteImageFromUrl(testimonial.imageUrl);
    }
    await Testimonial.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting testimonial",
      error: error.message
    });
  }
};
var uploadTestimonialImage = getTestimonialUploadMiddleware();

// src/routes/testimonials.routes.ts
var testimonialsRouter = express7__default.default.Router();
testimonialsRouter.get("/", getAllTestimonials);
testimonialsRouter.get("/published", getPublishedTestimonials);
testimonialsRouter.get("/:id", getTestimonial);
testimonialsRouter.use(validateUserAccess);
testimonialsRouter.use(validateAdminAccess);
testimonialsRouter.post("/", uploadTestimonialImage, createTestimonial);
testimonialsRouter.put("/:id", uploadTestimonialImage, updateTestimonial);
testimonialsRouter.delete("/:id", deleteTestimonial);
testimonialsRouter.patch("/:id/publish", togglePublishStatus);
var testimonials_routes_default = testimonialsRouter;
var InquirySchema = new mongoose6.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  message: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose6.Schema.Types.ObjectId, required: false, ref: "User" },
  resolvingMessage: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, required: false }
});
var Inquiry = mongoose6__default.default.model("Inquiry", InquirySchema);

// src/controllers/inquiry.controller.ts
var getAllInquiries = async (req, res) => {
  try {
    const { resolved, page = 1, limit = 10, search } = req.query;
    const filter = {};
    if (resolved !== void 0) {
      filter.resolved = resolved === "true";
    }
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const inquiries = await Inquiry.find(filter).populate("resolvedBy", "name email").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inquiries",
      error: error.message
    });
  }
};
var getInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id).populate("resolvedBy", "name email");
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found"
      });
    }
    res.status(200).json({
      success: true,
      data: inquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry",
      error: error.message
    });
  }
};
var createInquiry = async (req, res) => {
  try {
    const { name, email, purpose, message } = req.body;
    if (!name || !email || !purpose || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, purpose, and message are required"
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
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
      message: "Inquiry submitted successfully",
      data: savedInquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating inquiry",
      error: error.message
    });
  }
};
var resolveInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvingMessage } = req.body;
    const adminUser = req.user;
    if (!resolvingMessage || !resolvingMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resolving message is required"
      });
    }
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found"
      });
    }
    if (inquiry.resolved) {
      return res.status(400).json({
        success: false,
        message: "Inquiry is already resolved"
      });
    }
    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedBy: adminUser._id,
        resolvingMessage: resolvingMessage.trim(),
        resolvedAt: /* @__PURE__ */ new Date()
      },
      { new: true, runValidators: true }
    ).populate("resolvedBy", "name email");
    res.status(200).json({
      success: true,
      message: "Inquiry resolved successfully",
      data: updatedInquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error resolving inquiry",
      error: error.message
    });
  }
};
var unresolveInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found"
      });
    }
    if (!inquiry.resolved) {
      return res.status(400).json({
        success: false,
        message: "Inquiry is not resolved"
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
      message: "Inquiry marked as unresolved",
      data: updatedInquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error unresolving inquiry",
      error: error.message
    });
  }
};
var deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found"
      });
    }
    await Inquiry.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting inquiry",
      error: error.message
    });
  }
};
var getInquiryStats = async (req, res) => {
  try {
    const totalInquiries = await Inquiry.countDocuments();
    const resolvedInquiries = await Inquiry.countDocuments({ resolved: true });
    const pendingInquiries = await Inquiry.countDocuments({ resolved: false });
    const sevenDaysAgo = /* @__PURE__ */ new Date();
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
        resolutionRate: totalInquiries > 0 ? (resolvedInquiries / totalInquiries * 100).toFixed(1) : "0"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry stats",
      error: error.message
    });
  }
};

// src/routes/inquiry.routes.ts
var inquiryRouter = express7__default.default.Router();
inquiryRouter.post("/", createInquiry);
inquiryRouter.use(validateUserAccess);
inquiryRouter.use(validateAdminAccess);
inquiryRouter.get("/", getAllInquiries);
inquiryRouter.get("/stats", getInquiryStats);
inquiryRouter.get("/:id", getInquiry);
inquiryRouter.patch("/:id/resolve", resolveInquiry);
inquiryRouter.patch("/:id/unresolve", unresolveInquiry);
inquiryRouter.delete("/:id", deleteInquiry);
var inquiry_routes_default = inquiryRouter;

// src/controllers/user.controller.ts
var getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (role && Object.values(EUserRole).includes(role)) {
      filter.role = role;
    }
    if (search && search.toString().trim()) {
      const searchTerm = search.toString().trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const users = await user_model_default.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await user_model_default.countDocuments(filter);
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};
var getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own profile."
      });
    }
    const user = await user_model_default.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message
    });
  }
};
var changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const requestingUser = req.user;
    if (!role || !Object.values(EUserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Valid roles are: client, admin, super_admin"
      });
    }
    const userToUpdate = await user_model_default.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (userToUpdate._id.toString() === requestingUser._id.toString() && requestingUser.role === "super_admin" /* superAdmin */ && role !== "super_admin" /* superAdmin */) {
      return res.status(400).json({
        success: false,
        message: "Super admins cannot demote themselves"
      });
    }
    if (userToUpdate.role === "super_admin" /* superAdmin */ && userToUpdate._id.toString() !== requestingUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot change another super admin's role"
      });
    }
    const updatedUser = await user_model_default.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");
    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message
    });
  }
};
var getUserStats = async (req, res) => {
  try {
    const totalUsers = await user_model_default.countDocuments();
    const clientUsers = await user_model_default.countDocuments({ role: "client" /* client */ });
    const adminUsers = await user_model_default.countDocuments({ role: "admin" /* admin */ });
    const superAdminUsers = await user_model_default.countDocuments({ role: "super_admin" /* superAdmin */ });
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await user_model_default.countDocuments({
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
          clientPercentage: totalUsers > 0 ? (clientUsers / totalUsers * 100).toFixed(1) : "0",
          adminPercentage: totalUsers > 0 ? (adminUsers / totalUsers * 100).toFixed(1) : "0",
          superAdminPercentage: totalUsers > 0 ? (superAdminUsers / totalUsers * 100).toFixed(1) : "0"
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
      error: error.message
    });
  }
};
var updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile."
      });
    }
    const userToUpdate = await user_model_default.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone.trim();
    if (email) {
      const existingUser = await user_model_default.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already registered by another user"
        });
      }
      updateFields.email = email.toLowerCase().trim();
    }
    if (address) {
      updateFields.address = {};
      if (address.street !== void 0) updateFields.address.street = address.street?.trim() || "";
      if (address.city !== void 0) updateFields.address.city = address.city?.trim() || "";
      if (address.state !== void 0) updateFields.address.state = address.state?.trim() || "";
      if (address.zip !== void 0) updateFields.address.zip = address.zip?.trim() || "";
      if (address.country !== void 0) updateFields.address.country = address.country?.trim() || "";
    }
    const updatedUser = await user_model_default.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).select("-password");
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message
    });
  }
};
var deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    if (requestingUser._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account"
      });
    }
    const userToDelete = await user_model_default.findById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (userToDelete.role === "super_admin" /* superAdmin */) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete another super admin account"
      });
    }
    await user_model_default.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message
    });
  }
};
var updateUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { street, city, state, zip, country } = req.body;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own address."
      });
    }
    const userToUpdate = await user_model_default.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const addressData = {};
    if (street !== void 0) addressData["address.street"] = street?.trim() || "";
    if (city !== void 0) addressData["address.city"] = city?.trim() || "";
    if (state !== void 0) addressData["address.state"] = state?.trim() || "";
    if (zip !== void 0) addressData["address.zip"] = zip?.trim() || "";
    if (country !== void 0) addressData["address.country"] = country?.trim() || "";
    const updatedUser = await user_model_default.findByIdAndUpdate(
      id,
      { $set: addressData },
      { new: true, runValidators: true }
    ).select("-password");
    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: {
        address: updatedUser?.address || null,
        user: updatedUser
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating address",
      error: error.message
    });
  }
};
var getUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own address."
      });
    }
    const user = await user_model_default.findById(id).select("address name email");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    res.status(200).json({
      success: true,
      data: {
        address: user.address || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching address",
      error: error.message
    });
  }
};
var deleteUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own address."
      });
    }
    const userToUpdate = await user_model_default.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const updatedUser = await user_model_default.findByIdAndUpdate(
      id,
      { $unset: { address: 1 } },
      { new: true }
    ).select("-password");
    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting address",
      error: error.message
    });
  }
};
var addToWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId } = req.body;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. You can only modify your own wishlist." });
    }
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required." });
    }
    const user = await user_model_default.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.wishlisted.includes(productId)) {
      user.wishlisted.push(productId);
      await user.save();
    }
    res.status(200).json({ success: true, message: "Product added to wishlist", wishlist: user.wishlisted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding to wishlist", error: error.message });
  }
};
var removeFromWishlist = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. You can only modify your own wishlist." });
    }
    const user = await user_model_default.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user.wishlisted = user.wishlisted.filter((pid) => pid !== productId);
    await user.save();
    res.status(200).json({ success: true, message: "Product removed from wishlist", wishlist: user.wishlisted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error removing from wishlist", error: error.message });
  }
};
var getWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const isOwnProfile = requestingUser._id.toString() === id;
    const isSuperAdmin = requestingUser.role === "super_admin" /* superAdmin */;
    if (!isOwnProfile && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. You can only view your own wishlist." });
    }
    const user = await user_model_default.findById(id).select("wishlisted");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, wishlist: user.wishlisted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching wishlist", error: error.message });
  }
};

// src/routes/user.routes.ts
var userRouter = express7__default.default.Router();
userRouter.use(validateUserAccess);
userRouter.get("/:id", getUserById);
userRouter.put("/:id", updateUserProfile);
userRouter.get("/:id/address", getUserAddress);
userRouter.put("/:id/address", updateUserAddress);
userRouter.delete("/:id/address", deleteUserAddress);
userRouter.get("/", validateSuperAdminAccess, getAllUsers);
userRouter.get("/stats/overview", validateSuperAdminAccess, getUserStats);
userRouter.patch("/:id/role", validateSuperAdminAccess, changeUserRole);
userRouter.delete("/:id", validateSuperAdminAccess, deleteUser);
userRouter.post("/:id/wishlist", addToWishlist);
userRouter.delete("/:id/wishlist/:productId", removeFromWishlist);
userRouter.get("/:id/wishlist", getWishlist);
var user_routes_default = userRouter;
var reviewSchema = new mongoose6.Schema(
  {
    userId: {
      type: mongoose6.Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    productId: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    stars: {
      type: Number,
      default: 0
    },
    imageUrls: {
      type: [String],
      default: []
    },
    verifiedBuyer: {
      type: Boolean,
      default: false
    },
    foundHelpful: {
      type: Number,
      default: 0
    },
    notHelpful: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);
var Review = mongoose6__default.default.model("Review", reviewSchema);

// src/controllers/review.controller.ts
var getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const filter = { productId };
    if (rating) {
      filter.rating = Number(rating);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    const reviews = await Review.find(filter).populate("userId", "name email").sort(sort).skip(skip).limit(Number(limit));
    const total = await Review.countDocuments(filter);
    const averageRating = await Review.aggregate([
      { $match: { productId } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
    ]);
    res.status(200).json({
      success: true,
      data: {
        reviews,
        averageRating: averageRating[0]?.avgRating || 0,
        totalReviews: averageRating[0]?.totalReviews || 0,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message
    });
  }
};
var getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, userId, productId } = req.query;
    const filter = {};
    if (rating) filter.rating = Number(rating);
    if (userId) filter.userId = userId;
    if (productId) filter.productId = productId;
    const skip = (Number(page) - 1) * Number(limit);
    const reviews = await Review.find(filter).populate("userId", "name email").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Review.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message
    });
  }
};
var getReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id).populate("userId", "name email");
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching review",
      error: error.message
    });
  }
};
var createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Product ID, rating, and comment are required"
      });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product"
      });
    }
    const imageUrls = await handleOptionalImageUpload(req, void 0, true);
    const newReview = new Review({
      userId,
      productId,
      rating: Number(rating),
      comment,
      stars: Number(rating),
      // stars same as rating
      imageUrls: imageUrls || [],
      verifiedBuyer: req.user.verified
    });
    const savedReview = await newReview.save();
    await savedReview.populate("userId", "name email");
    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: savedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating review",
      error: error.message
    });
  }
};
var updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reviews"
      });
    }
    if (rating !== void 0 && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }
    const updateFields = {};
    if (rating !== void 0) {
      updateFields.rating = Number(rating);
      updateFields.stars = Number(rating);
    }
    if (comment !== void 0) updateFields.comment = comment;
    const newImageUrls = await handleOptionalImageUpload(req, review.imageUrls, true);
    if (newImageUrls) {
      updateFields.imageUrls = newImageUrls;
    }
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate("userId", "name email");
    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating review",
      error: error.message
    });
  }
};
var deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    const isOwner = review.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin" || userRole === "super_admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews or you must be an admin"
      });
    }
    if (review.imageUrls && review.imageUrls.length > 0) {
      for (const imageUrl of review.imageUrls) {
        await deleteImageFromUrl(imageUrl);
      }
    }
    await Review.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting review",
      error: error.message
    });
  }
};
var toggleFoundHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;
    if (helpful === void 0) {
      return res.status(400).json({
        success: false,
        message: "Helpful status is required"
      });
    }
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    const updateFields = {};
    if (helpful === true || helpful === "true") {
      updateFields.foundHelpful = (review.foundHelpful || 0) + 1;
    } else {
      updateFields.notHelpful = (review.notHelpful || 0) + 1;
    }
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate("userId", "name email");
    res.status(200).json({
      success: true,
      message: `Review marked as ${helpful ? "helpful" : "not helpful"}`,
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating review helpfulness",
      error: error.message
    });
  }
};
var toggleVerifiedBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBuyer } = req.body;
    if (verifiedBuyer === void 0) {
      return res.status(400).json({
        success: false,
        message: "Verified buyer status is required"
      });
    }
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { verifiedBuyer: verifiedBuyer === "true" || verifiedBuyer === true },
      { new: true, runValidators: true }
    ).populate("userId", "name email");
    res.status(200).json({
      success: true,
      message: `Review ${updatedReview?.verifiedBuyer ? "marked as verified buyer" : "removed verified buyer status"}`,
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating verified buyer status",
      error: error.message
    });
  }
};
var getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    const skip = (Number(page) - 1) * Number(limit);
    const reviews = await Review.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Review.countDocuments({ userId });
    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user reviews",
      error: error.message
    });
  }
};
var getProductStarDistribution = async (req, res) => {
  try {
    const { productId } = req.params;
    const starDistribution = await Review.aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
      // Sort by star rating (1-5)
    ]);
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    starDistribution.forEach((item) => {
      distribution[item._id] = item.count;
    });
    const totalReviews = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const weightedSum = Object.entries(distribution).reduce((sum, [star, count]) => {
      return sum + Number(star) * count;
    }, 0);
    const averageRating = totalReviews > 0 ? Number((weightedSum / totalReviews).toFixed(2)) : 0;
    const percentageDistribution = Object.entries(distribution).reduce((acc, [star, count]) => {
      acc[star] = totalReviews > 0 ? Number((count / totalReviews * 100).toFixed(1)) : 0;
      return acc;
    }, {});
    res.status(200).json({
      success: true,
      data: {
        productId,
        totalReviews,
        averageRating,
        distribution,
        percentageDistribution,
        breakdown: [
          { stars: 5, count: distribution[5], percentage: percentageDistribution["5"] },
          { stars: 4, count: distribution[4], percentage: percentageDistribution["4"] },
          { stars: 3, count: distribution[3], percentage: percentageDistribution["3"] },
          { stars: 2, count: distribution[2], percentage: percentageDistribution["2"] },
          { stars: 1, count: distribution[1], percentage: percentageDistribution["1"] }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching star distribution",
      error: error.message
    });
  }
};
var uploadReviewImages = getReviewUploadMiddleware();

// src/routes/reviews.routes.ts
var reviewsRouter = express7__default.default.Router();
reviewsRouter.get("/product/:productId", getProductReviews);
reviewsRouter.get("/product/:productId/distribution", getProductStarDistribution);
reviewsRouter.get("/:id", getReview);
reviewsRouter.use(validateUserAccess);
reviewsRouter.post("/", uploadReviewImages, createReview);
reviewsRouter.get("/user/my-reviews", getUserReviews);
reviewsRouter.put("/:id", uploadReviewImages, updateReview);
reviewsRouter.delete("/:id", deleteReview);
reviewsRouter.patch("/:id/helpful", toggleFoundHelpful);
reviewsRouter.get("/", validateAdminAccess, getAllReviews);
reviewsRouter.patch("/:id/verified-buyer", validateAdminAccess, toggleVerifiedBuyer);
var reviews_routes_default = reviewsRouter;
var cartSchema = new mongoose6__default.default.Schema(
  {
    userId: {
      type: mongoose6__default.default.Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    items: [
      {
        productId: { type: String, required: true },
        variantId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        title: { type: String, required: true },
        image: { type: String }
      }
    ],
    totalPrice: { type: Number, required: true, default: 0 }
  },
  {
    timestamps: true
  }
);
var Cart = mongoose6__default.default.model("Cart", cartSchema);

// src/controllers/cart.controller.ts
var getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
      await cart.save();
    }
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message
    });
  }
};
var addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variantId, quantity, price, title } = req.body;
    if (!productId || !variantId || !quantity || !price || !title) {
      return res.status(400).json({
        success: false,
        message: "Product ID, variant ID, quantity, price, and title are required"
      });
    }
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1"
      });
    }
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === productId && item.variantId === variantId
    );
    let image = void 0;
    if (existingItemIndex === -1) {
      let numericProductId = productId;
      const match = typeof productId === "string" && productId.match(/(\d+)$/);
      if (match) {
        numericProductId = match[1];
      }
      const product = await shopify_service_default.getProduct(numericProductId);
      if (product && product.images && product.images.length > 0) {
        image = product.images[0].src;
      }
    }
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({
        productId,
        variantId,
        quantity: Number(quantity),
        price: Number(price),
        title,
        image
        // store image url in cart item
      });
    }
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
    await cart.save();
    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding item to cart",
      error: error.message
    });
  }
};
var updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { variantId } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required (minimum 1)"
      });
    }
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.variantId === variantId
    );
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart"
      });
    }
    cart.items[itemIndex].quantity = Number(quantity);
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
    await cart.save();
    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message
    });
  }
};
var removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { variantId } = req.params;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.variantId === variantId
    );
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart"
      });
    }
    cart.items.splice(itemIndex, 1);
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
    await cart.save();
    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message
    });
  }
};
var clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message
    });
  }
};
var getCartItemCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    const itemCount = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
    res.status(200).json({
      success: true,
      data: {
        itemCount,
        totalItems: cart ? cart.items.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart item count",
      error: error.message
    });
  }
};
var getAllCarts = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    const skip = (Number(page) - 1) * Number(limit);
    const carts = await Cart.find(filter).populate("userId", "name email").sort({ updatedAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Cart.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: {
        carts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching carts",
      error: error.message
    });
  }
};
var deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const isAdmin = userRole === "admin" || userRole === "super_admin";
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }
    const cart = await Cart.findById(id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }
    await Cart.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Cart deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting cart",
      error: error.message
    });
  }
};

// src/routes/cart.routes.ts
var cartRouter = express7.Router();
cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.put("/update/:variantId", updateCartItem);
cartRouter.delete("/remove/:variantId", removeFromCart);
cartRouter.delete("/clear", clearCart);
cartRouter.get("/count", getCartItemCount);
cartRouter.get("/admin/all", validateAdminAccess, getAllCarts);
cartRouter.delete("/admin/:id", validateAdminAccess, deleteCart);
var cart_routes_default = cartRouter;

// src/api.router.ts
var apiRouter = express7.Router();
apiRouter.use("/shopify", shopify_routes_default);
apiRouter.use("/auth", auth_routes_default);
apiRouter.use("/pages", pages_routes_default);
apiRouter.use("/testimonials", testimonials_routes_default);
apiRouter.use("/inquiries", inquiry_routes_default);
apiRouter.use("/users", user_routes_default);
apiRouter.use("/reviews", reviews_routes_default);
apiRouter.use("/cart", validateUserAccess, cart_routes_default);
var api_router_default = apiRouter;

// src/middleware/errorHandler.middleware.ts
var errorHandler = (err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
    // Hide details in production
  });
};
var connectToDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
    await mongoose6__default.default.connect(mongoUri);
    console.log("\u{1F4E6} Connected to MongoDB database");
  } catch (error) {
    console.error("\u274C MongoDB connection error:", error);
    process.exit(1);
  }
};

// src/app.ts
dotenv__default.default.config();
var app = express7__default.default();
connectToDatabase();
validateShopifyConfig();
app.use(express7__default.default.json());
app.use(cookieParser__default.default());
app.use(
  cors__default.default({
    origin: [
      "https://linesapparel.ca",
      "https://www.linesapparel.ca",
      "http://localhost:3000"
      // keep for local dev
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400
  })
);
app.use("/api", api_router_default);
app.get("/", (req, res) => {
  res.send("Admin dashboard API is running...");
});
app.get("/dbString", (req, res) => {
  if (process.env.Node_env === "production") {
    res.status(200).json({ message: "Production MongoURL" });
  }
  res.status(200).json({ message: "Dev MongoURL" });
});
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
app.use(errorHandler);
var app_default = app;

// src/index.ts
dotenv__default.default.config();
var port = process.env.PORT || 8080;
app_default.listen(port, () => {
  console.log(`\u{1F680} Server is running on port ${port}`);
  console.log(`\u{1F511} Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`\u{1F3EA} Connected to Shopify store: ${shopifyConfig.storeUrl}`);
});
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map