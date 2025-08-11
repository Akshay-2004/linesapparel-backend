export const shopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecret: process.env.SHOPIFY_API_SECRET || '',
  storeUrl: process.env.SHOPIFY_STORE_URL || '',
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
  apiVersion: '2023-07', // Using a stable API version
  scopes: [
    'read_products', 
    'write_products', 
    'read_orders', 
    'write_orders',
    'read_customers', 
    'write_customers',
    'read_inventory', 
    'write_inventory',
    'read_fulfillments', 
    'write_fulfillments',
    'read_shipping', 
    'write_shipping',
    'read_analytics'
  ].join(','),
  webhooks: {
    orderCreated: {
      topic: 'orders/create',
      address: `${process.env.APP_URL || 'https://your-app.com'}/api/shopify/webhook/order-created`
    },
    orderUpdated: {
      topic: 'orders/updated',
      address: `${process.env.APP_URL || 'https://your-app.com'}/api/shopify/webhook/order-updated`
    },
    productUpdated: {
      topic: 'products/update',
      address: `${process.env.APP_URL || 'https://your-app.com'}/api/shopify/webhook/product-updated`
    },
    inventoryUpdated: {
      topic: 'inventory_levels/update',
      address: `${process.env.APP_URL || 'https://your-app.com'}/api/shopify/webhook/inventory-updated`
    }
  }
};

// Validate Shopify configuration
export const validateShopifyConfig = (): boolean => {
  const { apiKey, apiSecret, storeUrl, accessToken } = shopifyConfig;
  
  if (!apiKey || !apiSecret || !storeUrl || !accessToken) {
    console.error('❌ Missing Shopify configuration. Please check your .env file.');
    return false;
  }
  
  // Check if store URL is formatted correctly
  if (!storeUrl.includes('myshopify.com') && !storeUrl.includes('shopify.com')) {
    console.warn('⚠️ Shopify store URL might be invalid. Expected format: yourstore.myshopify.com');
  }
  
  console.log('✅ Shopify configuration validated');
  return true;
};
