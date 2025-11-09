import {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendForgotPasswordOTP,
  sendPasswordResetSuccess,
  sendOrderConfirmation,
  sendOrderShipped,
  sendInquiryReceived,
  sendInquiryResponse,
  EmailTemplateType,
} from '../utils/mail.helpers';

/**
 * Example usage of the email utility functions
 * This file demonstrates how to use the SMTP email service with nodemailer
 */

// Example 1: Send OTP for email verification
export async function sendVerificationOTP(userEmail: string, userName: string, otpCode: string) {
  try {
    const result = await sendOTPEmail(userEmail, otpCode, userName, 10);
    
    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      console.error('Failed to send verification OTP:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending verification OTP:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Example 2: Send welcome email after successful verification
export async function sendUserWelcomeEmail(userEmail: string, userName: string) {
  try {
    const result = await sendWelcomeEmail(userEmail, userName);
    
    if (result.success) {
      return { success: true };
    } else {
      console.error('Failed to send welcome email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Example 3: Send forgot password OTP
export async function sendPasswordResetOTP(userEmail: string, userName: string, otpCode: string) {
  try {
    const result = await sendForgotPasswordOTP(userEmail, otpCode, userName, 15);
    
    if (result.success) {
      return { success: true };
    } else {
      console.error('Failed to send password reset OTP:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending password reset OTP:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Example 4: Send order confirmation
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderDetails: {
    customerName: string;
    orderNumber: string;
    orderDate: string;
    orderTotal: string;
  }
) {
  try {
    const result = await sendOrderConfirmation(customerEmail, orderDetails);
    
    if (result.success) {
      return { success: true };
    } else {
      console.error('Failed to send order confirmation:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Example 5: Send custom email using the generic sendEmail function
export async function sendCustomEmail(recipientEmail: string, subject: string, htmlContent: string) {
  try {
    // For custom emails not covered by templates, you can extend the EmailTemplateType enum
    // and add a new template to the emailTemplates object in mail.ts
    
    // For now, let's use a workaround with a custom template
    const result = await sendEmail({
      to: recipientEmail,
      templateType: EmailTemplateType.WELCOME_EMAIL, // Using existing template as base
      templateData: {
        recipientEmail,
        recipientName: 'Valued Customer',
        companyName: process.env.COMPANY_NAME,
        supportEmail: process.env.SUPPORT_EMAIL,
        websiteUrl: process.env.WEBSITE_URL,
      },
    });
    
    if (result.success) {
      return { success: true };
    } else {
      console.error('Failed to send custom email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending custom email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Example 6: Send inquiry confirmation
export async function sendInquiryConfirmation(
  customerEmail: string,
  inquiryDetails: {
    customerName: string;
    inquiryId: string;
    inquirySubject: string;
    inquiryMessage: string;
  }
) {
  try {
    const result = await sendInquiryReceived(customerEmail, inquiryDetails);
    
    if (result.success) {
      return { success: true };
    } else {
      console.error('Failed to send inquiry confirmation:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending inquiry confirmation:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Example 7: Send bulk emails (e.g., newsletter, promotional emails)
export async function sendBulkEmail(
  recipients: string[],
  templateType: EmailTemplateType,
  templateData: any
) {
  const results: Array<{ email: string; success: boolean; error?: string }> = [];
  
  // Send emails in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (email) => {
      try {
        const result = await sendEmail({
          to: email,
          templateType,
          templateData: {
            ...templateData,
            recipientEmail: email,
          },
        });
        
        return {
          email,
          success: result.success,
          error: result.error,
        };
      } catch (error) {
        return {
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add a small delay between batches to respect rate limits
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  return {
    totalSent: successCount,
    totalFailed: failureCount,
    results,
  };
}

// Example usage in your controllers:
/*
// In auth.controller.ts
import { sendVerificationOTP, sendUserWelcomeEmail } from '../examples/emailExamples';

// During user registration
const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
await sendVerificationOTP(user.email, user.name, otpCode);

// After email verification
await sendUserWelcomeEmail(user.email, user.name);
*/
