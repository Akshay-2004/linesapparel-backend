import { Request, Response } from 'express';
import shopifyService from '@/services/shopify.service';

export const orderCreated = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    
    // Process the incoming order data
    await shopifyService.processNewOrder(orderData);
    
    // Return 200 OK to acknowledge receipt
    res.status(200).send();
  } catch (error: any) {
    console.error('Error processing order created webhook:', error);
    // Still return 200 to prevent Shopify from retrying
    res.status(200).send();
  }
};

export const orderUpdated = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    
    // Process the updated order data
    await shopifyService.processOrderUpdate(orderData);
    
    res.status(200).send();
  } catch (error: any) {
    console.error('Error processing order updated webhook:', error);
    res.status(200).send();
  }
};

export const productUpdated = async (req: Request, res: Response) => {
  try {
    const productData = req.body;
    
    // Process the updated product data
    await shopifyService.processProductUpdate(productData);
    
    res.status(200).send();
  } catch (error: any) {
    console.error('Error processing product updated webhook:', error);
    res.status(200).send();
  }
};

export const inventoryUpdated = async (req: Request, res: Response) => {
  try {
    const inventoryData = req.body;
    
    // Process the updated inventory data
    await shopifyService.processInventoryUpdate(inventoryData);
    
    res.status(200).send();
  } catch (error: any) {
    console.error('Error processing inventory updated webhook:', error);
    res.status(200).send();
  }
};
