import nodemailer from 'nodemailer';
import {
  EmailRequest,
  EmailResult,
  EmailType,
  EmailStatus,
  EmailError,
  QuoteCalculation,
  PDFGenerationResult,
  ValidationError
} from '@/types';
import { config } from '@/config';
import { Logger } from '@/utils/Logger';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger: Logger;
  private emailConfig: any;

  constructor() {
    this.logger = Logger.getInstance();
    this.emailConfig = config.getEmailConfig();
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransporter({
        host: this.emailConfig.smtp_host,
        port: this.emailConfig.smtp_port,
        secure: this.emailConfig.smtp_secure, // true for 465, false for other ports
        auth: {
          user: this.emailConfig.smtp_user,
          pass: this.emailConfig.smtp_password
        },
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, // 1 second
        rateLimit: 5 // max 5 messages per second
      });

      // Verify connection
      this.verifyConnection();

    } catch (error) {
      this.logger.error('Failed to initialize email transporter', { error });
      throw new EmailError('Email service initialization failed', { error });
    }
  }

  /**
   * Verify email connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.info('Email service initialized successfully', {
        host: this.emailConfig.smtp_host,
        port: this.emailConfig.smtp_port
      });
    } catch (error) {
      this.logger.warn('Email service verification failed', { error });
      // Don't throw error here - service might still work
    }
  }

  /**
   * Send email
   */
  public async sendEmail(request: EmailRequest): Promise<EmailResult> {
    try {
      this.logger.info('Sending email', {
        emailType: request.email_type,
        recipient: request.recipient_email || request.quote_calculation.customer.email,
        customerId: request.quote_calculation.customer.id
      });

      // Validate request
      this.validateEmailRequest(request);

      // Generate email content
      const emailContent = await this.generateEmailContent(request);

      // Prepare mail options
      const mailOptions = await this.prepareMailOptions(request, emailContent);

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      const result: EmailResult = {
        email_id: this.generateEmailId(),
        sent_at: new Date(),
        recipient: mailOptions.to as string,
        status: EmailStatus.SENT,
      };

      this.logger.info('Email sent successfully', {
        emailId: result.email_id,
        messageId: info.messageId,
        recipient: result.recipient
      });

      return result;

    } catch (error) {
      this.logger.error('Email sending failed', { request, error });

      const result: EmailResult = {
        email_id: this.generateEmailId(),
        sent_at: new Date(),
        recipient: request.recipient_email || request.quote_calculation.customer.email,
        status: EmailStatus.FAILED,
        error_message: error.message
      };

      return result;
    }
  }

  /**
   * Validate email request
   */
  private validateEmailRequest(request: EmailRequest): void {
    if (!request.quote_calculation) {
      throw new ValidationError('Quote calculation is required');
    }

    if (!request.email_type) {
      throw new ValidationError('Email type is required');
    }

    const customer = request.quote_calculation.customer;
    if (!customer || !customer.email) {
      throw new ValidationError('Customer email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const targetEmail = request.recipient_email || customer.email;
    
    if (!emailRegex.test(targetEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate scheduled send date
    if (request.scheduled_send && new Date(request.scheduled_send) <= new Date()) {
      throw new ValidationError('Scheduled send time must be in the future');
    }
  }

  /**
   * Generate email content based on type
   */
  private async generateEmailContent(request: EmailRequest): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    const quote = request.quote_calculation;
    const customer = quote.customer;
    const customerName = customer.company_name || `${customer.first_name} ${customer.last_name}`;

    switch (request.email_type) {
      case EmailType.QUOTE_CREATED:
        return this.generateQuoteCreatedContent(quote, customerName, request.custom_message);
      
      case EmailType.QUOTE_UPDATED:
        return this.generateQuoteUpdatedContent(quote, customerName, request.custom_message);
      
      case EmailType.QUOTE_APPROVED:
        return this.generateQuoteApprovedContent(quote, customerName, request.custom_message);
      
      case EmailType.QUOTE_REJECTED:
        return this.generateQuoteRejectedContent(quote, customerName, request.custom_message);
      
      case EmailType.QUOTE_EXPIRED:
        return this.generateQuoteExpiredContent(quote, customerName, request.custom_message);
      
      case EmailType.FOLLOW_UP:
        return this.generateFollowUpContent(quote, customerName, request.custom_message);
      
      case EmailType.REMINDER:
        return this.generateReminderContent(quote, customerName, request.custom_message);
      
      default:
        throw new ValidationError(`Unsupported email type: ${request.email_type}`);
    }
  }

  /**
   * Generate quote created email content
   */
  private generateQuoteCreatedContent(
    quote: QuoteCalculation, 
    customerName: string, 
    customMessage?: string
  ): { subject: string; html: string; text: string } {
    const subject = `Your Cabinet Quote - ${quote.quote_id || 'Draft'}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .quote-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .total { font-size: 24px; font-weight: bold; color: #2563eb; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Cabinet Quote is Ready!</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName},</p>
            
            <p>Thank you for your interest in our cabinet solutions. We've prepared a detailed quote for your project.</p>
            
            ${customMessage ? `<p><em>${customMessage}</em></p>` : ''}
            
            <div class="quote-summary">
              <h3>Quote Summary</h3>
              <p><strong>Quote ID:</strong> ${quote.quote_id || 'Draft'}</p>
              <p><strong>Total Items:</strong> ${quote.line_items.length}</p>
              <p><strong>Valid Until:</strong> ${this.formatDate(quote.valid_until)}</p>
              <p class="total">Total: ${this.formatCurrency(quote.total_amount)}</p>
            </div>
            
            <p>Your quote includes:</p>
            <ul>
              ${quote.line_items.map(item => 
                `<li>${item.quantity}x ${item.product_variant.sku} - ${this.formatCurrency(item.line_total)}</li>`
              ).join('')}
            </ul>
            
            <p>If you have any questions about this quote, please don't hesitate to contact us. We're here to help bring your vision to life!</p>
            
            <p>Best regards,<br>
            The Yudezign Team</p>
          </div>
          <div class="footer">
            <p>This quote is valid until ${this.formatDate(quote.valid_until)}</p>
            <p>© ${new Date().getFullYear()} Yudezign Cabinet Solutions. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Dear ${customerName},

Thank you for your interest in our cabinet solutions. We've prepared a detailed quote for your project.

Quote Summary:
- Quote ID: ${quote.quote_id || 'Draft'}
- Total Items: ${quote.line_items.length}
- Valid Until: ${this.formatDate(quote.valid_until)}
- Total: ${this.formatCurrency(quote.total_amount)}

Your quote includes:
${quote.line_items.map(item => 
  `- ${item.quantity}x ${item.product_variant.sku} - ${this.formatCurrency(item.line_total)}`
).join('\n')}

${customMessage ? `\n${customMessage}\n` : ''}

If you have any questions about this quote, please don't hesitate to contact us.

Best regards,
The Yudezign Team

This quote is valid until ${this.formatDate(quote.valid_until)}
© ${new Date().getFullYear()} Yudezign Cabinet Solutions. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Generate quote updated email content
   */
  private generateQuoteUpdatedContent(
    quote: QuoteCalculation, 
    customerName: string, 
    customMessage?: string
  ): { subject: string; html: string; text: string } {
    const subject = `Updated Cabinet Quote - ${quote.quote_id || 'Draft'}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .quote-summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
          .total { font-size: 24px; font-weight: bold; color: #059669; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Quote Has Been Updated</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName},</p>
            
            <p>We've updated your cabinet quote based on your recent requests. Please review the changes below.</p>
            
            ${customMessage ? `<p><em>${customMessage}</em></p>` : ''}
            
            <div class="quote-summary">
              <h3>Updated Quote Summary</h3>
              <p><strong>Quote ID:</strong> ${quote.quote_id || 'Draft'}</p>
              <p><strong>Updated:</strong> ${this.formatDate(quote.created_at)}</p>
              <p><strong>Valid Until:</strong> ${this.formatDate(quote.valid_until)}</p>
              <p class="total">New Total: ${this.formatCurrency(quote.total_amount)}</p>
            </div>
            
            <p>If you have any questions about these changes, please contact us immediately.</p>
            
            <p>Best regards,<br>
            The Yudezign Team</p>
          </div>
          <div class="footer">
            <p>This updated quote is valid until ${this.formatDate(quote.valid_until)}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Dear ${customerName},

We've updated your cabinet quote based on your recent requests.

Updated Quote Summary:
- Quote ID: ${quote.quote_id || 'Draft'}
- Updated: ${this.formatDate(quote.created_at)}
- Valid Until: ${this.formatDate(quote.valid_until)}
- New Total: ${this.formatCurrency(quote.total_amount)}

${customMessage ? `\n${customMessage}\n` : ''}

If you have any questions about these changes, please contact us immediately.

Best regards,
The Yudezign Team
    `;

    return { subject, html, text };
  }

  /**
   * Generate other email content types
   */
  private generateQuoteApprovedContent(quote: QuoteCalculation, customerName: string, customMessage?: string) {
    return {
      subject: `Quote Approved - Thank You! ${quote.quote_id}`,
      html: `<p>Dear ${customerName},</p><p>Thank you for approving your quote. We'll begin processing your order shortly.</p>${customMessage ? `<p>${customMessage}</p>` : ''}`,
      text: `Dear ${customerName},\n\nThank you for approving your quote. We'll begin processing your order shortly.\n\n${customMessage || ''}`
    };
  }

  private generateQuoteRejectedContent(quote: QuoteCalculation, customerName: string, customMessage?: string) {
    return {
      subject: `Quote Status Update - ${quote.quote_id}`,
      html: `<p>Dear ${customerName},</p><p>We understand this quote didn't meet your needs. We'd love to work with you on an alternative solution.</p>${customMessage ? `<p>${customMessage}</p>` : ''}`,
      text: `Dear ${customerName},\n\nWe understand this quote didn't meet your needs. We'd love to work with you on an alternative solution.\n\n${customMessage || ''}`
    };
  }

  private generateQuoteExpiredContent(quote: QuoteCalculation, customerName: string, customMessage?: string) {
    return {
      subject: `Quote Expired - Let's Create a New One! ${quote.quote_id}`,
      html: `<p>Dear ${customerName},</p><p>Your quote has expired, but we'd be happy to create a new one with current pricing.</p>${customMessage ? `<p>${customMessage}</p>` : ''}`,
      text: `Dear ${customerName},\n\nYour quote has expired, but we'd be happy to create a new one with current pricing.\n\n${customMessage || ''}`
    };
  }

  private generateFollowUpContent(quote: QuoteCalculation, customerName: string, customMessage?: string) {
    return {
      subject: `Following Up on Your Cabinet Quote - ${quote.quote_id}`,
      html: `<p>Dear ${customerName},</p><p>We wanted to follow up on your recent quote. Do you have any questions we can answer?</p>${customMessage ? `<p>${customMessage}</p>` : ''}`,
      text: `Dear ${customerName},\n\nWe wanted to follow up on your recent quote. Do you have any questions we can answer?\n\n${customMessage || ''}`
    };
  }

  private generateReminderContent(quote: QuoteCalculation, customerName: string, customMessage?: string) {
    return {
      subject: `Reminder: Your Quote Expires Soon - ${quote.quote_id}`,
      html: `<p>Dear ${customerName},</p><p>This is a friendly reminder that your quote expires on ${this.formatDate(quote.valid_until)}.</p>${customMessage ? `<p>${customMessage}</p>` : ''}`,
      text: `Dear ${customerName},\n\nThis is a friendly reminder that your quote expires on ${this.formatDate(quote.valid_until)}.\n\n${customMessage || ''}`
    };
  }

  /**
   * Prepare mail options
   */
  private async prepareMailOptions(
    request: EmailRequest,
    content: { subject: string; html: string; text: string }
  ): Promise<nodemailer.SendMailOptions> {
    const recipient = request.recipient_email || request.quote_calculation.customer.email;
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${this.emailConfig.from_name}" <${this.emailConfig.from_address}>`,
      to: recipient,
      subject: content.subject,
      text: content.text,
      html: content.html,
      cc: request.cc_emails,
      headers: {
        'X-Quote-ID': request.quote_calculation.quote_id || 'draft',
        'X-Customer-ID': request.quote_calculation.customer.id,
        'X-Email-Type': request.email_type
      }
    };

    // Add PDF attachment if provided
    if (request.pdf_attachment) {
      mailOptions.attachments = [{
        filename: `quote-${request.quote_calculation.quote_id || 'draft'}.pdf`,
        path: request.pdf_attachment.file_path,
        contentType: 'application/pdf'
      }];
    }

    return mailOptions;
  }

  /**
   * Send scheduled email
   */
  public async sendScheduledEmail(request: EmailRequest): Promise<EmailResult> {
    if (!request.scheduled_send) {
      return this.sendEmail(request);
    }

    const delay = new Date(request.scheduled_send).getTime() - Date.now();
    
    if (delay <= 0) {
      return this.sendEmail(request);
    }

    // Schedule email (in production, you'd use a proper job queue)
    setTimeout(async () => {
      try {
        await this.sendEmail(request);
      } catch (error) {
        this.logger.error('Scheduled email failed', { request, error });
      }
    }, delay);

    return {
      email_id: this.generateEmailId(),
      sent_at: new Date(),
      recipient: request.recipient_email || request.quote_calculation.customer.email,
      status: EmailStatus.PENDING
    };
  }

  /**
   * Send bulk emails
   */
  public async sendBulkEmails(requests: EmailRequest[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.sendEmail(request);
        results.push(result);
        
        // Add delay between emails to avoid rate limiting
        await this.delay(100);
        
      } catch (error) {
        this.logger.error('Bulk email failed', { request, error });
        results.push({
          email_id: this.generateEmailId(),
          sent_at: new Date(),
          recipient: request.recipient_email || request.quote_calculation.customer.email,
          status: EmailStatus.FAILED,
          error_message: error.message
        });
      }
    }

    return results;
  }

  /**
   * Test email connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed', { error });
      return false;
    }
  }

  /**
   * Helper methods
   */
  private generateEmailId(): string {
    return `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get email statistics
   */
  public getEmailStats(): any {
    return {
      service: 'Email Service',
      transporter: {
        host: this.emailConfig.smtp_host,
        port: this.emailConfig.smtp_port,
        secure: this.emailConfig.smtp_secure
      },
      pool_info: this.transporter.isIdle() ? 'idle' : 'busy'
    };
  }
}