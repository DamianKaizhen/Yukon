import {
  QuoteCalculationRequest,
  QuoteCalculation,
  CalculatedLineItem,
  LineItemDiscount,
  DiscountType,
  DiscountSummary,
  TaxSummary,
  TaxDetail,
  ShippingSummary,
  ShippingMethod,
  CustomerDiscountTier,
  BusinessRules,
  Customer,
  ProductVariant,
  BoxMaterial,
  CalculationError,
  ValidationError
} from '@/types';
import { BusinessRulesService } from './BusinessRulesService';
import { BackendApiService } from './BackendApiService';
import { TaxCalculationService } from './TaxCalculationService';
import { ShippingCalculationService } from './ShippingCalculationService';
import { Logger } from '@/utils/Logger';

export class CalculationEngine {
  private businessRulesService: BusinessRulesService;
  private backendApiService: BackendApiService;
  private taxService: TaxCalculationService;
  private shippingService: ShippingCalculationService;
  private logger: Logger;

  constructor() {
    this.businessRulesService = new BusinessRulesService();
    this.backendApiService = new BackendApiService();
    this.taxService = new TaxCalculationService();
    this.shippingService = new ShippingCalculationService();
    this.logger = Logger.getInstance();
  }

  /**
   * Main quote calculation method
   * Processes a quote request and returns comprehensive calculations
   */
  public async calculateQuote(request: QuoteCalculationRequest): Promise<QuoteCalculation> {
    try {
      this.logger.info('Starting quote calculation', { 
        customerId: request.customer_id, 
        itemCount: request.items.length 
      });

      // Validate request
      await this.validateRequest(request);

      // Get customer data
      const customer = await this.backendApiService.getCustomer(request.customer_id);
      if (!customer) {
        throw new ValidationError('Customer not found');
      }

      // Get business rules
      const businessRules = await this.businessRulesService.getBusinessRules();

      // Calculate line items
      const lineItems = await this.calculateLineItems(request, customer, businessRules);

      // Calculate subtotal
      const subtotal = this.calculateSubtotal(lineItems);

      // Apply discounts
      const discountSummary = await this.calculateDiscounts(lineItems, customer, businessRules, subtotal);

      // Calculate final subtotal after discounts
      const finalSubtotal = subtotal - discountSummary.total_discount_amount;

      // Calculate tax
      const taxSummary = await this.calculateTax(
        finalSubtotal, 
        customer, 
        request.shipping_address,
        businessRules,
        request.apply_tax !== false
      );

      // Calculate shipping
      const shippingSummary = await this.calculateShipping(
        lineItems,
        customer,
        request.shipping_address,
        businessRules
      );

      // Calculate total
      const totalAmount = this.roundToDecimalPlaces(
        finalSubtotal + taxSummary.tax_amount + shippingSummary.total_shipping_cost,
        businessRules.pricing_rules.price_precision
      );

      // Set valid until date
      const validUntil = request.valid_until || new Date(
        Date.now() + businessRules.validation_rules.max_quote_validity_days * 24 * 60 * 60 * 1000
      );

      const calculation: QuoteCalculation = {
        customer,
        line_items: lineItems,
        subtotal: this.roundToDecimalPlaces(subtotal, businessRules.pricing_rules.price_precision),
        discount_summary: discountSummary,
        tax_summary: taxSummary,
        shipping_summary: shippingSummary,
        total_amount: totalAmount,
        valid_until: validUntil,
        created_at: new Date(),
        notes: request.notes
      };

      // Validate final calculation
      this.validateCalculation(calculation, businessRules);

      this.logger.info('Quote calculation completed successfully', {
        customerId: request.customer_id,
        subtotal: calculation.subtotal,
        totalAmount: calculation.total_amount,
        itemCount: calculation.line_items.length
      });

      return calculation;

    } catch (error) {
      this.logger.error('Quote calculation failed', { request, error });
      throw error;
    }
  }

  /**
   * Calculate line items with pricing and discounts
   */
  private async calculateLineItems(
    request: QuoteCalculationRequest,
    customer: Customer,
    businessRules: BusinessRules
  ): Promise<CalculatedLineItem[]> {
    const lineItems: CalculatedLineItem[] = [];

    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      
      // Get product variant and box material data
      const [productVariant, boxMaterial] = await Promise.all([
        this.backendApiService.getProductVariant(item.product_variant_id),
        this.backendApiService.getBoxMaterial(item.box_material_id)
      ]);

      if (!productVariant) {
        throw new ValidationError(`Product variant not found: ${item.product_variant_id}`);
      }

      if (!boxMaterial) {
        throw new ValidationError(`Box material not found: ${item.box_material_id}`);
      }

      // Get pricing
      let unitPrice: number;
      let listPrice: number;

      if (item.custom_price !== undefined) {
        // Use custom price if provided
        unitPrice = item.custom_price;
        listPrice = item.custom_price;
      } else {
        // Get standard pricing
        const pricing = await this.backendApiService.getProductPricing(
          item.product_variant_id,
          item.box_material_id
        );

        if (!pricing) {
          throw new ValidationError(`Pricing not found for product ${item.product_variant_id} with material ${item.box_material_id}`);
        }

        listPrice = pricing.price;
        unitPrice = await this.applyCustomerTierPricing(pricing.price, customer, businessRules);
      }

      // Calculate line subtotal
      const lineSubtotal = this.roundToDecimalPlaces(
        unitPrice * item.quantity,
        businessRules.pricing_rules.price_precision
      );

      // Apply line-level discounts
      const discountDetails = await this.calculateLineItemDiscounts(
        item,
        customer,
        businessRules,
        unitPrice,
        lineSubtotal
      );

      const totalDiscountAmount = discountDetails.reduce((sum, discount) => sum + discount.amount, 0);
      const lineTotal = this.roundToDecimalPlaces(
        lineSubtotal - totalDiscountAmount,
        businessRules.pricing_rules.price_precision
      );

      const calculatedLineItem: CalculatedLineItem = {
        line_number: i + 1,
        product_variant: productVariant,
        box_material: boxMaterial,
        quantity: item.quantity,
        unit_price: this.roundToDecimalPlaces(unitPrice, businessRules.pricing_rules.price_precision),
        list_price: this.roundToDecimalPlaces(listPrice, businessRules.pricing_rules.price_precision),
        line_subtotal: lineSubtotal,
        discount_details: discountDetails,
        line_total: lineTotal,
        notes: item.notes
      };

      lineItems.push(calculatedLineItem);
    }

    return lineItems;
  }

  /**
   * Apply customer tier pricing
   */
  private async applyCustomerTierPricing(
    basePrice: number,
    customer: Customer,
    businessRules: BusinessRules
  ): Promise<number> {
    // Default to retail if no tier specified
    const customerTier = CustomerDiscountTier.RETAIL; // Would be determined from customer data

    const tierMarkup = businessRules.pricing_rules.markup_rules.find(
      rule => rule.customer_tier === customerTier &&
              new Date() >= rule.effective_date &&
              (!rule.expiration_date || new Date() <= rule.expiration_date)
    );

    if (tierMarkup) {
      return basePrice * (1 + tierMarkup.markup_percentage / 100);
    }

    return basePrice;
  }

  /**
   * Calculate line-level discounts
   */
  private async calculateLineItemDiscounts(
    item: any,
    customer: Customer,
    businessRules: BusinessRules,
    unitPrice: number,
    lineSubtotal: number
  ): Promise<LineItemDiscount[]> {
    const discounts: LineItemDiscount[] = [];

    // Manual discount from request
    if (item.discount_percent && item.discount_percent > 0) {
      const discountAmount = this.roundToDecimalPlaces(
        lineSubtotal * (item.discount_percent / 100),
        businessRules.pricing_rules.price_precision
      );

      discounts.push({
        type: DiscountType.MANUAL,
        description: `Manual discount ${item.discount_percent}%`,
        amount: discountAmount,
        percentage: item.discount_percent,
        applied_to: 'line_total'
      });
    }

    // Bulk quantity discount
    const bulkDiscount = businessRules.discount_rules.bulk_discount_thresholds.find(
      threshold => threshold.applies_to === 'line_item' && item.quantity >= threshold.min_quantity
    );

    if (bulkDiscount) {
      const discountAmount = this.roundToDecimalPlaces(
        lineSubtotal * (bulkDiscount.discount_percentage / 100),
        businessRules.pricing_rules.price_precision
      );

      discounts.push({
        type: DiscountType.BULK_QUANTITY,
        description: `Bulk discount for ${item.quantity} units (${bulkDiscount.discount_percentage}%)`,
        amount: discountAmount,
        percentage: bulkDiscount.discount_percentage,
        applied_to: 'line_total'
      });
    }

    return discounts;
  }

  /**
   * Calculate subtotal from line items
   */
  private calculateSubtotal(lineItems: CalculatedLineItem[]): number {
    return lineItems.reduce((sum, item) => sum + item.line_subtotal, 0);
  }

  /**
   * Calculate overall discounts
   */
  private async calculateDiscounts(
    lineItems: CalculatedLineItem[],
    customer: Customer,
    businessRules: BusinessRules,
    subtotal: number
  ): Promise<DiscountSummary> {
    const discounts: Array<{
      type: DiscountType;
      description: string;
      amount: number;
      percentage?: number;
    }> = [];

    // Collect all line-level discounts
    let totalLineDiscounts = 0;
    lineItems.forEach(item => {
      item.discount_details.forEach(discount => {
        totalLineDiscounts += discount.amount;
      });
    });

    // Calculate order-level bulk discount
    const orderBulkDiscount = businessRules.discount_rules.bulk_discount_thresholds.find(
      threshold => threshold.applies_to === 'total_order' && subtotal >= threshold.min_quantity
    );

    let orderLevelDiscountAmount = 0;
    if (orderBulkDiscount) {
      orderLevelDiscountAmount = this.roundToDecimalPlaces(
        subtotal * (orderBulkDiscount.discount_percentage / 100),
        businessRules.pricing_rules.price_precision
      );

      discounts.push({
        type: DiscountType.BULK_QUANTITY,
        description: `Order total discount (${orderBulkDiscount.discount_percentage}%)`,
        amount: orderLevelDiscountAmount,
        percentage: orderBulkDiscount.discount_percentage
      });
    }

    // Customer tier discount
    const customerTier = CustomerDiscountTier.RETAIL; // Would be determined from customer data
    const tierDiscount = businessRules.discount_rules.customer_tier_discounts.find(
      discount => discount.tier === customerTier &&
                 (!discount.min_order_amount || subtotal >= discount.min_order_amount)
    );

    let tierDiscountAmount = 0;
    if (tierDiscount) {
      tierDiscountAmount = this.roundToDecimalPlaces(
        subtotal * (tierDiscount.discount_percentage / 100),
        businessRules.pricing_rules.price_precision
      );

      discounts.push({
        type: DiscountType.CUSTOMER_TIER,
        description: `${customerTier} tier discount (${tierDiscount.discount_percentage}%)`,
        amount: tierDiscountAmount,
        percentage: tierDiscount.discount_percentage
      });
    }

    const totalDiscountAmount = totalLineDiscounts + orderLevelDiscountAmount + tierDiscountAmount;

    return {
      total_discount_amount: this.roundToDecimalPlaces(
        totalDiscountAmount,
        businessRules.pricing_rules.price_precision
      ),
      discounts_applied: discounts
    };
  }

  /**
   * Calculate tax
   */
  private async calculateTax(
    subtotal: number,
    customer: Customer,
    shippingAddress: any,
    businessRules: BusinessRules,
    applyTax: boolean
  ): Promise<TaxSummary> {
    return this.taxService.calculateTax(subtotal, customer, shippingAddress, businessRules, applyTax);
  }

  /**
   * Calculate shipping
   */
  private async calculateShipping(
    lineItems: CalculatedLineItem[],
    customer: Customer,
    shippingAddress: any,
    businessRules: BusinessRules
  ): Promise<ShippingSummary> {
    return this.shippingService.calculateShipping(lineItems, customer, shippingAddress, businessRules);
  }

  /**
   * Validate quote calculation request
   */
  private async validateRequest(request: QuoteCalculationRequest): Promise<void> {
    if (!request.customer_id) {
      throw new ValidationError('Customer ID is required');
    }

    if (!request.items || request.items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    // Validate each item
    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      
      if (!item.product_variant_id) {
        throw new ValidationError(`Item ${i + 1}: Product variant ID is required`);
      }

      if (!item.box_material_id) {
        throw new ValidationError(`Item ${i + 1}: Box material ID is required`);
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new ValidationError(`Item ${i + 1}: Quantity must be positive`);
      }

      if (item.discount_percent !== undefined && 
          (item.discount_percent < 0 || item.discount_percent > 100)) {
        throw new ValidationError(`Item ${i + 1}: Discount percent must be between 0 and 100`);
      }

      if (item.custom_price !== undefined && item.custom_price < 0) {
        throw new ValidationError(`Item ${i + 1}: Custom price cannot be negative`);
      }
    }
  }

  /**
   * Validate final calculation
   */
  private validateCalculation(calculation: QuoteCalculation, businessRules: BusinessRules): void {
    // Check minimum order amount
    if (calculation.total_amount < businessRules.validation_rules.min_quote_amount) {
      throw new CalculationError(
        `Quote total ${calculation.total_amount} is below minimum order amount ${businessRules.validation_rules.min_quote_amount}`
      );
    }

    // Check maximum order amount
    if (calculation.total_amount > businessRules.validation_rules.max_quote_amount) {
      throw new CalculationError(
        `Quote total ${calculation.total_amount} exceeds maximum order amount ${businessRules.validation_rules.max_quote_amount}`
      );
    }

    // Validate line items don't exceed maximum quantity
    calculation.line_items.forEach((item, index) => {
      if (item.quantity > businessRules.pricing_rules.max_line_item_quantity) {
        throw new CalculationError(
          `Line item ${index + 1} quantity ${item.quantity} exceeds maximum allowed ${businessRules.pricing_rules.max_line_item_quantity}`
        );
      }
    });

    // Validate total calculation consistency
    const calculatedSubtotal = calculation.line_items.reduce((sum, item) => sum + item.line_total, 0);
    const expectedTotal = calculatedSubtotal + calculation.tax_summary.tax_amount + calculation.shipping_summary.total_shipping_cost;
    
    if (Math.abs(calculation.total_amount - expectedTotal) > 0.01) {
      throw new CalculationError(
        'Quote calculation inconsistency detected',
        { 
          calculated: calculation.total_amount, 
          expected: expectedTotal,
          difference: Math.abs(calculation.total_amount - expectedTotal)
        }
      );
    }
  }

  /**
   * Round to specified decimal places
   */
  private roundToDecimalPlaces(value: number, decimalPlaces: number): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
  }

  /**
   * Recalculate quote with updated business rules
   */
  public async recalculateQuote(
    originalRequest: QuoteCalculationRequest,
    updatedBusinessRules?: BusinessRules
  ): Promise<QuoteCalculation> {
    if (updatedBusinessRules) {
      await this.businessRulesService.updateBusinessRules(updatedBusinessRules);
    }

    return this.calculateQuote(originalRequest);
  }

  /**
   * Get calculation breakdown for debugging
   */
  public async getCalculationBreakdown(request: QuoteCalculationRequest): Promise<any> {
    try {
      const calculation = await this.calculateQuote(request);
      
      return {
        line_items_breakdown: calculation.line_items.map(item => ({
          line_number: item.line_number,
          product: `${item.product_variant.sku} - ${item.box_material.name}`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          list_price: item.list_price,
          line_subtotal: item.line_subtotal,
          discounts: item.discount_details,
          line_total: item.line_total
        })),
        subtotal: calculation.subtotal,
        discount_breakdown: calculation.discount_summary,
        tax_breakdown: calculation.tax_summary,
        shipping_breakdown: calculation.shipping_summary,
        total_amount: calculation.total_amount
      };
    } catch (error) {
      this.logger.error('Failed to generate calculation breakdown', { request, error });
      throw error;
    }
  }
}