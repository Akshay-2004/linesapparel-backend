# SMTP Email Utility

A comprehensive email utility for sending various types of emails using SMTP with nodemailer and pre-designed templates.

## Features

- 🚀 **SMTP Integration**: Reliable email delivery using SMTP protocol
- 📧 **Pre-built Templates**: Ready-to-use email templates for common use cases
- 🎨 **Professional Design**: Beautiful, responsive HTML email templates
- 📱 **Mobile Friendly**: Templates optimized for all devices
- 🔧 **Type Safe**: Full TypeScript support with proper interfaces
- 🎯 **Template System**: Easy to extend with new email types
- 📊 **Error Handling**: Comprehensive error handling and logging

## Email Templates

### Authentication & Account Management
- **Email Verification OTP**: Send OTP codes for email verification
- **Welcome Email**: Welcome users after successful verification
- **Forgot Password OTP**: Send OTP for password reset
- **Password Reset Success**: Confirm successful password reset

### E-commerce
- **Order Confirmation**: Confirm orders with details
- **Order Shipped**: Notify customers when orders ship
- **Inquiry Received**: Acknowledge customer inquiries
- **Inquiry Response**: Respond to customer inquiries

## Setup

### 1. Install Dependencies

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=email-smtp.eu-north-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Email Configuration
FROM_EMAIL_NO_REPLY=noreply@linesapparel.ca
SUPPORT_EMAIL=support@linesapparel.ca
COMPANY_NAME=Lines Apparel
WEBSITE_URL=https://linesapparel.ca
```

## Quick Start

### Basic Usage

```typescript
import { sendOTPEmail, sendWelcomeEmail } from '../utils/mail.helpers';

// Send OTP for email verification
const otpResult = await sendOTPEmail(
  'user@example.com',
  '123456',
  'John Doe',
  10 // expires in 10 minutes
);

// Send welcome email
const welcomeResult = await sendWelcomeEmail('user@example.com', 'John Doe');
```

### Advanced Usage

```typescript
import { sendEmail, EmailTemplateType } from '../utils/mail.helpers';

// Send custom email with specific template
const result = await sendEmail({
  to: 'customer@example.com',
  templateType: EmailTemplateType.ORDER_CONFIRMATION,
  templateData: {
    recipientEmail: 'customer@example.com',
    recipientName: 'Jane Smith',
    orderNumber: 'LA-2024-001',
    orderDate: '2024-01-15',
    orderTotal: '$129.99',
    companyName: 'Lines Apparel',
    supportEmail: 'support@linesapparel.ca',
    websiteUrl: 'https://linesapparel.ca',
  },
});
```

## API Reference

### Core Functions

#### `sendEmail(options: SendEmailOptions): Promise<EmailResult>`

The main function for sending emails with templates.

**Parameters:**
- `options.to` (string): Recipient email address
- `options.templateType` (EmailTemplateType): Template to use
- `options.templateData` (EmailTemplateData): Data for template variables
- `options.from` (string, optional): Sender email (defaults to FROM_EMAIL_NO_REPLY)
- `options.replyTo` (string, optional): Reply-to email address
- `options.cc` (string[], optional): CC recipients
- `options.bcc` (string[], optional): BCC recipients

**Returns:** Promise resolving to EmailResult with success status and message ID

### Convenience Functions

#### `sendOTPEmail(email, otp, name?, expiryMinutes?)`
Send OTP for email verification or password reset.

#### `sendWelcomeEmail(email, name?)`
Send welcome email to new users.

#### `sendForgotPasswordOTP(email, otp, name?, expiryMinutes?)`
Send OTP for password reset.

#### `sendPasswordResetSuccess(email, name?)`
Confirm successful password reset.

#### `sendOrderConfirmation(email, orderData)`
Send order confirmation with details.

#### `sendOrderShipped(email, shippingData)`
Notify customer about order shipment.

#### `sendInquiryReceived(email, inquiryData)`
Acknowledge customer inquiry.

#### `sendInquiryResponse(email, responseData)`
Send response to customer inquiry.

## Email Template Types

```typescript
enum EmailTemplateType {
  EMAIL_VERIFICATION_OTP = 'EMAIL_VERIFICATION_OTP',
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  FORGOT_PASSWORD_OTP = 'FORGOT_PASSWORD_OTP',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  INQUIRY_RECEIVED = 'INQUIRY_RECEIVED',
  INQUIRY_RESPONSE = 'INQUIRY_RESPONSE',
}
```

## Template Data Interfaces

### Base Email Data
```typescript
interface BaseEmailData {
  recipientEmail: string;
  recipientName?: string;
  companyName?: string;
  supportEmail?: string;
  websiteUrl?: string;
}
```

### OTP Email Data
```typescript
interface OTPEmailData extends BaseEmailData {
  otp: string;
  expiryMinutes: number;
}
```

### Order Email Data
```typescript
interface OrderEmailData extends BaseEmailData {
  orderNumber: string;
  orderDate: string;
  orderTotal: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}
```

### Inquiry Email Data
```typescript
interface InquiryEmailData extends BaseEmailData {
  inquiryId: string;
  inquirySubject: string;
  inquiryMessage?: string;
  responseMessage?: string;
}
```

## Usage in Controllers

### Authentication Controller Example

```typescript
import { sendOTPEmail, sendWelcomeEmail } from '../utils/mail.helpers';

// During user registration
export const registerUser = async (req: Request, res: Response) => {
  try {
    // ... user creation logic ...
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Send verification OTP
    const emailResult = await sendOTPEmail(
      user.email,
      otpCode,
      user.name,
      10
    );
    
    if (!emailResult.success) {
      console.error('Failed to send OTP:', emailResult.error);
      // Handle error appropriately
    }
    
    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    // Handle error
  }
};

// After email verification
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // ... verification logic ...
    
    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);
    
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    // Handle error
  }
};
```

### Order Controller Example

```typescript
import { sendOrderConfirmation } from '../utils/mail.helpers';

export const createOrder = async (req: Request, res: Response) => {
  try {
    // ... order creation logic ...
    
    // Send order confirmation
    const emailResult = await sendOrderConfirmation(order.customerEmail, {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toLocaleDateString(),
      orderTotal: `$${order.total.toFixed(2)}`,
      customerName: order.customerName,
    });
    
    if (!emailResult.success) {
      console.error('Failed to send order confirmation:', emailResult.error);
    }
    
    res.json({ success: true, order });
  } catch (error) {
    // Handle error
  }
};
```

## Error Handling

The email utility includes comprehensive error handling:

```typescript
const result = await sendOTPEmail('user@example.com', '123456');

if (result.success) {
  console.log('Email sent successfully:', result.messageId);
} else {
  console.error('Email failed to send:', result.error);
  // Handle the error appropriately
  // - Log the error
  // - Retry the operation
  // - Show user-friendly message
}
```

## Best Practices

### 1. Environment Configuration
- Always use environment variables for SMTP credentials
- Never commit sensitive information to version control
- Use different SMTP settings for development and production

### 2. Error Handling
- Always check the success status of email operations
- Log email failures for debugging
- Implement retry logic for critical emails
- Provide fallback mechanisms

### 3. Template Customization
- Customize email templates to match your brand
- Test templates across different email clients
- Keep HTML simple and compatible
- Always provide plain text alternatives

### 4. Performance
- Use bulk email functions for multiple recipients
- Implement rate limiting to respect SMTP limits
- Consider using background jobs for non-critical emails

### 5. Security
- Validate email addresses before sending
- Use secure SMTP connections (TLS/SSL)
- Implement proper authentication
- Monitor for suspicious email patterns

## Testing

### Unit Testing
```typescript
import { sendOTPEmail } from '../utils/mail.helpers';

describe('Email Utility', () => {
  it('should send OTP email successfully', async () => {
    const result = await sendOTPEmail(
      'test@example.com',
      '123456',
      'Test User',
      10
    );
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});
```

### Integration Testing
- Test with real SMTP servers in staging environment
- Verify email delivery and formatting
- Test all template types and data variations

## Troubleshooting

### Common Issues

#### 1. Authentication Failed
**Error:** "Invalid login: 535-5.7.8 Username and Password not accepted"
**Solution:** 
- Verify SMTP credentials in environment variables
- Check if SMTP user has proper permissions
- Ensure using correct SMTP host and port

#### 2. Connection Timeout
**Error:** "Connection timeout"
**Solution:**
- Check SMTP host and port configuration
- Verify network connectivity
- Check firewall settings

#### 3. Rate Limiting
**Error:** "Rate limit exceeded"
**Solution:**
- Implement delays between bulk emails
- Use proper batch sizes
- Consider upgrading SMTP service plan

#### 4. Template Rendering Issues
**Error:** Template variables not displaying correctly
**Solution:**
- Verify template data structure
- Check for typos in variable names
- Ensure all required fields are provided

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG_EMAIL=true
```

This will provide detailed information about SMTP connections and email sending operations.

## Migration from AWS SES

If migrating from AWS SES to SMTP:

1. **Update Dependencies:**
   ```bash
   npm uninstall @aws-sdk/client-ses
   npm install nodemailer @types/nodemailer
   ```

2. **Update Environment Variables:**
   ```bash
   # Remove AWS variables
   # AWS_REGION=
   # AWS_ACCESS_KEY_ID=
   # AWS_SECRET_ACCESS_KEY=
   
   # Add SMTP variables
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   ```

3. **Update Import Statements:**
   ```typescript
   // Old AWS SES imports
   // import { SESClient } from '@aws-sdk/client-ses';
   
   // New SMTP imports
   import { sendEmail, EmailTemplateType } from '../utils/mail.helpers';
   ```

4. **Test Thoroughly:**
   - Verify all email templates work correctly
   - Test error handling and edge cases
   - Monitor email delivery rates

## Support

For additional support and questions:
- Check the [examples](../examples/emailExamples.ts) for implementation patterns
- Review error logs for specific issues
- Ensure environment variables are properly configured
- Test with a minimal example to isolate problems

---

**Note:** This utility is designed for transactional emails. For marketing emails or newsletters, consider using dedicated email marketing services that provide better deliverability and analytics.
