import nodemailer from 'nodemailer';

// SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.eu-north-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports like 587
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    tls: {
      rejectUnauthorized: false // For development, set to true in production
    }
  });
};

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
  recipientEmail: string;
  recipientName?: string;
  companyName?: string;
  supportEmail?: string;
  websiteUrl?: string;
}

// Specific Template Data Interfaces
export interface OTPEmailData extends BaseEmailData {
  otp: string;
  expiryMinutes: number;
}

export interface WelcomeEmailData extends BaseEmailData {
  // No additional fields needed
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
const emailTemplates: Record<EmailTemplateType, (data: EmailTemplateData) => { subject: string; html: string; text: string }> = {
  [EmailTemplateType.EMAIL_VERIFICATION_OTP]: (data: OTPEmailData) => ({
    subject: 'Verify Your Email Address',
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: #e7f3ff; border: 2px dashed #007bff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-number { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔐 Email Verification</h1>
            <p>Please verify your email address to continue</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Thank you for signing up with ${data.companyName || 'Lines Apparel'}! To complete your registration, please use the verification code below:</p>
            
            <div class="otp-code">
                <p>Your verification code is:</p>
                <div class="otp-number">${data.otp}</div>
                <p><small>This code will expire in ${data.expiryMinutes} minutes</small></p>
            </div>
            
            <p>If you didn't request this verification, please ignore this email.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Email Verification
    
    Hello ${data.recipientName || 'there'},
    
    Thank you for signing up with ${data.companyName || 'Lines Apparel'}! To complete your registration, please use the verification code below:
    
    Your verification code: ${data.otp}
    
    This code will expire in ${data.expiryMinutes} minutes.
    
    If you didn't request this verification, please ignore this email.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.WELCOME_EMAIL]: (data: WelcomeEmailData) => ({
    subject: `Welcome to ${data.companyName || 'Lines Apparel'}!`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Welcome to ${data.companyName || 'Lines Apparel'}!</h1>
            <p>We're excited to have you on board</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Welcome to ${data.companyName || 'Lines Apparel'}! Your email has been successfully verified and your account is now active.</p>
            
            <p>Here's what you can do next:</p>
            <ul>
                <li>Browse our latest collection</li>
                <li>Set up your profile and preferences</li>
                <li>Start shopping and enjoy exclusive member benefits</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${data.websiteUrl || 'https://linesapparel.ca'}" class="button">Start Shopping</a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Welcome to ${data.companyName || 'Lines Apparel'}!
    
    Hello ${data.recipientName || 'there'},
    
    Welcome to ${data.companyName || 'Lines Apparel'}! Your email has been successfully verified and your account is now active.
    
    Here's what you can do next:
    - Browse our latest collection
    - Set up your profile and preferences
    - Start shopping and enjoy exclusive member benefits
    
    Visit us at: ${data.websiteUrl || 'https://linesapparel.ca'}
    
    If you have any questions, feel free to reach out to our support team.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.FORGOT_PASSWORD_OTP]: (data: OTPEmailData) => ({
    subject: 'Reset Your Password',
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: #fff3cd; border: 2px dashed #ffc107; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-number { font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔑 Password Reset</h1>
            <p>Reset your password securely</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>We received a request to reset your password for your ${data.companyName || 'Lines Apparel'} account.</p>
            
            <div class="otp-code">
                <p>Your password reset code is:</p>
                <div class="otp-number">${data.otp}</div>
                <p><small>This code will expire in ${data.expiryMinutes} minutes</small></p>
            </div>
            
            <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Password Reset
    
    Hello ${data.recipientName || 'there'},
    
    We received a request to reset your password for your ${data.companyName || 'Lines Apparel'} account.
    
    Your password reset code: ${data.otp}
    
    This code will expire in ${data.expiryMinutes} minutes.
    
    Important: If you didn't request this password reset, please ignore this email and ensure your account is secure.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.PASSWORD_RESET_SUCCESS]: (data: BaseEmailData) => ({
    subject: 'Password Reset Successful',
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>✅ Password Reset Successful</h1>
            <p>Your password has been updated</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Your password for ${data.companyName || 'Lines Apparel'} has been successfully reset.</p>
            
            <p>You can now log in with your new password. If you didn't make this change, please contact our support team immediately.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Password Reset Successful
    
    Hello ${data.recipientName || 'there'},
    
    Your password for ${data.companyName || 'Lines Apparel'} has been successfully reset.
    
    You can now log in with your new password. If you didn't make this change, please contact our support team immediately.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.ORDER_CONFIRMATION]: (data: OrderEmailData) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6f42c1 0%, #007bff 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🛍️ Order Confirmed!</h1>
            <p>Thank you for your purchase</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Thank you for your order! We've received your order and are processing it now.</p>
            
            <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Total Amount:</strong> ${data.orderTotal}</p>
            </div>
            
            <p>You'll receive another email when your order ships with tracking information.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Order Confirmed!
    
    Hello ${data.recipientName || 'there'},
    
    Thank you for your order! We've received your order and are processing it now.
    
    Order Details:
    Order Number: ${data.orderNumber}
    Order Date: ${data.orderDate}
    Total Amount: ${data.orderTotal}
    
    You'll receive another email when your order ships with tracking information.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.ORDER_SHIPPED]: (data: OrderEmailData) => ({
    subject: `Your Order ${data.orderNumber} Has Shipped!`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .shipping-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📦 Your Order Has Shipped!</h1>
            <p>Your package is on its way</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Great news! Your order has been shipped and is on its way to you.</p>
            
            <div class="shipping-details">
                <h3>Shipping Details</h3>
                <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
                ${data.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
            </div>
            
            <p>You can track your package using the tracking number provided above.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Your Order Has Shipped!
    
    Hello ${data.recipientName || 'there'},
    
    Great news! Your order has been shipped and is on its way to you.
    
    Shipping Details:
    Order Number: ${data.orderNumber}
    ${data.trackingNumber ? `Tracking Number: ${data.trackingNumber}` : ''}
    ${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ''}
    
    You can track your package using the tracking number provided above.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.INQUIRY_RECEIVED]: (data: InquiryEmailData) => ({
    subject: `We've Received Your Inquiry - ${data.inquiryId}`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inquiry Received</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .inquiry-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>💬 Inquiry Received</h1>
            <p>We'll get back to you soon</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Thank you for contacting ${data.companyName || 'Lines Apparel'}! We've received your inquiry and will respond as soon as possible.</p>
            
            <div class="inquiry-details">
                <h3>Your Inquiry</h3>
                <p><strong>Inquiry ID:</strong> ${data.inquiryId}</p>
                <p><strong>Subject:</strong> ${data.inquirySubject}</p>
                ${data.inquiryMessage ? `<p><strong>Message:</strong> ${data.inquiryMessage}</p>` : ''}
            </div>
            
            <p>We typically respond within 24 hours during business days. For urgent matters, please call our support line.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Inquiry Received
    
    Hello ${data.recipientName || 'there'},
    
    Thank you for contacting ${data.companyName || 'Lines Apparel'}! We've received your inquiry and will respond as soon as possible.
    
    Your Inquiry:
    Inquiry ID: ${data.inquiryId}
    Subject: ${data.inquirySubject}
    ${data.inquiryMessage ? `Message: ${data.inquiryMessage}` : ''}
    
    We typically respond within 24 hours during business days. For urgent matters, please call our support line.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),

  [EmailTemplateType.INQUIRY_RESPONSE]: (data: InquiryEmailData) => ({
    subject: `Response to Your Inquiry - ${data.inquiryId}`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inquiry Response</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #17a2b8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .response-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>✉️ Response to Your Inquiry</h1>
            <p>We're here to help</p>
        </div>
        <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>Thank you for your patience. Here's our response to your inquiry:</p>
            
            <div class="response-details">
                <h3>Original Inquiry</h3>
                <p><strong>Inquiry ID:</strong> ${data.inquiryId}</p>
                <p><strong>Subject:</strong> ${data.inquirySubject}</p>
                
                <h3>Our Response</h3>
                <p>${data.responseMessage}</p>
            </div>
            
            <p>If you have any follow-up questions, please don't hesitate to contact us again.</p>
            
            <p>Best regards,<br>
            The ${data.companyName || 'Lines Apparel'} Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:${data.supportEmail || 'support@linesapparel.ca'}">${data.supportEmail || 'support@linesapparel.ca'}</a></p>
        </div>
    </body>
    </html>
    `,
    text: `
    Response to Your Inquiry
    
    Hello ${data.recipientName || 'there'},
    
    Thank you for your patience. Here's our response to your inquiry:
    
    Original Inquiry:
    Inquiry ID: ${data.inquiryId}
    Subject: ${data.inquirySubject}
    
    Our Response:
    ${data.responseMessage}
    
    If you have any follow-up questions, please don't hesitate to contact us again.
    
    Best regards,
    The ${data.companyName || 'Lines Apparel'} Team
    
    © ${new Date().getFullYear()} ${data.companyName || 'Lines Apparel'}. All rights reserved.
    Need help? Contact us at ${data.supportEmail || 'support@linesapparel.ca'}
    `,
  }),
};

export interface SendEmailOptions {
  to: string;
  templateType: EmailTemplateType;
  templateData: EmailTemplateData;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const transporter = createTransporter();
    
    // Get template
    const template = emailTemplates[options.templateType];
    if (!template) {
      throw new Error(`Unknown email template: ${options.templateType}`);
    }

    // Generate email content
    const { subject, html, text } = template(options.templateData);

    // Prepare email options
    const mailOptions = {
      from: options.from || process.env.FROM_EMAIL_NO_REPLY || 'noreply@linesapparel.ca',
      to: options.to,
      subject,
      html,
      text,
      ...(options.replyTo && { replyTo: options.replyTo }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
    };

    console.log(`📧 Sending email to ${options.to} with template ${options.templateType}`);

    // Send email
    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Convenience functions for specific email types
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
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.WELCOME_EMAIL,
    templateData: {
      recipientEmail: email,
      recipientName: name,
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

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
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

export async function sendPasswordResetSuccess(email: string, name?: string): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.PASSWORD_RESET_SUCCESS,
    templateData: {
      recipientEmail: email,
      recipientName: name,
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

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
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

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
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

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
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

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
      companyName: 'Lines Apparel',
      supportEmail: process.env.FROM_EMAIL_NO_REPLY || 'support@linesapparel.ca',
      websiteUrl: 'https://linesapparel.ca',
    },
  });
}

// Export transporter for testing purposes
export { createTransporter };