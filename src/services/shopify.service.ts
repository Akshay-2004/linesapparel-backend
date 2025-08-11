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
}

export default new ShopifyService();
