import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

// AWS SES Configuration
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Email Template Types
export enum EmailTemplateType {
  EMAIL_VERIFICATION_OTP = 'EMAIL_VERIFICATION_OTP',
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  FORGOT_PASSWORD_OTP = 'FORGOT_PASSWORD_OTP',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  INQUIRY_RECEIVED = 'INQUIRY_RECEIVED',
  INQUIRY_RESPONSE = 'INQUIRY_RESPONSE',
}

// Email Template Data Interface
export interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

// Common Email Template Variables
export interface BaseEmailData extends EmailTemplateData {
  recipientName?: string;
  recipientEmail: string;
  companyName?: string;
  supportEmail?: string;
  websiteUrl?: string;
}

// Specific Template Data Interfaces
export interface OTPEmailData extends BaseEmailData {
  otp: string;
  expiryMinutes?: number;
}

export interface WelcomeEmailData extends BaseEmailData {
  verificationDate?: string;
}

export interface OrderEmailData extends BaseEmailData {
  orderNumber: string;
  orderDate: string;
  orderTotal: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface InquiryEmailData extends BaseEmailData {
  inquiryId: string;
  inquirySubject: string;
  inquiryMessage?: string;
  responseMessage?: string;
}

// Email Templates
const emailTemplates: Record<EmailTemplateType, (data: any) => { subject: string; html: string; text: string }> = {
  [EmailTemplateType.EMAIL_VERIFICATION_OTP]: (data: OTPEmailData) => ({
    subject: 'Verify Your Email Address - OTP Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Email Verification</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Hello ${data.recipientName || 'User'}!</h2>
            <p>Thank you for signing up with ${data.companyName || 'our platform'}. To complete your registration, please verify your email address using the OTP code below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">${data.otp}</div>
            </div>
            <p style="color: #666;">This OTP will expire in ${data.expiryMinutes || 10} minutes for security purposes.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #667eea;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Email Verification - ${data.companyName || 'Our Platform'}
      
      Hello ${data.recipientName || 'User'}!
      
      Thank you for signing up with ${data.companyName || 'our platform'}. To complete your registration, please verify your email address using the OTP code below:
      
      OTP Code: ${data.otp}
      
      This OTP will expire in ${data.expiryMinutes || 10} minutes for security purposes.
      
      If you didn't create an account with us, please ignore this email.
      
      Need help? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.WELCOME_EMAIL]: (data: WelcomeEmailData) => ({
    subject: `Welcome to ${data.companyName || 'Our Platform'}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${data.companyName || 'Our Platform'}!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Hello ${data.recipientName || 'User'}!</h2>
            <p>🎉 Congratulations! Your email has been successfully verified and your account is now active.</p>
            <p>You can now enjoy all the features of ${data.companyName || 'our platform'}:</p>
            <ul style="color: #555;">
              <li>Browse our extensive product catalog</li>
              <li>Add items to your cart and wishlist</li>
              <li>Track your orders in real-time</li>
              <li>Manage your profile and preferences</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.websiteUrl || '#'}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Shopping</a>
            </div>
            <p>Thank you for choosing ${data.companyName || 'us'}. We're excited to have you on board!</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #11998e;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to ${data.companyName || 'Our Platform'}!
      
      Hello ${data.recipientName || 'User'}!
      
      Congratulations! Your email has been successfully verified and your account is now active.
      
      You can now enjoy all the features of ${data.companyName || 'our platform'}:
      - Browse our extensive product catalog
      - Add items to your cart and wishlist
      - Track your orders in real-time
      - Manage your profile and preferences
      
      Visit: ${data.websiteUrl || 'our website'}
      
      Thank you for choosing ${data.companyName || 'us'}. We're excited to have you on board!
      
      Need help? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.FORGOT_PASSWORD_OTP]: (data: OTPEmailData) => ({
    subject: 'Reset Your Password - OTP Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Hello ${data.recipientName || 'User'}!</h2>
            <p>We received a request to reset your password. Use the OTP code below to proceed with resetting your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #ff6b6b; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">${data.otp}</div>
            </div>
            <p style="color: #666;">This OTP will expire in ${data.expiryMinutes || 10} minutes for security purposes.</p>
            <p><strong>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</strong></p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #ff6b6b;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - ${data.companyName || 'Our Platform'}
      
      Hello ${data.recipientName || 'User'}!
      
      We received a request to reset your password. Use the OTP code below to proceed with resetting your password:
      
      OTP Code: ${data.otp}
      
      This OTP will expire in ${data.expiryMinutes || 10} minutes for security purposes.
      
      If you didn't request a password reset, please ignore this email and your password will remain unchanged.
      
      Need help? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.PASSWORD_RESET_SUCCESS]: (data: BaseEmailData) => ({
    subject: 'Password Reset Successful',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Successful</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Hello ${data.recipientName || 'User'}!</h2>
            <p>✅ Your password has been successfully reset. You can now log in with your new password.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.websiteUrl || '#'}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #11998e;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Successful - ${data.companyName || 'Our Platform'}
      
      Hello ${data.recipientName || 'User'}!
      
      Your password has been successfully reset. You can now log in with your new password.
      
      If you didn't make this change, please contact our support team immediately.
      
      Login at: ${data.websiteUrl || 'our website'}
      
      Need help? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.ORDER_CONFIRMATION]: (data: OrderEmailData) => ({
    subject: `Order Confirmation - #${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Thank you ${data.recipientName || 'for your order'}!</h2>
            <p>Your order has been confirmed and is being processed. Here are the details:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">Order Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Order Date:</strong> ${data.orderDate}</p>
              <p><strong>Total Amount:</strong> ${data.orderTotal}</p>
            </div>
            <p>We'll send you another email with tracking information once your order ships.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.websiteUrl || '#'}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #667eea;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Order Confirmation - #${data.orderNumber}
      
      Thank you ${data.recipientName || 'for your order'}!
      
      Your order has been confirmed and is being processed. Here are the details:
      
      Order Number: #${data.orderNumber}
      Order Date: ${data.orderDate}
      Total Amount: ${data.orderTotal}
      
      We'll send you another email with tracking information once your order ships.
      
      Track your order at: ${data.websiteUrl || 'our website'}
      
      Need help? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.ORDER_SHIPPED]: (data: OrderEmailData) => ({
    subject: `Your Order Has Shipped - #${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Shipped</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📦 Your Order Has Shipped!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Great news ${data.recipientName || ''}!</h2>
            <p>Your order is on its way to you. Here are the shipping details:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #11998e;">Shipping Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Tracking Number:</strong> ${data.trackingNumber || 'Will be provided soon'}</p>
              <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery || 'In a few days'}</p>
            </div>
            <p>You can track your package using the tracking number above.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.websiteUrl || '#'}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Package</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #11998e;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Your Order Has Shipped - #${data.orderNumber}
      
      Great news ${data.recipientName || ''}!
      
      Your order is on its way to you. Here are the shipping details:
      
      Order Number: #${data.orderNumber}
      Tracking Number: ${data.trackingNumber || 'Will be provided soon'}
      Estimated Delivery: ${data.estimatedDelivery || 'In a few days'}
      
      You can track your package using the tracking number above.
      
      Track at: ${data.websiteUrl || 'our website'}
      
      Need help? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.INQUIRY_RECEIVED]: (data: InquiryEmailData) => ({
    subject: `Inquiry Received - #${data.inquiryId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Inquiry Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Inquiry Received</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Thank you ${data.recipientName || 'for contacting us'}!</h2>
            <p>We've received your inquiry and our team will get back to you as soon as possible.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">Inquiry Details</h3>
              <p><strong>Inquiry ID:</strong> #${data.inquiryId}</p>
              <p><strong>Subject:</strong> ${data.inquirySubject}</p>
              ${data.inquiryMessage ? `<p><strong>Message:</strong> ${data.inquiryMessage}</p>` : ''}
            </div>
            <p>We typically respond within 24 hours during business days.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.websiteUrl || '#'}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Our Website</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need immediate assistance? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #667eea;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Inquiry Received - #${data.inquiryId}
      
      Thank you ${data.recipientName || 'for contacting us'}!
      
      We've received your inquiry and our team will get back to you as soon as possible.
      
      Inquiry Details:
      Inquiry ID: #${data.inquiryId}
      Subject: ${data.inquirySubject}
      ${data.inquiryMessage ? `Message: ${data.inquiryMessage}` : ''}
      
      We typically respond within 24 hours during business days.
      
      Visit: ${data.websiteUrl || 'our website'}
      
      Need immediate assistance? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),

  [EmailTemplateType.INQUIRY_RESPONSE]: (data: InquiryEmailData) => ({
    subject: `Response to Your Inquiry - #${data.inquiryId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Inquiry Response</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Response to Your Inquiry</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Hello ${data.recipientName || 'there'}!</h2>
            <p>We're responding to your inquiry. Thank you for your patience.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #11998e;">Original Inquiry</h3>
              <p><strong>Inquiry ID:</strong> #${data.inquiryId}</p>
              <p><strong>Subject:</strong> ${data.inquirySubject}</p>
            </div>
            ${data.responseMessage ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e;">
              <h3 style="margin-top: 0; color: #11998e;">Our Response</h3>
              <p>${data.responseMessage}</p>
            </div>
            ` : ''}
            <p>If you have any follow-up questions, please don't hesitate to contact us.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.websiteUrl || '#'}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Our Website</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #888; font-size: 14px;">
              Need further assistance? Contact us at <a href="mailto:${data.supportEmail || 'support@company.com'}" style="color: #11998e;">${data.supportEmail || 'support@company.com'}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Response to Your Inquiry - #${data.inquiryId}
      
      Hello ${data.recipientName || 'there'}!
      
      We're responding to your inquiry. Thank you for your patience.
      
      Original Inquiry:
      Inquiry ID: #${data.inquiryId}
      Subject: ${data.inquirySubject}
      
      ${data.responseMessage ? `Our Response:\n${data.responseMessage}\n` : ''}
      
      If you have any follow-up questions, please don't hesitate to contact us.
      
      Visit: ${data.websiteUrl || 'our website'}
      
      Need further assistance? Contact us at ${data.supportEmail || 'support@company.com'}
    `,
  }),
};

// Email sending options
export interface SendEmailOptions {
  to: string | string[];
  templateType: EmailTemplateType;
  templateData: EmailTemplateData;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

// Email sending result
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using AWS SES with predefined templates
 * @param options Email sending options
 * @returns Promise<EmailResult>
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const {
      to,
      templateType,
      templateData,
      from = process.env.FROM_EMAIL || 'noreply@yourcompany.com',
      replyTo,
      cc,
      bcc,
    } = options;

    // Validate required environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured');
    }

    // Get the email template
    const templateFunction = emailTemplates[templateType];
    if (!templateFunction) {
      throw new Error(`Email template '${templateType}' not found`);
    }

    // Generate email content from template
    const emailContent = templateFunction(templateData);

    // Prepare recipient lists
    const toAddresses = Array.isArray(to) ? to : [to];
    const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
    const bccAddresses = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;

    // Prepare SES email parameters
    const emailParams: SendEmailCommandInput = {
      Source: from,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
        BccAddresses: bccAddresses,
      },
      Message: {
        Subject: {
          Data: emailContent.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: emailContent.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: emailContent.text,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
    };

    // Send the email
    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);

    console.log(`Email sent successfully: ${result.MessageId}`);
    console.log(`Template: ${templateType}, Recipients: ${toAddresses.join(', ')}`);

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send OTP verification email
 * @param email Recipient email
 * @param otp OTP code
 * @param name Recipient name (optional)
 * @param expiryMinutes OTP expiry time in minutes (default: 10)
 * @returns Promise<EmailResult>
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  name?: string,
  expiryMinutes: number = 10
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.EMAIL_VERIFICATION_OTP,
    templateData: {
      recipientEmail: email,
      recipientName: name,
      otp,
      expiryMinutes,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send welcome email after successful verification
 * @param email Recipient email
 * @param name Recipient name (optional)
 * @returns Promise<EmailResult>
 */
export async function sendWelcomeEmail(email: string, name?: string): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.WELCOME_EMAIL,
    templateData: {
      recipientEmail: email,
      recipientName: name,
      verificationDate: new Date().toLocaleDateString(),
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send forgot password OTP email
 * @param email Recipient email
 * @param otp OTP code
 * @param name Recipient name (optional)
 * @param expiryMinutes OTP expiry time in minutes (default: 10)
 * @returns Promise<EmailResult>
 */
export async function sendForgotPasswordOTP(
  email: string,
  otp: string,
  name?: string,
  expiryMinutes: number = 10
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.FORGOT_PASSWORD_OTP,
    templateData: {
      recipientEmail: email,
      recipientName: name,
      otp,
      expiryMinutes,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send password reset success email
 * @param email Recipient email
 * @param name Recipient name (optional)
 * @returns Promise<EmailResult>
 */
export async function sendPasswordResetSuccess(email: string, name?: string): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.PASSWORD_RESET_SUCCESS,
    templateData: {
      recipientEmail: email,
      recipientName: name,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send order confirmation email
 * @param email Recipient email
 * @param orderData Order information
 * @returns Promise<EmailResult>
 */
export async function sendOrderConfirmation(
  email: string,
  orderData: {
    orderNumber: string;
    orderDate: string;
    orderTotal: string;
    customerName?: string;
  }
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.ORDER_CONFIRMATION,
    templateData: {
      recipientEmail: email,
      recipientName: orderData.customerName,
      orderNumber: orderData.orderNumber,
      orderDate: orderData.orderDate,
      orderTotal: orderData.orderTotal,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send order shipped email
 * @param email Recipient email
 * @param shippingData Shipping information
 * @returns Promise<EmailResult>
 */
export async function sendOrderShipped(
  email: string,
  shippingData: {
    orderNumber: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    customerName?: string;
  }
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.ORDER_SHIPPED,
    templateData: {
      recipientEmail: email,
      recipientName: shippingData.customerName,
      orderNumber: shippingData.orderNumber,
      trackingNumber: shippingData.trackingNumber,
      estimatedDelivery: shippingData.estimatedDelivery,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send inquiry received confirmation email
 * @param email Recipient email
 * @param inquiryData Inquiry information
 * @returns Promise<EmailResult>
 */
export async function sendInquiryReceived(
  email: string,
  inquiryData: {
    inquiryId: string;
    inquirySubject: string;
    inquiryMessage?: string;
    customerName?: string;
  }
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.INQUIRY_RECEIVED,
    templateData: {
      recipientEmail: email,
      recipientName: inquiryData.customerName,
      inquiryId: inquiryData.inquiryId,
      inquirySubject: inquiryData.inquirySubject,
      inquiryMessage: inquiryData.inquiryMessage,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

/**
 * Send inquiry response email
 * @param email Recipient email
 * @param responseData Response information
 * @returns Promise<EmailResult>
 */
export async function sendInquiryResponse(
  email: string,
  responseData: {
    inquiryId: string;
    inquirySubject: string;
    responseMessage: string;
    customerName?: string;
  }
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.INQUIRY_RESPONSE,
    templateData: {
      recipientEmail: email,
      recipientName: responseData.customerName,
      inquiryId: responseData.inquiryId,
      inquirySubject: responseData.inquirySubject,
      responseMessage: responseData.responseMessage,
      companyName: process.env.COMPANY_NAME,
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.WEBSITE_URL,
    },
  });
}

// Export the SES client for advanced usage if needed
export { sesClient };