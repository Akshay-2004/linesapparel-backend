// Load environment variables at the very beginning
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { shopifyConfig } from '@/config/shopify.config';

const port = process.env.PORT || 8080;


app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🔑 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏪 Connected to Shopify store: ${shopifyConfig.storeUrl}`);
});