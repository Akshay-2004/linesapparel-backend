// Setup environment variables for testing
import dotenv from 'dotenv';

// Load environment variables from .env.test if available, otherwise use .env
dotenv.config({ path: '.env.test' });

// Mock values for testing if not provided
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce-test';
process.env.PORT = process.env.PORT || '8000';
process.env.NODE_ENV = 'test';

// Mock Shopify config values if not available
if (!process.env.SHOPIFY_API_KEY) {
  process.env.SHOPIFY_API_KEY = 'test_api_key';
  process.env.SHOPIFY_API_SECRET = 'test_api_secret';
  process.env.SHOPIFY_STORE_URL = 'test-store.myshopify.com';
  process.env.SHOPIFY_ACCESS_TOKEN = 'test_access_token';
}
