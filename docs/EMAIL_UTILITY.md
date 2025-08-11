# AWS SES Email Utility

A comprehensive email utility for sending various types of emails using AWS SES (Simple Email Service) with pre-designed templates.

## Features

- 🚀 **AWS SES Integration**: Reliable email delivery using AWS infrastructure
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
npm install @aws-sdk/client-ses
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# AWS SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
FROM_EMAIL=noreply@yourcompany.com

# Email Configuration
COMPANY_NAME=Your Company Name
SUPPORT_EMAIL=support@yourcompany.com
WEBSITE_URL=https://yourwebsite.com
```

### 3. AWS SES Setup

1. **Create AWS Account**: If you don't have one already
2. **Verify Email Addresses**: In AWS SES console, verify your sender email address
3. **Get Out of Sandbox**: Request production access for sending to unverified emails
4. **Create IAM User**: Create an IAM user with SES sending permissions
5. **Get Credentials**: Note down the Access Key ID and Secret Access Key

### Required IAM Permissions

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

## Usage

### Basic Usage

```typescript
import { sendOTPEmail, sendWelcomeEmail } from '../utils/mail';

// Send OTP verification email
const result = await sendOTPEmail(
  'user@example.com',
  '123456',
  'John Doe',
  10 // OTP expires in 10 minutes
);

if (result.success) {
  console.log('Email sent successfully:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Available Functions

#### Authentication Emails

```typescript
// Send email verification OTP
await sendOTPEmail(email, otp, userName, expiryMinutes);

// Send welcome email
await sendWelcomeEmail(email, userName);

// Send forgot password OTP
await sendForgotPasswordOTP(email, otp, userName, expiryMinutes);

// Send password reset success confirmation
await sendPasswordResetSuccess(email, userName);
```

#### E-commerce Emails

```typescript
// Send order confirmation
await sendOrderConfirmation(email, {
  orderNumber: 'ORD-001',
  orderDate: '2025-01-15',
  orderTotal: '$99.99',
  customerName: 'John Doe'
});

// Send order shipped notification
await sendOrderShipped(email, {
  orderNumber: 'ORD-001',
  trackingNumber: 'TRK123456',
  estimatedDelivery: '2025-01-20',
  customerName: 'John Doe'
});
```

#### Customer Service Emails

```typescript
// Send inquiry received confirmation
await sendInquiryReceived(email, {
  inquiryId: 'INQ-001',
  inquirySubject: 'Product Question',
  inquiryMessage: 'Question about product availability',
  customerName: 'John Doe'
});

// Send inquiry response
await sendInquiryResponse(email, {
  inquiryId: 'INQ-001',
  inquirySubject: 'Product Question',
  responseMessage: 'The product is available and in stock.',
  customerName: 'John Doe'
});
```

### Advanced Usage

#### Custom Email with Generic Function

```typescript
import { sendEmail, EmailTemplateType } from '../utils/mail';

const result = await sendEmail({
  to: 'recipient@example.com',
  templateType: EmailTemplateType.WELCOME_EMAIL,
  templateData: {
    recipientEmail: 'recipient@example.com',
    recipientName: 'John Doe',
    companyName: 'My Company',
    supportEmail: 'support@mycompany.com',
    websiteUrl: 'https://mycompany.com'
  },
  from: 'custom@mycompany.com',
  replyTo: 'noreply@mycompany.com',
  cc: ['manager@mycompany.com'],
  bcc: ['archive@mycompany.com']
});
```

#### Bulk Email Sending

```typescript
const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

const bulkResult = await sendBulkEmail(
  recipients,
  EmailTemplateType.WELCOME_EMAIL,
  {
    companyName: 'My Company',
    supportEmail: 'support@mycompany.com',
    websiteUrl: 'https://mycompany.com'
  }
);

console.log(`Sent: ${bulkResult.totalSent}, Failed: ${bulkResult.totalFailed}`);
```

## Integration Examples

### In Authentication Controller

```typescript
// auth.controller.ts
import { sendOTPEmail, sendWelcomeEmail } from '../utils/mail';

export const register = async (req: Request, res: Response) => {
  try {
    // Create user logic...
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Send verification email
    const emailResult = await sendOTPEmail(user.email, otp, user.name);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Handle email failure (maybe still allow registration but log the issue)
    }
    
    res.json({ message: 'Registration successful. Please check your email for verification.' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Verify OTP logic...
    
    // Send welcome email after successful verification
    await sendWelcomeEmail(user.email, user.name);
    
    res.json({ message: 'Email verified successfully!' });
  } catch (error) {
    res.status(400).json({ error: 'Verification failed' });
  }
};
```

### In Order Controller

```typescript
// order.controller.ts
import { sendOrderConfirmation, sendOrderShipped } from '../utils/mail';

export const createOrder = async (req: Request, res: Response) => {
  try {
    // Create order logic...
    
    // Send order confirmation
    await sendOrderConfirmation(customer.email, {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toLocaleDateString(),
      orderTotal: `$${order.total.toFixed(2)}`,
      customerName: customer.name
    });
    
    res.json({ message: 'Order created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Order creation failed' });
  }
};
```

## Template Customization

To add new email templates:

1. **Add to EmailTemplateType enum**:
```typescript
export enum EmailTemplateType {
  // ... existing types
  CUSTOM_TEMPLATE = 'CUSTOM_TEMPLATE',
}
```

2. **Add template function**:
```typescript
const emailTemplates: Record<EmailTemplateType, (data: any) => { subject: string; html: string; text: string }> = {
  // ... existing templates
  [EmailTemplateType.CUSTOM_TEMPLATE]: (data: CustomEmailData) => ({
    subject: 'Your Custom Subject',
    html: `<!-- Your HTML template -->`,
    text: `Your text template`,
  }),
};
```

3. **Create helper function**:
```typescript
export async function sendCustomTemplate(email: string, data: CustomEmailData): Promise<EmailResult> {
  return sendEmail({
    to: email,
    templateType: EmailTemplateType.CUSTOM_TEMPLATE,
    templateData: data,
  });
}
```

## Error Handling

The utility includes comprehensive error handling:

```typescript
const result = await sendOTPEmail('user@example.com', '123456');

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
  // Handle the error appropriately
  // - Log to monitoring service
  // - Retry sending
  // - Notify administrators
  // - Show user-friendly message
}
```

## Rate Limits

AWS SES has rate limits. The utility includes:
- Batch processing for bulk emails
- Automatic delays between batches
- Error handling for rate limit exceeded

## Security Best Practices

1. **Environment Variables**: Never hardcode AWS credentials
2. **IAM Roles**: Use minimal required permissions
3. **Email Validation**: Validate email addresses before sending
4. **Rate Limiting**: Implement application-level rate limiting
5. **Monitoring**: Monitor email sending metrics and failures
6. **Bounce Handling**: Implement bounce and complaint handling

## Troubleshooting

### Common Issues

1. **Email not delivered**: Check spam folder, verify sender email in AWS SES
2. **Rate limit exceeded**: Implement delays between emails
3. **Invalid credentials**: Verify AWS credentials and region
4. **Sandbox mode**: Request production access in AWS SES console

### Debugging

Enable detailed logging by setting environment variable:
```bash
DEBUG=email
```

## Cost Optimization

- **Free Tier**: 62,000 emails per month when sending from EC2
- **Pay-as-you-go**: $0.10 per 1,000 emails after free tier
- **Monitor Usage**: Use AWS CloudWatch to monitor costs

## Support

For issues and questions:
- Check AWS SES documentation
- Review CloudWatch logs
- Contact AWS support for service issues
- Create issues in your project repository
