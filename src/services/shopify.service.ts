import { shopifyConfig } from "@/config/shopify.config";
import { createHmac } from "crypto";

type QueryParams = Record<string, any>;
type ShopifyResponse<T> = {
  data: T;
  headers: Headers;
  status: number;
};

class ShopifyService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": shopifyConfig.accessToken,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    method: string = "GET",
    data?: any
  ): Promise<ShopifyResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      // Check if the response is OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Shopify API error (${response.status}): ${JSON.stringify(errorData)}`
        );
      }

      // Handle no content responses (like DELETE operations)
      if (response.status === 204) {
        return {
          data: {} as T,
          headers: response.headers,
          status: response.status,
        };
      }

      const responseData = await response.json();

      return {
        data: responseData,
        headers: response.headers,
        status: response.status,
      };
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  private async makeGraphQLRequest(
    query: string,
    variables?: any
  ): Promise<any> {
    const url = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/graphql.json`;

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyConfig.accessToken,
      },
      body: JSON.stringify({
        query,
        variables: variables || {},
      }),
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

      // Check for GraphQL errors
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

  private async makeStorefrontRequest(
    query: string,
    variables?: any
  ): Promise<any> {
    const url = `https://${shopifyConfig.storeUrl}/api/${shopifyConfig.apiVersion}/graphql.json`;

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": shopifyConfig.storefrontToken,
      },
      body: JSON.stringify({
        query,
        variables: variables || {},
      }),
    };

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Shopify Storefront API error (${response.status}): ${JSON.stringify(
            errorData
          )}`
        );
      }

      const responseData = await response.json();

      // Check for GraphQL errors
      if (responseData.errors && responseData.errors.length > 0) {
        throw new Error(
          `Storefront GraphQL errors: ${JSON.stringify(responseData.errors)}`
        );
      }

      return responseData;
    } catch (error) {
      console.error("Error making Storefront GraphQL request:", error);
      throw error;
    }
  }

  private buildQueryString(params: QueryParams): string {
    if (!params || Object.keys(params).length === 0) return "";

    const validParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      );

    return validParams.length > 0 ? `?${validParams.join("&")}` : "";
  }

  // Authentication methods
  async handleOAuthCallback(code: string, shop: string) {
    try {
      const url = `https://${shop}/admin/oauth/access_token`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: shopifyConfig.apiKey,
          client_secret: shopifyConfig.apiSecret,
          code,
        }),
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
      const response = await this.makeRequest<any>("/shop.json");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Product methods
  async getProducts(params: QueryParams = {}) {
    const queryString = this.buildQueryString(params);
    const response = await this.makeRequest<any>(
      `/products.json${queryString}`
    );
    return response.data;
  }

  async getProduct(productId: string) {
    const response = await this.makeRequest<any>(`/products/${productId}.json`);
    return response.data.product;
  }

  async createProduct(productData: any) {
    const response = await this.makeRequest<any>("/products.json", "POST", {
      product: productData,
    });
    return response.data.product;
  }

  async updateProduct(productId: string, productData: any) {
    const response = await this.makeRequest<any>(
      `/products/${productId}.json`,
      "PUT",
      { product: productData }
    );
    return response.data.product;
  }

  async deleteProduct(productId: string) {
    await this.makeRequest<void>(`/products/${productId}.json`, "DELETE");
    return { success: true };
  }

  async getProductVariants(productId: string) {
    const response = await this.makeRequest<any>(
      `/products/${productId}/variants.json`
    );
    return response.data.variants;
  }

  // Order methods
  async getOrders(params: QueryParams = {}) {
    const queryString = this.buildQueryString(params);
    const response = await this.makeRequest<any>(`/orders.json${queryString}`);
    return response.data;
  }

  async getOrder(orderId: string) {
    const response = await this.makeRequest<any>(`/orders/${orderId}.json`);
    return response.data.order;
  }

  async createOrder(orderData: any) {
    const response = await this.makeRequest<any>("/orders.json", "POST", {
      order: orderData,
    });
    return response.data.order;
  }

  async updateOrder(orderId: string, orderData: any) {
    const response = await this.makeRequest<any>(
      `/orders/${orderId}.json`,
      "PUT",
      { order: orderData }
    );
    return response.data.order;
  }

  async getOrdersByStatus(status: string) {
    return this.getOrders({ status });
  }

  async fulfillOrder(orderId: string, fulfillmentData: any) {
    const response = await this.makeRequest<any>(
      `/orders/${orderId}/fulfillments.json`,
      "POST",
      { fulfillment: fulfillmentData }
    );
    return response.data.fulfillment;
  }

  async cancelOrder(orderId: string) {
    const response = await this.makeRequest<any>(
      `/orders/${orderId}/cancel.json`,
      "POST"
    );
    return response.data;
  }

  async getOrdersByEmail(email: string, params: QueryParams = {}) {
    // Use the REST API to get orders and filter by email
    // This avoids the customer PII restrictions of the GraphQL API
    try {
      const limit = params.limit || 50;
      console.log(`🔍 [getOrdersByEmail] Searching for orders with email: ${email}`);
      console.log(`📊 [getOrdersByEmail] Request parameters:`, { limit, params });
      
      // Try with a higher limit and different status parameters to get all orders
      const apiUrl = `/orders.json?limit=250&status=any&financial_status=any&fulfillment_status=any`;
      console.log(`🌐 [getOrdersByEmail] Making API request to: ${apiUrl}`);
      
      const ordersResponse = await this.makeRequest<any>(apiUrl);
      
      console.log(`📦 [getOrdersByEmail] Raw Shopify API response status:`, ordersResponse.status);
      console.log(`📦 [getOrdersByEmail] Total orders retrieved:`, ordersResponse.data?.orders?.length || 0);
      
      if (!ordersResponse.data || !ordersResponse.data.orders) {
        console.log(`❌ [getOrdersByEmail] No orders data in response`);
        return {
          orders: [],
          customer: null,
          total_count: 0,
          current_page: 1,
          total_pages: 0,
          has_next_page: false,
          has_previous_page: false
        };
      }

      // Log sample of orders to see their structure
      if (ordersResponse.data.orders.length > 0) {
        console.log(`📋 [getOrdersByEmail] Sample order structure:`, {
          id: ordersResponse.data.orders[0].id,
          email: ordersResponse.data.orders[0].email,
          created_at: ordersResponse.data.orders[0].created_at,
          financial_status: ordersResponse.data.orders[0].financial_status,
          total_price: ordersResponse.data.orders[0].total_price
        });
        
        // Log all unique emails found in orders (for debugging)
        const allEmails = ordersResponse.data.orders
          .map((order: any) => order.email)
          .filter((email: any) => email) // Remove null/undefined
          .filter((email: any, index: number, arr: any[]) => arr.indexOf(email) === index); // Remove duplicates
        console.log(`📧 [getOrdersByEmail] All unique emails in orders:`, allEmails);
      }

      // Filter orders by email
      console.log(`🔎 [getOrdersByEmail] Filtering orders by email: ${email.toLowerCase()}`);
      const userOrders = ordersResponse.data.orders.filter((order: any) => {
        const orderEmail = order.email?.toLowerCase();
        const targetEmail = email.toLowerCase();
        const matches = orderEmail === targetEmail;
        
        if (order.email) {
          console.log(`📨 [getOrdersByEmail] Order ${order.id}: email "${orderEmail}" ${matches ? '✅ MATCHES' : '❌ NO MATCH'} target "${targetEmail}"`);
        } else {
          console.log(`📭 [getOrdersByEmail] Order ${order.id}: has no email`);
        }
        
        return order.email && matches;
      });

      console.log(`🎯 [getOrdersByEmail] Found ${userOrders.length} matching orders for email: ${email}`);
      
      if (userOrders.length === 0) {
        console.log(`⚠️ [getOrdersByEmail] No orders found for email: ${email}`);
        console.log(`💡 [getOrdersByEmail] Suggestion: Check if the email is correct and if orders exist in Shopify`);
        return {
          orders: [],
          customer: null,
          total_count: 0,
          current_page: 1,
          total_pages: 0,
          has_next_page: false,
          has_previous_page: false
        };
      }

      // Log details of matching orders
      userOrders.forEach((order: any, index: number) => {
        console.log(`📋 [getOrdersByEmail] Order ${index + 1}/${userOrders.length}:`, {
          id: order.id,
          name: order.name,
          email: order.email,
          created_at: order.created_at,
          total_price: order.total_price,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          line_items_count: order.line_items?.length || 0,
          fulfillments_count: order.fulfillments?.length || 0
        });
      });

      // Transform the orders to match the expected format
      console.log(`🔄 [getOrdersByEmail] Transforming ${userOrders.length} orders...`);
      const transformedOrders = userOrders.map((order: any, index: number) => {
        console.log(`🔄 [getOrdersByEmail] Transforming order ${index + 1}: ${order.id}`);
        
        // Process fulfillments
        const fulfillments = order.fulfillments ? order.fulfillments.map((fulfillment: any) => {
          console.log(`📦 [getOrdersByEmail] Processing fulfillment ${fulfillment.id}:`, {
            status: fulfillment.status,
            tracking_number: fulfillment.tracking_number,
            tracking_company: fulfillment.tracking_company,
            tracking_urls: fulfillment.tracking_urls
          });
          
          return {
            id: fulfillment.id,
            status: fulfillment.status,
            trackingNumber: fulfillment.tracking_number || null,
            trackingUrls: fulfillment.tracking_urls || [],
            trackingCompany: fulfillment.tracking_company || null,
            createdAt: fulfillment.created_at,
            updatedAt: fulfillment.updated_at,
            lineItems: {
              edges: fulfillment.line_items ? fulfillment.line_items.map((item: any) => ({
                node: {
                  id: item.id,
                  quantity: item.quantity
                }
              })) : []
            }
          };
        }) : [];

        console.log(`📦 [getOrdersByEmail] Order ${order.id} has ${fulfillments.length} fulfillments`);

        // Process line items
        const lineItems = {
          edges: order.line_items ? order.line_items.map((item: any) => {
            console.log(`🛍️ [getOrdersByEmail] Processing line item ${item.id}:`, {
              title: item.title,
              quantity: item.quantity,
              price: item.price,
              variant_id: item.variant_id,
              product_id: item.product_id
            });
            
            return {
              node: {
                id: item.id,
                title: item.title,
                quantity: item.quantity,
                variant: {
                  id: item.variant_id,
                  title: item.variant_title || item.title,
                  price: item.price,
                  image: item.variant_image ? {
                    url: item.variant_image,
                    altText: item.title
                  } : undefined
                },
                product: {
                  id: item.product_id,
                  handle: item.sku || `product-${item.product_id}`, // Fallback if handle not available
                  title: item.name || item.title
                }
              }
            };
          }) : []
        };

        console.log(`🛍️ [getOrdersByEmail] Order ${order.id} has ${lineItems.edges.length} line items`);

        const transformedOrder = {
          id: order.id,
          name: order.name,
          createdAt: order.created_at,
          processedAt: order.processed_at,
          totalPrice: order.total_price,
          currencyCode: order.currency,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          fulfillments,
          lineItems,
          shippingAddress: order.shipping_address ? {
            firstName: order.shipping_address.first_name,
            lastName: order.shipping_address.last_name,
            address1: order.shipping_address.address1,
            city: order.shipping_address.city,
            province: order.shipping_address.province,
            country: order.shipping_address.country,
            zip: order.shipping_address.zip
          } : undefined
        };

        console.log(`✅ [getOrdersByEmail] Successfully transformed order ${order.id}`);
        return transformedOrder;
      });

      // Extract customer info from the first order
      const customerInfo = userOrders.length > 0 ? {
        id: userOrders[0].customer?.id || 'unknown',
        email: email,
        firstName: userOrders[0].billing_address?.first_name || userOrders[0].shipping_address?.first_name || 'Customer',
        lastName: userOrders[0].billing_address?.last_name || userOrders[0].shipping_address?.last_name || ''
      } : null;

      console.log(`👤 [getOrdersByEmail] Customer info extracted:`, customerInfo);

      const result = {
        orders: transformedOrders,
        customer: customerInfo,
        total_count: transformedOrders.length,
        current_page: 1,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false
      };

      console.log(`🎉 [getOrdersByEmail] Final result summary:`, {
        orders_count: result.orders.length,
        customer_email: result.customer?.email,
        customer_name: `${result.customer?.firstName} ${result.customer?.lastName}`.trim()
      });

      return result;
    } catch (error) {
      console.error('❌ [getOrdersByEmail] Error fetching orders by email:', error);
      console.error('❌ [getOrdersByEmail] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        email: email,
        params: params
      });
      throw error;
    }
  }

  // Customer methods
  async getCustomers(params: QueryParams = {}) {
    const queryString = this.buildQueryString(params);
    const response = await this.makeRequest<any>(
      `/customers.json${queryString}`
    );
    return response.data;
  }

  async getCustomer(customerId: string) {
    const response = await this.makeRequest<any>(
      `/customers/${customerId}.json`
    );
    return response.data.customer;
  }

  async createCustomer(customerData: any) {
    const response = await this.makeRequest<any>("/customers.json", "POST", {
      customer: customerData,
    });
    return response.data.customer;
  }

  async updateCustomer(customerId: string, customerData: any) {
    const response = await this.makeRequest<any>(
      `/customers/${customerId}.json`,
      "PUT",
      { customer: customerData }
    );
    return response.data.customer;
  }

  async getCustomerOrders(customerId: string) {
    return this.getOrders({ customer_id: customerId });
  }

  async searchCustomers(query: string) {
    return this.getCustomers({ query });
  }

  // Inventory methods
  async getInventoryLevels(locationId?: string) {
    const queryString = locationId ? `?location_id=${locationId}` : "";
    const response = await this.makeRequest<any>(
      `/inventory_levels.json${queryString}`
    );
    return response.data.inventory_levels;
  }

  async adjustInventory(adjustmentData: any) {
    const response = await this.makeRequest<any>(
      "/inventory_levels/adjust.json",
      "POST",
      adjustmentData
    );
    return response.data.inventory_level;
  }

  async getInventoryLocations() {
    const response = await this.makeRequest<any>("/locations.json");
    return response.data.locations;
  }

  // Collection methods
  async getCollections() {
    const customResponse = await this.makeRequest<any>(
      "/custom_collections.json"
    );
    const smartResponse = await this.makeRequest<any>(
      "/smart_collections.json"
    );

    return {
      custom_collections: customResponse.data.custom_collections,
      smart_collections: smartResponse.data.smart_collections,
    };
  }

  async getCollection(
    collectionId: string,
    type: "custom" | "smart" = "custom"
  ) {
    const endpoint =
      type === "custom"
        ? `/custom_collections/${collectionId}.json`
        : `/smart_collections/${collectionId}.json`;

    const response = await this.makeRequest<any>(endpoint);
    return type === "custom"
      ? response.data.custom_collection
      : response.data.smart_collection;
  }

  async getCollectionProducts(collectionId: string) {
    const response = await this.makeRequest<any>(
      `/collections/${collectionId}/products.json`
    );
    return response.data.products;
  }

  async createCollection(
    collectionData: any,
    type: "custom" | "smart" = "custom"
  ) {
    const endpoint =
      type === "custom"
        ? "/custom_collections.json"
        : "/smart_collections.json";
    const dataKey =
      type === "custom" ? "custom_collection" : "smart_collection";

    const response = await this.makeRequest<any>(endpoint, "POST", {
      [dataKey]: collectionData,
    });

    return response.data[dataKey];
  }

  async updateCollection(
    collectionId: string,
    collectionData: any,
    type: "custom" | "smart" = "custom"
  ) {
    const endpoint =
      type === "custom"
        ? `/custom_collections/${collectionId}.json`
        : `/smart_collections/${collectionId}.json`;

    const dataKey =
      type === "custom" ? "custom_collection" : "smart_collection";

    const response = await this.makeRequest<any>(endpoint, "PUT", {
      [dataKey]: collectionData,
    });

    return response.data[dataKey];
  }

  async getCollectionByHandle(handle: string, limit: number) {
    try {
      // Use GraphQL to query collection by handle
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
  async registerWebhook(webhookData: any) {
    const response = await this.makeRequest<any>("/webhooks.json", "POST", {
      webhook: webhookData,
    });
    return response.data.webhook;
  }

  async removeWebhook(webhookId: string) {
    await this.makeRequest<void>(`/webhooks/${webhookId}.json`, "DELETE");
    return { success: true };
  }

  async listWebhooks() {
    const response = await this.makeRequest<any>("/webhooks.json");
    return response.data.webhooks;
  }

  // Analytics and reporting methods
  async getSalesAnalytics(startDate: string, endDate: string) {
    const params = { created_at_min: startDate, created_at_max: endDate };
    const orders = await this.getOrders(params);

    // Process orders to generate analytics
    // This is just an example - you'd need to customize this for your needs
    const totalSales = orders.orders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_price),
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
      currency: orders.orders[0]?.currency || "USD",
    };
  }

  async getCustomerAnalytics() {
    const customers = await this.getCustomers({ limit: 250 });

    // Example analytics processing
    const total = customers.customers.length;

    return {
      totalCustomers: total,
      // Add more metrics as needed
    };
  }

  async getProductAnalytics() {
    const products = await this.getProducts({ limit: 250 });

    // Example analytics processing
    const totalProducts = products.products.length;
    const totalInventory = products.products.reduce(
      (sum: number, product: any) => {
        const inventoryTotal = product.variants.reduce(
          (variantSum: number, variant: any) =>
            variantSum + (variant.inventory_quantity || 0),
          0
        );
        return sum + inventoryTotal;
      },
      0
    );

    return {
      totalProducts,
      totalInventory,
      // Add more metrics as needed
    };
  }

  async generateSalesReport(
    startDate: string,
    endDate: string,
    format: string = "json"
  ) {
    const params = {
      created_at_min: startDate,
      created_at_max: endDate,
      limit: 250,
    };
    const response = await this.getOrders(params);
    const orders = response.orders;

    if (format === "json") {
      return orders;
    } else if (format === "csv") {
      // Generate CSV
      const header = "Order ID,Date,Customer,Total,Status\n";
      const rows = orders
        .map((order: any) => {
          return `${order.id},${order.created_at},${
            order.customer?.email || "N/A"
          },${order.total_price},${order.financial_status}`;
        })
        .join("\n");

      return header + rows;
    }

    return orders; // Default to JSON
  }

  // Webhook processing methods
  async processNewOrder(orderData: any) {
    // Process new order from webhook
    console.log("Processing new order", orderData.id);
    // Implement your business logic here
    return true;
  }

  async processOrderUpdate(orderData: any) {
    // Process order update from webhook
    console.log("Processing order update", orderData.id);
    // Implement your business logic here
    return true;
  }

  async processProductUpdate(productData: any) {
    // Process product update from webhook
    console.log("Processing product update", productData.id);
    // Implement your business logic here
    return true;
  }

  async processInventoryUpdate(inventoryData: any) {
    // Process inventory update from webhook
    console.log(
      "Processing inventory update for item",
      inventoryData.inventory_item_id
    );
    // Implement your business logic here
    return true;
  }

  // Helper methods for webhook validation
  validateHmac(body: string, hmac: string): boolean {
    const calculatedHmac = createHmac("sha256", shopifyConfig.apiSecret)
      .update(body, "utf8")
      .digest("base64");

    return calculatedHmac === hmac;
  }

  async getProductByHandle(handle: string) {
    try {
      // Use GraphQL to query product by handle for more efficient data fetching
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
  async createDraftOrder(orderData: any): Promise<any> {
    // Ensure the draft order has all required fields for invoice generation
    const draftOrderPayload = {
      ...orderData,
      // Ensure invoice is sent (this generates the invoice_url)
      invoice_sent_at: null,
      // Set up for payment
      use_customer_default_address: orderData.use_customer_default_address || false,
    };

    const response = await this.makeRequest<any>("/draft_orders.json", "POST", {
      draft_order: draftOrderPayload,
    });
    
    const draftOrder = response.data.draft_order;
    
    // If no invoice_url is returned, try to send the invoice
    if (!draftOrder.invoice_url && draftOrder.id) {
      try {
        const invoiceResponse = await this.sendDraftOrderInvoice(draftOrder.id.toString());
        if (invoiceResponse && invoiceResponse.invoice_url) {
          draftOrder.invoice_url = invoiceResponse.invoice_url;
        }
      } catch (error) {
        console.error('Failed to send draft order invoice:', error);
      }
    }
    
    return draftOrder;
  }

  async sendDraftOrderInvoice(draftOrderId: string, customMessage?: string): Promise<any> {
    const payload: any = {};
    if (customMessage) {
      payload.draft_order_invoice = { 
        to: null, 
        from: null, 
        subject: null, 
        custom_message: customMessage 
      };
    }
    
    const response = await this.makeRequest<any>(
      `/draft_orders/${draftOrderId}/send_invoice.json`,
      "POST",
      payload
    );
    return response.data.draft_order_invoice;
  }

  async completeDraftOrder(draftOrderId: string, paymentPending: boolean = false): Promise<any> {
    const response = await this.makeRequest<any>(
      `/draft_orders/${draftOrderId}/complete.json`,
      "PUT",
      { payment_pending: paymentPending }
    );
    return response.data.draft_order;
  }

  async getDraftOrder(draftOrderId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/draft_orders/${draftOrderId}.json`);
    return response.data.draft_order;
  }

  // Storefront API methods for customer authentication and orders
  async createStorefrontCustomer(customerData: { email: string; password: string; firstName: string; lastName?: string; phone?: string }): Promise<any> {
    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
            phone
            createdAt
          }
          customerUserErrors {
            field
            message
            code
          }
        }
      }
    `;

    const variables = {
      input: {
        email: customerData.email,
        password: customerData.password,
        firstName: customerData.firstName,
        lastName: customerData.lastName || '',
        phone: customerData.phone || null,
        acceptsMarketing: false
      }
    };

    try {
      const result = await this.makeStorefrontRequest(mutation, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const createResult = result.data?.customerCreate;
      
      if (createResult?.customerUserErrors && createResult.customerUserErrors.length > 0) {
        throw new Error(`Customer creation errors: ${JSON.stringify(createResult.customerUserErrors)}`);
      }

      return createResult?.customer;
    } catch (error) {
      console.error('Error creating Shopify customer:', error);
      throw error;
    }
  }

  async createCustomerAccessToken(email: string, password: string): Promise<{ accessToken: string; expiresAt: string }> {
    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            field
            message
            code
          }
        }
      }
    `;

    const variables = {
      input: {
        email,
        password
      }
    };

    try {
      console.log('🔑 Creating customer access token for:', email);
      const result = await this.makeStorefrontRequest(mutation, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const tokenResult = result.data?.customerAccessTokenCreate;
      
      if (tokenResult?.customerUserErrors && tokenResult.customerUserErrors.length > 0) {
        console.error('❌ Customer access token errors:', tokenResult.customerUserErrors);
        throw new Error(`Access token creation errors: ${JSON.stringify(tokenResult.customerUserErrors)}`);
      }

      const accessTokenData = tokenResult?.customerAccessToken;
      if (!accessTokenData) {
        throw new Error('No access token returned from Shopify');
      }

      console.log('✅ Customer access token created successfully');
      return accessTokenData;
    } catch (error) {
      console.error('❌ Error creating customer access token:', error);
      throw error;
    }
  }

  async getCustomerWithAccessToken(accessToken: string): Promise<any> {
    const query = `
      query getCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          email
          firstName
          lastName
          phone
          createdAt
          updatedAt
          orders(first: 50) {
            edges {
              node {
                id
                name
                orderNumber
                processedAt
                totalPriceV2 {
                  amount
                  currencyCode
                }
                financialStatus
                fulfillmentStatus
                lineItems(first: 250) {
                  edges {
                    node {
                      title
                      quantity
                      variant {
                        id
                        title
                        priceV2 {
                          amount
                          currencyCode
                        }
                        image {
                          url
                          altText
                        }
                        product {
                          id
                          handle
                          title
                        }
                      }
                    }
                  }
                }
                shippingAddress {
                  firstName
                  lastName
                  address1
                  city
                  province
                  country
                  zip
                }
                fulfillments {
                  trackingInfo {
                    number
                    url
                  }
                  trackingCompany
                  status
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      customerAccessToken: accessToken
    };

    try {
      console.log('🔍 Fetching customer data with access token');
      const result = await this.makeStorefrontRequest(query, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const customer = result.data?.customer;
      if (!customer) {
        throw new Error('Customer not found or access token invalid');
      }

      console.log('✅ Customer data fetched successfully');
      return customer;
    } catch (error) {
      console.error('❌ Error fetching customer:', error);
      throw error;
    }
  }

  async getCustomerOrdersWithAccessToken(
    accessToken: string, 
    options: { first?: number; after?: string } = {}
  ): Promise<{ orders: any[]; customer: any; totalCount: number; pageInfo: any }> {
    const { first = 10, after } = options;
    
    const query = `
      query getCustomerOrders($customerAccessToken: String!, $first: Int!, $after: String) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          email
          firstName
          lastName
          orders(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
            edges {
              cursor
              node {
                id
                name
                orderNumber
                processedAt
                totalPriceV2 {
                  amount
                  currencyCode
                }
                financialStatus
                fulfillmentStatus
                lineItems(first: 250) {
                  edges {
                    node {
                      title
                      quantity
                      variant {
                        id
                        title
                        priceV2 {
                          amount
                          currencyCode
                        }
                        image {
                          url
                          altText
                        }
                        product {
                          id
                          handle
                          title
                        }
                      }
                    }
                  }
                }
                shippingAddress {
                  firstName
                  lastName
                  address1
                  city
                  province
                  country
                  zip
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      customerAccessToken: accessToken,
      first,
      ...(after && { after })
    };

    try {
      console.log('🔍 Fetching customer orders with access token', { first, after });
      const result = await this.makeStorefrontRequest(query, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const customer = result.data?.customer;
      if (!customer) {
        throw new Error('Customer not found or access token invalid');
      }

      const ordersConnection = customer.orders;
      const orders = ordersConnection.edges.map((edge: any) => edge.node);
      
      console.log('✅ Customer orders fetched successfully', { 
        ordersCount: orders.length,
        totalCount: ordersConnection.totalCount 
      });
      
      return {
        orders,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName
        },
        totalCount: ordersConnection.totalCount,
        pageInfo: ordersConnection.pageInfo
      };
    } catch (error) {
      console.error('❌ Error fetching customer orders:', error);
      throw error;
    }
  }

  async renewCustomerAccessToken(accessToken: string): Promise<{ accessToken: string; expiresAt: string }> {
    const mutation = `
      mutation customerAccessTokenRenew($customerAccessToken: String!) {
        customerAccessTokenRenew(customerAccessToken: $customerAccessToken) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      customerAccessToken: accessToken
    };

    try {
      console.log('🔄 Renewing customer access token');
      const result = await this.makeStorefrontRequest(mutation, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const renewResult = result.data?.customerAccessTokenRenew;
      
      if (renewResult?.userErrors && renewResult.userErrors.length > 0) {
        throw new Error(`Token renewal errors: ${JSON.stringify(renewResult.userErrors)}`);
      }

      const accessTokenData = renewResult?.customerAccessToken;
      if (!accessTokenData) {
        throw new Error('No renewed access token returned from Shopify');
      }

      console.log('✅ Customer access token renewed successfully');
      return accessTokenData;
    } catch (error) {
      console.error('❌ Error renewing customer access token:', error);
      throw error;
    }
  }

  // Enhanced Storefront API methods for product search and filtering
  async searchProductsStorefront(options: {
    query?: string;
    first?: number;
    after?: string;
    sortKey?: 'RELEVANCE' | 'PRICE' | 'TITLE' | 'CREATED_AT' | 'UPDATED_AT' | 'BEST_SELLING' | 'PRODUCT_TYPE' | 'VENDOR';
    reverse?: boolean;
    productType?: string;
    vendor?: string;
    available?: boolean;
    priceMin?: number;
    priceMax?: number;
  } = {}): Promise<{
    products: any[];
    totalCount: number;
    pageInfo: any;
    filters: {
      availableVendors: string[];
      availableProductTypes: string[];
      priceRange: { min: number; max: number };
    };
  }> {
    const {
      query = '',
      first = 20,
      after,
      sortKey = 'RELEVANCE',
      reverse = false,
      productType,
      vendor,
      available,
      priceMin,
      priceMax
    } = options;

    // Build the search query with filters
    let searchQuery = query;
    const filters: string[] = [];
    
    if (productType) {
      filters.push(`product_type:${productType}`);
    }
    if (vendor) {
      filters.push(`vendor:${vendor}`);
    }
    if (available !== undefined) {
      filters.push(`available:${available}`);
    }
    if (priceMin !== undefined || priceMax !== undefined) {
      const priceFilter = [];
      if (priceMin !== undefined) priceFilter.push(`>=${priceMin}`);
      if (priceMax !== undefined) priceFilter.push(`<=${priceMax}`);
      filters.push(`variants.price:${priceFilter.join(' AND ')}`);
    }

    if (filters.length > 0) {
      searchQuery = searchQuery ? `${searchQuery} ${filters.join(' ')}` : filters.join(' ');
    }

    const graphqlQuery = `
      query searchProducts($query: String!, $first: Int!, $after: String, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
        products(query: $query, first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              handle
              title
              description
              productType
              vendor
              createdAt
              updatedAt
              tags
              availableForSale
              totalInventory
              images(first: 5) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 250) {
                edges {
                  node {
                    id
                    title
                    priceV2 {
                      amount
                      currencyCode
                    }
                    compareAtPriceV2 {
                      amount
                      currencyCode
                    }
                    availableForSale
                    quantityAvailable
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      id
                      url
                      altText
                    }
                  }
                }
              }
              options {
                id
                name
                values
              }
              collections(first: 5) {
                edges {
                  node {
                    id
                    handle
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      query: searchQuery,
      first,
      sortKey,
      reverse,
      ...(after && { after })
    };

    try {
      console.log('🔍 Searching products with query:', searchQuery);
      const result = await this.makeStorefrontRequest(graphqlQuery, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const productsConnection = result.data?.products;
      if (!productsConnection) {
        throw new Error('No products data returned from search');
      }

      const products = productsConnection.edges.map((edge: any) => edge.node);
      
      // Extract filter options from the results
      const vendorSet = new Set<string>();
      const productTypeSet = new Set<string>();
      let minPrice = Infinity;
      let maxPrice = 0;

      products.forEach((product: any) => {
        if (product.vendor) vendorSet.add(product.vendor);
        if (product.productType) productTypeSet.add(product.productType);
        
        product.variants.edges.forEach((variantEdge: any) => {
          const price = parseFloat(variantEdge.node.priceV2.amount);
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        });
      });

      console.log('✅ Product search completed', { 
        productsCount: products.length,
        vendors: Array.from(vendorSet),
        productTypes: Array.from(productTypeSet)
      });
      
      return {
        products,
        totalCount: products.length, // Note: Storefront API doesn't provide total count
        pageInfo: productsConnection.pageInfo,
        filters: {
          availableVendors: Array.from(vendorSet),
          availableProductTypes: Array.from(productTypeSet),
          priceRange: {
            min: minPrice === Infinity ? 0 : minPrice,
            max: maxPrice
          }
        }
      };
    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw error;
    }
  }

  async getCollectionProductsStorefront(
    collectionHandle: string,
    options: {
      first?: number;
      after?: string;
      sortKey?: 'COLLECTION_DEFAULT' | 'PRICE' | 'TITLE' | 'CREATED' | 'UPDATED' | 'BEST_SELLING' | 'ID' | 'MANUAL';
      reverse?: boolean;
      filters?: {
        available?: boolean;
        priceMin?: number;
        priceMax?: number;
        productType?: string;
        vendor?: string;
      };
    } = {}
  ): Promise<{
    collection: any;
    products: any[];
    pageInfo: any;
    filters: {
      availableVendors: string[];
      availableProductTypes: string[];
      priceRange: { min: number; max: number };
    };
  }> {
    const {
      first = 20,
      after,
      sortKey = 'COLLECTION_DEFAULT',
      reverse = false,
      filters = {}
    } = options;

    // Note: Storefront API doesn't support filtering products within collections
    // We'll fetch all products and filter client-side, or use a larger limit
    const graphqlQuery = `
      query getCollectionProducts($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys!, $reverse: Boolean!) {
        collection(handle: $handle) {
          id
          handle
          title
          description
          image {
            id
            url
            altText
          }
          products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                handle
                title
                description
                productType
                vendor
                createdAt
                updatedAt
                tags
                availableForSale
                totalInventory
                images(first: 5) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 250) {
                  edges {
                    node {
                      id
                      title
                      priceV2 {
                        amount
                        currencyCode
                      }
                      compareAtPriceV2 {
                        amount
                        currencyCode
                      }
                      availableForSale
                      quantityAvailable
                      selectedOptions {
                        name
                        value
                      }
                      image {
                        id
                        url
                        altText
                      }
                    }
                  }
                }
                options {
                  id
                  name
                  values
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      handle: collectionHandle,
      first,
      sortKey,
      reverse,
      ...(after && { after })
    };

    try {
      console.log('🔍 Fetching collection products:', { collectionHandle, first, sortKey });
      const result = await this.makeStorefrontRequest(graphqlQuery, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const collection = result.data?.collection;
      if (!collection) {
        throw new Error('Collection not found');
      }

      let products = collection.products.edges.map((edge: any) => edge.node);
      
      // Apply client-side filtering since Storefront API doesn't support product filtering within collections
      if (filters.available !== undefined) {
        products = products.filter((product: any) => product.availableForSale === filters.available);
      }
      
      if (filters.productType) {
        products = products.filter((product: any) => 
          product.productType?.toLowerCase().includes(filters.productType!.toLowerCase())
        );
      }
      
      if (filters.vendor) {
        products = products.filter((product: any) => 
          product.vendor?.toLowerCase().includes(filters.vendor!.toLowerCase())
        );
      }
      
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        products = products.filter((product: any) => {
          const price = parseFloat(product.variants.edges[0]?.node.priceV2.amount || '0');
          const meetsMin = filters.priceMin === undefined || price >= filters.priceMin;
          const meetsMax = filters.priceMax === undefined || price <= filters.priceMax;
          return meetsMin && meetsMax;
        });
      }

      // Extract filter options from ALL products (before filtering)
      const allProducts = collection.products.edges.map((edge: any) => edge.node);
      const vendorSet = new Set<string>();
      const productTypeSet = new Set<string>();
      let minPrice = Infinity;
      let maxPrice = 0;

      allProducts.forEach((product: any) => {
        if (product.vendor) vendorSet.add(product.vendor);
        if (product.productType) productTypeSet.add(product.productType);
        
        product.variants.edges.forEach((variantEdge: any) => {
          const price = parseFloat(variantEdge.node.priceV2.amount);
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        });
      });

      console.log('✅ Collection products fetched successfully', { 
        collection: collection.title,
        totalProducts: allProducts.length,
        filteredProducts: products.length,
        vendors: Array.from(vendorSet),
        productTypes: Array.from(productTypeSet)
      });
      
      return {
        collection: {
          id: collection.id,
          handle: collection.handle,
          title: collection.title,
          description: collection.description,
          image: collection.image?.url
        },
        products,
        pageInfo: {
          ...collection.products.pageInfo,
          // Note: pageInfo might not be accurate after client-side filtering
        },
        filters: {
          availableVendors: Array.from(vendorSet),
          availableProductTypes: Array.from(productTypeSet),
          priceRange: {
            min: minPrice === Infinity ? 0 : minPrice,
            max: maxPrice
          }
        }
      };
    } catch (error) {
      console.error('❌ Error fetching collection products:', error);
      throw error;
    }
  }

  async getProductRecommendations(
    productId: string,
    intent: 'RELATED' | 'COMPLEMENTARY' = 'RELATED'
  ): Promise<any[]> {
    const graphqlQuery = `
      query getProductRecommendations($productId: ID!, $intent: ProductRecommendationIntent!) {
        productRecommendations(productId: $productId, intent: $intent) {
          id
          handle
          title
          description
          productType
          vendor
          availableForSale
          images(first: 3) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 5) {
            edges {
              node {
                id
                title
                priceV2 {
                  amount
                  currencyCode
                }
                compareAtPriceV2 {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
          }
        }
      }
    `;

    const variables = {
      productId,
      intent
    };

    try {
      console.log('🔍 Fetching product recommendations');
      const result = await this.makeStorefrontRequest(graphqlQuery, variables);
      
      if (result.errors) {
        throw new Error(`Storefront GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const recommendations = result.data?.productRecommendations || [];
      
      console.log('✅ Product recommendations fetched successfully', { 
        count: recommendations.length
      });
      
      return recommendations;
    } catch (error) {
      console.error('❌ Error fetching product recommendations:', error);
      throw error;
    }
  }
}

export default new ShopifyService();
