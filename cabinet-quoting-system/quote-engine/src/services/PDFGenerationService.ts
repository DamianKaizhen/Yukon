import jsPDF from 'jspdf';
import fs from 'fs';
import path from 'path';
import {
  PDFGenerationRequest,
  PDFGenerationResult,
  PDFTemplateType,
  QuoteCalculation,
  CustomBranding,
  PDFGenerationError,
  ValidationError
} from '@/types';
import { config } from '@/config';
import { Logger } from '@/utils/Logger';

export class PDFGenerationService {
  private logger: Logger;
  private pdfConfig: any;
  private readonly defaultBranding = {
    company_name: 'Yudezign Cabinet Solutions',
    primary_color: '#2563eb', // Blue
    accent_color: '#7c3aed',  // Purple
    font_family: 'helvetica'
  };

  constructor() {
    this.logger = Logger.getInstance();
    this.pdfConfig = config.getPDFConfig();
    this.ensureDirectories();
  }

  /**
   * Generate PDF for quote
   */
  public async generateQuotePDF(request: PDFGenerationRequest): Promise<PDFGenerationResult> {
    try {
      this.logger.info('Starting PDF generation', {
        templateType: request.template_type,
        quoteId: request.quote_calculation.quote_id,
        customerId: request.quote_calculation.customer.id
      });

      // Validate request
      this.validateRequest(request);

      // Generate unique PDF ID
      const pdfId = this.generatePDFId();

      // Create PDF document
      const pdf = this.createPDFDocument(request);

      // Generate content based on template type
      await this.generateContent(pdf, request);

      // Save PDF to file
      const filePath = await this.savePDF(pdf, pdfId);

      // Get file stats
      const stats = fs.statSync(filePath);

      // Create result
      const result: PDFGenerationResult = {
        pdf_id: pdfId,
        file_path: filePath,
        file_size: stats.size,
        generated_at: new Date(),
        expires_at: new Date(Date.now() + this.pdfConfig.retention_days * 24 * 60 * 60 * 1000),
        download_url: this.generateDownloadUrl(pdfId),
        pages: pdf.getNumberOfPages()
      };

      this.logger.info('PDF generation completed successfully', {
        pdfId,
        fileSize: stats.size,
        pages: result.pages
      });

      return result;

    } catch (error) {
      this.logger.error('PDF generation failed', { request, error });
      throw error;
    }
  }

  /**
   * Validate PDF generation request
   */
  private validateRequest(request: PDFGenerationRequest): void {
    if (!request.quote_calculation) {
      throw new ValidationError('Quote calculation is required');
    }

    if (!request.template_type) {
      throw new ValidationError('Template type is required');
    }

    if (!request.quote_calculation.customer) {
      throw new ValidationError('Customer information is required');
    }

    if (!request.quote_calculation.line_items || request.quote_calculation.line_items.length === 0) {
      throw new ValidationError('Quote must have at least one line item');
    }
  }

  /**
   * Create PDF document with basic setup
   */
  private createPDFDocument(request: PDFGenerationRequest): jsPDF {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      floatPrecision: 2
    });

    // Set document properties
    const quote = request.quote_calculation;
    const branding = { ...this.defaultBranding, ...request.custom_branding };

    pdf.setProperties({
      title: `Quote - ${quote.quote_id || 'Draft'}`,
      subject: `Cabinet Quote for ${quote.customer.first_name} ${quote.customer.last_name}`,
      author: branding.company_name,
      creator: 'Yudezign Quote Engine',
      keywords: 'cabinet, quote, estimate, furniture'
    });

    return pdf;
  }

  /**
   * Generate PDF content based on template type
   */
  private async generateContent(pdf: jsPDF, request: PDFGenerationRequest): Promise<void> {
    const quote = request.quote_calculation;
    const branding = { ...this.defaultBranding, ...request.custom_branding };

    // Add header
    this.addHeader(pdf, branding, request.watermark);

    // Add quote information
    this.addQuoteInfo(pdf, quote);

    // Add customer information
    this.addCustomerInfo(pdf, quote.customer);

    // Add line items based on template type
    switch (request.template_type) {
      case PDFTemplateType.STANDARD:
        this.addStandardLineItems(pdf, quote);
        break;
      case PDFTemplateType.DETAILED:
        this.addDetailedLineItems(pdf, quote);
        break;
      case PDFTemplateType.SUMMARY:
        this.addSummaryLineItems(pdf, quote);
        break;
      case PDFTemplateType.CONTRACTOR:
        this.addContractorLineItems(pdf, quote);
        break;
      default:
        this.addStandardLineItems(pdf, quote);
    }

    // Add totals
    this.addTotals(pdf, quote);

    // Add terms and conditions if requested
    if (request.include_terms) {
      this.addTermsAndConditions(pdf);
    }

    // Add installation guide if requested
    if (request.include_installation_guide) {
      this.addInstallationGuide(pdf);
    }

    // Add footer
    this.addFooter(pdf, branding);
  }

  /**
   * Add header with company branding
   */
  private addHeader(pdf: jsPDF, branding: CustomBranding, watermark?: string): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Company logo (if available)
    try {
      if (fs.existsSync(this.pdfConfig.company_logo_path)) {
        // In a real implementation, you'd convert the image to base64 and add it
        // pdf.addImage(logoBase64, 'PNG', 10, 10, 40, 20);
      }
    } catch (error) {
      this.logger.warn('Could not load company logo', { error });
    }

    // Company name
    pdf.setFontSize(24);
    pdf.setTextColor(branding.primary_color || '#2563eb');
    pdf.setFont('helvetica', 'bold');
    pdf.text(branding.company_name || this.defaultBranding.company_name, 10, 25);

    // Quote title
    pdf.setFontSize(20);
    pdf.setTextColor('#000000');
    pdf.text('CABINET QUOTE', pageWidth - 60, 25);

    // Watermark
    if (watermark) {
      pdf.setFontSize(60);
      pdf.setTextColor(200, 200, 200);
      pdf.text(watermark, pageWidth / 2, 150, { 
        angle: 45, 
        align: 'center' 
      });
    }

    // Reset colors and fonts
    pdf.setTextColor('#000000');
    pdf.setFont('helvetica', 'normal');
  }

  /**
   * Add quote information section
   */
  private addQuoteInfo(pdf: jsPDF, quote: QuoteCalculation): void {
    const startY = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Quote details box
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.rect(10, startY, pageWidth - 20, 25, 'F');

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');

    // Left column
    pdf.text('Quote ID:', 15, startY + 8);
    pdf.text('Date Created:', 15, startY + 16);

    // Right column
    pdf.text('Valid Until:', pageWidth - 80, startY + 8);
    pdf.text('Status:', pageWidth - 80, startY + 16);

    // Values
    pdf.setFont('helvetica', 'normal');
    pdf.text(quote.quote_id || 'DRAFT', 35, startY + 8);
    pdf.text(this.formatDate(quote.created_at), 45, startY + 16);
    pdf.text(this.formatDate(quote.valid_until), pageWidth - 45, startY + 8);
    pdf.text('DRAFT', pageWidth - 35, startY + 16);
  }

  /**
   * Add customer information section
   */
  private addCustomerInfo(pdf: jsPDF, customer: any): void {
    const startY = 75;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer Information', 10, startY);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    let currentY = startY + 10;

    // Customer name
    const customerName = customer.company_name || 
      `${customer.first_name} ${customer.last_name}`;
    pdf.text(customerName, 10, currentY);
    currentY += 6;

    // Email
    if (customer.email) {
      pdf.text(`Email: ${customer.email}`, 10, currentY);
      currentY += 6;
    }

    // Phone
    if (customer.phone) {
      pdf.text(`Phone: ${customer.phone}`, 10, currentY);
      currentY += 6;
    }

    // Address
    if (customer.address_line1) {
      pdf.text(customer.address_line1, 10, currentY);
      currentY += 6;
      
      if (customer.address_line2) {
        pdf.text(customer.address_line2, 10, currentY);
        currentY += 6;
      }
      
      const cityStateZip = [
        customer.city,
        customer.state_province,
        customer.postal_code
      ].filter(Boolean).join(', ');
      
      if (cityStateZip) {
        pdf.text(cityStateZip, 10, currentY);
        currentY += 6;
      }
    }
  }

  /**
   * Add standard line items
   */
  private addStandardLineItems(pdf: jsPDF, quote: QuoteCalculation): void {
    const startY = 130;
    let currentY = startY;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Quote Items', 10, currentY);
    currentY += 10;

    // Table headers
    const headers = ['#', 'Item', 'Qty', 'Unit Price', 'Total'];
    const columnWidths = [15, 90, 20, 30, 30];
    const startX = 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');

    // Header background
    pdf.setFillColor(59, 130, 246); // Blue background
    pdf.setTextColor(255, 255, 255); // White text
    pdf.rect(startX, currentY, 185, 8, 'F');

    let x = startX + 2;
    headers.forEach((header, index) => {
      pdf.text(header, x, currentY + 6);
      x += columnWidths[index];
    });

    currentY += 10;
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.setFont('helvetica', 'normal');

    // Line items
    quote.line_items.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 1) {
        pdf.setFillColor(248, 250, 252); // Light gray
        pdf.rect(startX, currentY - 2, 185, 8, 'F');
      }

      x = startX + 2;
      
      // Line number
      pdf.text(item.line_number.toString(), x, currentY + 4);
      x += columnWidths[0];

      // Item description
      const itemDesc = `${item.product_variant.sku} - ${item.box_material.name}`;
      pdf.text(this.truncateText(itemDesc, 35), x, currentY + 4);
      x += columnWidths[1];

      // Quantity
      pdf.text(item.quantity.toString(), x, currentY + 4);
      x += columnWidths[2];

      // Unit price
      pdf.text(this.formatCurrency(item.unit_price), x, currentY + 4);
      x += columnWidths[3];

      // Line total
      pdf.text(this.formatCurrency(item.line_total), x, currentY + 4);

      currentY += 8;

      // Check if we need a new page
      if (currentY > 250) {
        pdf.addPage();
        currentY = 20;
      }
    });
  }

  /**
   * Add detailed line items with discounts and specifications
   */
  private addDetailedLineItems(pdf: jsPDF, quote: QuoteCalculation): void {
    const startY = 130;
    let currentY = startY;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detailed Quote Items', 10, currentY);
    currentY += 15;

    quote.line_items.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > 240) {
        pdf.addPage();
        currentY = 20;
      }

      // Item header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${item.line_number}. ${item.product_variant.sku}`, 10, currentY);
      currentY += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      // Item details
      const product = item.product_variant.product;
      if (product) {
        pdf.text(`Product: ${product.name}`, 15, currentY);
        currentY += 6;
        
        if (product.description) {
          pdf.text(`Description: ${product.description}`, 15, currentY);
          currentY += 6;
        }

        // Dimensions
        if (product.width || product.height || product.depth) {
          const dimensions = [
            product.width ? `W: ${product.width}"` : '',
            product.height ? `H: ${product.height}"` : '',
            product.depth ? `D: ${product.depth}"` : ''
          ].filter(Boolean).join(' x ');
          
          if (dimensions) {
            pdf.text(`Dimensions: ${dimensions}`, 15, currentY);
            currentY += 6;
          }
        }
      }

      // Material and finish
      pdf.text(`Material: ${item.box_material.name}`, 15, currentY);
      pdf.text(`Color: ${item.product_variant.color_option?.display_name || 'Standard'}`, 100, currentY);
      currentY += 8;

      // Pricing breakdown
      pdf.text(`Quantity: ${item.quantity}`, 15, currentY);
      pdf.text(`List Price: ${this.formatCurrency(item.list_price)}`, 60, currentY);
      pdf.text(`Unit Price: ${this.formatCurrency(item.unit_price)}`, 105, currentY);
      pdf.text(`Line Total: ${this.formatCurrency(item.line_total)}`, 150, currentY);
      currentY += 6;

      // Discounts
      if (item.discount_details && item.discount_details.length > 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        item.discount_details.forEach(discount => {
          pdf.text(`  ${discount.description}: -${this.formatCurrency(discount.amount)}`, 15, currentY);
          currentY += 5;
        });
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
      }

      // Notes
      if (item.notes) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Notes: ${item.notes}`, 15, currentY);
        currentY += 6;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
      }

      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(10, currentY, 200, currentY);
      currentY += 10;
    });
  }

  /**
   * Add summary line items (condensed view)
   */
  private addSummaryLineItems(pdf: jsPDF, quote: QuoteCalculation): void {
    const startY = 130;
    let currentY = startY;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Quote Summary', 10, currentY);
    currentY += 15;

    // Group items by product type or category
    const groupedItems = this.groupItemsByCategory(quote.line_items);

    Object.entries(groupedItems).forEach(([category, items]) => {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category, 10, currentY);
      currentY += 8;

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${totalQuantity} units`, 15, currentY);
      pdf.text(this.formatCurrency(totalAmount), 150, currentY);
      currentY += 10;
    });
  }

  /**
   * Add contractor-specific line items
   */
  private addContractorLineItems(pdf: jsPDF, quote: QuoteCalculation): void {
    this.addDetailedLineItems(pdf, quote);
    // Add additional contractor-specific information
    // This could include installation requirements, delivery schedules, etc.
  }

  /**
   * Add totals section
   */
  private addTotals(pdf: jsPDF, quote: QuoteCalculation): void {
    const startY = pdf.internal.pageSize.getHeight() - 80;
    const rightAlign = 150;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    let currentY = startY;

    // Subtotal
    pdf.text('Subtotal:', rightAlign, currentY);
    pdf.text(this.formatCurrency(quote.subtotal), rightAlign + 30, currentY);
    currentY += 8;

    // Discounts
    if (quote.discount_summary.total_discount_amount > 0) {
      pdf.setTextColor(220, 38, 38); // Red for discounts
      pdf.text('Total Discounts:', rightAlign, currentY);
      pdf.text(`-${this.formatCurrency(quote.discount_summary.total_discount_amount)}`, rightAlign + 30, currentY);
      currentY += 8;
      pdf.setTextColor(0, 0, 0);
    }

    // Tax
    if (quote.tax_summary.tax_amount > 0) {
      pdf.text(`Tax (${(quote.tax_summary.tax_rate * 100).toFixed(2)}%):`, rightAlign, currentY);
      pdf.text(this.formatCurrency(quote.tax_summary.tax_amount), rightAlign + 30, currentY);
      currentY += 8;
    }

    // Shipping
    if (quote.shipping_summary.total_shipping_cost > 0) {
      pdf.text('Shipping & Delivery:', rightAlign, currentY);
      pdf.text(this.formatCurrency(quote.shipping_summary.total_shipping_cost), rightAlign + 30, currentY);
      currentY += 8;
    }

    // Total line
    pdf.setDrawColor(0, 0, 0);
    pdf.line(rightAlign, currentY, rightAlign + 50, currentY);
    currentY += 8;

    // Total amount
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL:', rightAlign, currentY);
    pdf.text(this.formatCurrency(quote.total_amount), rightAlign + 30, currentY);
  }

  /**
   * Add terms and conditions
   */
  private addTermsAndConditions(pdf: jsPDF): void {
    pdf.addPage();
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms and Conditions', 10, 20);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const terms = [
      '1. ACCEPTANCE: This quote is valid for 30 days from the date issued.',
      '2. PAYMENT: 50% deposit required upon order confirmation, balance due upon completion.',
      '3. DELIVERY: Delivery times are estimated and may vary based on production schedule.',
      '4. INSTALLATION: Installation services are available for an additional fee.',
      '5. WARRANTY: All cabinets come with a 1-year limited warranty on materials and workmanship.',
      '6. CHANGES: Any changes to the order may affect pricing and delivery schedule.',
      '7. FORCE MAJEURE: We are not liable for delays due to circumstances beyond our control.',
      '8. GOVERNING LAW: This agreement is governed by the laws of California.'
    ];

    let currentY = 35;
    terms.forEach(term => {
      const lines = pdf.splitTextToSize(term, 180);
      pdf.text(lines, 10, currentY);
      currentY += lines.length * 6 + 4;
    });
  }

  /**
   * Add installation guide
   */
  private addInstallationGuide(pdf: jsPDF): void {
    pdf.addPage();
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Installation Guide', 10, 20);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const guide = [
      'PREPARATION:',
      '• Ensure all utilities are disconnected before installation',
      '• Clear the installation area of all obstacles',
      '• Verify measurements match the cabinet specifications',
      '',
      'INSTALLATION PROCESS:',
      '• Install cabinets level and plumb',
      '• Secure to wall studs using appropriate fasteners',
      '• Install hardware and adjust doors and drawers',
      '• Connect plumbing and electrical as needed',
      '',
      'FINAL INSPECTION:',
      '• Check all doors and drawers for proper operation',
      '• Verify all hardware is tight and properly aligned',
      '• Clean installation area and remove debris'
    ];

    let currentY = 35;
    guide.forEach(line => {
      pdf.text(line, 10, currentY);
      currentY += 6;
    });
  }

  /**
   * Add footer
   */
  private addFooter(pdf: jsPDF, branding: CustomBranding): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      
      // Company info
      pdf.text(branding.company_name || this.defaultBranding.company_name, 10, pageHeight - 10);
      
      // Page number
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
      
      // Generation date
      pdf.text(`Generated on ${this.formatDate(new Date())}`, pageWidth / 2 - 20, pageHeight - 10);
    }
  }

  /**
   * Save PDF to file system
   */
  private async savePDF(pdf: jsPDF, pdfId: string): Promise<string> {
    try {
      const fileName = `quote-${pdfId}.pdf`;
      const filePath = path.join(this.pdfConfig.storage_path, fileName);
      
      // Generate PDF buffer
      const pdfBuffer = pdf.output('arraybuffer');
      
      // Write to file
      fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
      
      this.logger.info('PDF saved to file system', { pdfId, filePath });
      
      return filePath;
      
    } catch (error) {
      this.logger.error('Failed to save PDF', { pdfId, error });
      throw new PDFGenerationError('Failed to save PDF to file system', { pdfId, error });
    }
  }

  /**
   * Helper methods
   */
  private generatePDFId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  private generateDownloadUrl(pdfId: string): string {
    const baseUrl = config.getServerConfig().host;
    const port = config.getServerConfig().port;
    return `http://${baseUrl}:${port}/api/v1/pdfs/${pdfId}/download`;
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
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  private groupItemsByCategory(items: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    items.forEach(item => {
      const category = item.product_variant.product?.category?.name || 'Cabinets';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.pdfConfig.storage_path)) {
        fs.mkdirSync(this.pdfConfig.storage_path, { recursive: true });
      }
      if (!fs.existsSync(this.pdfConfig.temp_path)) {
        fs.mkdirSync(this.pdfConfig.temp_path, { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to ensure PDF directories', { error });
      throw new PDFGenerationError('Failed to create PDF directories');
    }
  }

  /**
   * Clean up old PDF files
   */
  public async cleanupOldPDFs(): Promise<void> {
    try {
      const files = fs.readdirSync(this.pdfConfig.storage_path);
      const now = Date.now();
      const retentionMs = this.pdfConfig.retention_days * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.pdfConfig.storage_path, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > retentionMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      this.logger.info('PDF cleanup completed', { deletedCount });
      
    } catch (error) {
      this.logger.error('PDF cleanup failed', { error });
    }
  }

  /**
   * Get PDF file
   */
  public async getPDFFile(pdfId: string): Promise<Buffer | null> {
    try {
      const fileName = `quote-${pdfId}.pdf`;
      const filePath = path.join(this.pdfConfig.storage_path, fileName);
      
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
      
      return null;
      
    } catch (error) {
      this.logger.error('Failed to get PDF file', { pdfId, error });
      throw error;
    }
  }
}