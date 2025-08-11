import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { shopifyConfig } from '@/config/shopify.config';

export const validateShopifyWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the HMAC header
    const hmacHeader = req.header('X-Shopify-Hmac-Sha256');
    
    if (!hmacHeader) {
      return res.status(401).json({ error: 'Missing HMAC header' });
    }
    
    // Get the raw body as a string
    const body = JSON.stringify(req.body);
    
    // Calculate the HMAC on our side
    const calculatedHmac = crypto
      .createHmac('sha256', shopifyConfig.apiSecret)
      .update(body, 'utf8')
      .digest('base64');
    
    // Compare our calculated HMAC with the one from Shopify
    if (calculatedHmac !== hmacHeader) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    // Validate the shop domain if available
    const shopDomain = req.header('X-Shopify-Shop-Domain');
    if (shopDomain && !shopDomain.includes(shopifyConfig.storeUrl)) {
      return res.status(401).json({ error: 'Invalid shop domain' });
    }
    
    // Verify webhook topic if needed
    const topic = req.header('X-Shopify-Topic');
    if (!topic) {
      return res.status(400).json({ error: 'Missing webhook topic' });
    }
    
    // If everything is valid, proceed
    next();
  } catch (error) {
    console.error('Webhook validation error:', error);
    res.status(500).json({ error: 'Failed to validate webhook' });
  }
};
