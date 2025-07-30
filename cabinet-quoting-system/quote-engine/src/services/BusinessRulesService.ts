import {
  BusinessRules,
  PricingRules,
  DiscountRules,
  TaxRules,
  ShippingRules,
  ValidationRules,
  CustomerDiscountTier,
  ShippingMethod,
  ConfigurationError
} from '@/types';
import { config } from '@/config';
import { Logger } from '@/utils/Logger';

export class BusinessRulesService {
  private logger: Logger;
  private cachedRules: BusinessRules | null = null;
  private lastUpdated: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Get current business rules with caching
   */
  public async getBusinessRules(): Promise<BusinessRules> {
    try {
      // Check if cached rules are still valid
      if (this.cachedRules && this.lastUpdated && 
          (Date.now() - this.lastUpdated.getTime()) < this.CACHE_TTL) {
        return this.cachedRules;
      }

      // Load fresh business rules
      const rules = await this.loadBusinessRules();
      this.cachedRules = rules;
      this.lastUpdated = new Date();

      this.logger.info('Business rules loaded successfully');
      return rules;

    } catch (error) {
      this.logger.error('Failed to get business rules', { error });
      
      // Return cached rules if available, otherwise throw error
      if (this.cachedRules) {
        this.logger.warn('Using cached business rules due to load failure');
        return this.cachedRules;
      }
      
      throw error;
    }
  }

  /**
   * Load business rules from configuration and database
   */
  private async loadBusinessRules(): Promise<BusinessRules> {
    const businessConfig = config.getBusinessConfig();

    const pricingRules: PricingRules = {
      min_order_amount: businessConfig.min_order_amount,
      max_line_item_quantity: 1000, // Configurable limit
      price_precision: 2, // Always 2 decimal places for currency
      markup_rules: [
        {
          customer_tier: CustomerDiscountTier.RETAIL,
          markup_percentage: 0,
          effective_date: new Date('2024-01-01'),
        },
        {
          customer_tier: CustomerDiscountTier.CONTRACTOR,
          markup_percentage: -5, // 5% discount
          effective_date: new Date('2024-01-01'),
        },
        {
          customer_tier: CustomerDiscountTier.DEALER,
          markup_percentage: -10, // 10% discount
          effective_date: new Date('2024-01-01'),
        },
        {
          customer_tier: CustomerDiscountTier.WHOLESALE,
          markup_percentage: -15, // 15% discount
          effective_date: new Date('2024-01-01'),
        }
      ]
    };

    const discountRules: DiscountRules = {
      max_discount_percentage: 50, // Maximum 50% total discount
      bulk_discount_thresholds: [
        {
          min_quantity: 10,
          discount_percentage: 2,
          applies_to: 'line_item'
        },
        {
          min_quantity: 25,
          discount_percentage: 5,
          applies_to: 'line_item'
        },
        {
          min_quantity: 50,
          discount_percentage: 8,
          applies_to: 'line_item'
        },
        {
          min_quantity: businessConfig.bulk_discount_threshold,
          discount_percentage: businessConfig.bulk_discount_percentage,
          applies_to: 'total_order'
        }
      ],
      customer_tier_discounts: [
        {
          tier: CustomerDiscountTier.RETAIL,
          discount_percentage: 0
        },
        {
          tier: CustomerDiscountTier.CONTRACTOR,
          discount_percentage: 5,
          min_order_amount: 1000
        },
        {
          tier: CustomerDiscountTier.DEALER,
          discount_percentage: 10,
          min_order_amount: 2500
        },
        {
          tier: CustomerDiscountTier.WHOLESALE,
          discount_percentage: 15,
          min_order_amount: 5000
        }
      ],
      promotional_discounts: [] // Would be loaded from database
    };

    const taxRules: TaxRules = {
      default_tax_rate: businessConfig.default_tax_rate,
      regional_tax_rates: businessConfig.regional_tax_rates,
      tax_exempt_customers: [], // Would be loaded from database
      taxable_states: Object.keys(businessConfig.regional_tax_rates)
    };

    const shippingRules: ShippingRules = {
      free_shipping_threshold: 2500, // Free shipping over $2500
      shipping_rates: [
        {
          method: ShippingMethod.PICKUP,
          base_cost: 0
        },
        {
          method: ShippingMethod.STANDARD_DELIVERY,
          base_cost: 150,
          cost_per_item: 25,
          max_distance: 50
        },
        {
          method: ShippingMethod.WHITE_GLOVE,
          base_cost: 300,
          cost_per_item: 50,
          max_distance: 100
        },
        {
          method: ShippingMethod.INSTALLATION,
          base_cost: 500,
          cost_per_item: 75,
          max_distance: 150
        }
      ],
      installation_rates: [
        {
          base_cost: 500,
          cost_per_cabinet: 150,
          cost_per_linear_foot: 75,
          travel_cost_per_mile: 2.50,
          min_charge: 750
        }
      ],
      delivery_zones: [
        {
          zone_id: 'local',
          zone_name: 'Local Delivery',
          postal_codes: ['90210', '90211', '90212'], // Example postal codes
          delivery_days: 3,
          additional_cost: 0
        },
        {
          zone_id: 'regional',
          zone_name: 'Regional Delivery',
          postal_codes: ['90213', '90214', '90215'],
          delivery_days: 7,
          additional_cost: 100
        },
        {
          zone_id: 'extended',
          zone_name: 'Extended Delivery',
          postal_codes: ['90216', '90217', '90218'],
          delivery_days: 14,
          additional_cost: 250
        }
      ]
    };

    const validationRules: ValidationRules = {
      min_quote_amount: businessConfig.min_order_amount,
      max_quote_amount: 1000000, // $1M maximum
      max_quote_validity_days: businessConfig.default_quote_validity_days,
      required_customer_fields: [
        'first_name',
        'last_name', 
        'email',
        'phone'
      ],
      required_quote_fields: [
        'customer_id',
        'items'
      ]
    };

    return {
      pricing_rules: pricingRules,
      discount_rules: discountRules,
      tax_rules: taxRules,
      shipping_rules: shippingRules,
      validation_rules: validationRules
    };
  }

  /**
   * Update business rules
   */
  public async updateBusinessRules(updates: Partial<BusinessRules>): Promise<BusinessRules> {
    try {
      const currentRules = await this.getBusinessRules();
      const updatedRules = { ...currentRules, ...updates };

      // Validate updated rules
      this.validateBusinessRules(updatedRules);

      // Update cache
      this.cachedRules = updatedRules;
      this.lastUpdated = new Date();

      this.logger.info('Business rules updated successfully', { 
        updates: Object.keys(updates) 
      });

      return updatedRules;

    } catch (error) {
      this.logger.error('Failed to update business rules', { updates, error });
      throw error;
    }
  }

  /**
   * Validate business rules consistency
   */
  private validateBusinessRules(rules: BusinessRules): void {
    const errors: string[] = [];

    // Validate pricing rules
    if (rules.pricing_rules.min_order_amount < 0) {
      errors.push('Minimum order amount cannot be negative');
    }

    if (rules.pricing_rules.max_line_item_quantity <= 0) {
      errors.push('Maximum line item quantity must be positive');
    }

    if (rules.pricing_rules.price_precision < 0 || rules.pricing_rules.price_precision > 4) {
      errors.push('Price precision must be between 0 and 4 decimal places');
    }

    // Validate discount rules
    if (rules.discount_rules.max_discount_percentage < 0 || 
        rules.discount_rules.max_discount_percentage > 100) {
      errors.push('Maximum discount percentage must be between 0 and 100');
    }

    // Validate bulk discount thresholds are in ascending order
    const lineItemThresholds = rules.discount_rules.bulk_discount_thresholds
      .filter(t => t.applies_to === 'line_item')
      .sort((a, b) => a.min_quantity - b.min_quantity);

    for (let i = 1; i < lineItemThresholds.length; i++) {
      if (lineItemThresholds[i].discount_percentage <= lineItemThresholds[i-1].discount_percentage) {
        errors.push('Bulk discount percentages must increase with quantity');
      }
    }

    // Validate tax rules
    if (rules.tax_rules.default_tax_rate < 0 || rules.tax_rules.default_tax_rate > 1) {
      errors.push('Default tax rate must be between 0 and 1');
    }

    Object.entries(rules.tax_rules.regional_tax_rates).forEach(([state, rate]) => {
      if (rate < 0 || rate > 1) {
        errors.push(`Regional tax rate for ${state} must be between 0 and 1`);
      }
    });

    // Validate shipping rules
    if (rules.shipping_rules.free_shipping_threshold < 0) {
      errors.push('Free shipping threshold cannot be negative');
    }

    rules.shipping_rules.shipping_rates.forEach((rate, index) => {
      if (rate.base_cost < 0) {
        errors.push(`Shipping rate ${index}: Base cost cannot be negative`);
      }
      if (rate.cost_per_item && rate.cost_per_item < 0) {
        errors.push(`Shipping rate ${index}: Cost per item cannot be negative`);
      }
    });

    // Validate validation rules
    if (rules.validation_rules.min_quote_amount < 0) {
      errors.push('Minimum quote amount cannot be negative');
    }

    if (rules.validation_rules.max_quote_amount <= rules.validation_rules.min_quote_amount) {
      errors.push('Maximum quote amount must be greater than minimum quote amount');
    }

    if (rules.validation_rules.max_quote_validity_days <= 0) {
      errors.push('Maximum quote validity days must be positive');
    }

    if (errors.length > 0) {
      throw new ConfigurationError(
        `Business rules validation failed: ${errors.join(', ')}`,
        { errors }
      );
    }
  }

  /**
   * Get specific rule set
   */
  public async getPricingRules(): Promise<PricingRules> {
    const rules = await this.getBusinessRules();
    return rules.pricing_rules;
  }

  public async getDiscountRules(): Promise<DiscountRules> {
    const rules = await this.getBusinessRules();
    return rules.discount_rules;
  }

  public async getTaxRules(): Promise<TaxRules> {
    const rules = await this.getBusinessRules();
    return rules.tax_rules;
  }

  public async getShippingRules(): Promise<ShippingRules> {
    const rules = await this.getBusinessRules();
    return rules.shipping_rules;
  }

  public async getValidationRules(): Promise<ValidationRules> {
    const rules = await this.getBusinessRules();
    return rules.validation_rules;
  }

  /**
   * Clear cache and force reload
   */
  public clearCache(): void {
    this.cachedRules = null;
    this.lastUpdated = null;
    this.logger.info('Business rules cache cleared');
  }

  /**
   * Check if customer qualifies for tier discount
   */
  public async checkCustomerTierDiscount(
    customerId: string,
    tier: CustomerDiscountTier,
    orderAmount: number
  ): Promise<boolean> {
    const discountRules = await this.getDiscountRules();
    const tierDiscount = discountRules.customer_tier_discounts.find(d => d.tier === tier);
    
    if (!tierDiscount) {
      return false;
    }

    return !tierDiscount.min_order_amount || orderAmount >= tierDiscount.min_order_amount;
  }

  /**
   * Get applicable bulk discounts for quantity
   */
  public async getApplicableBulkDiscounts(
    quantity: number,
    appliesTo: 'line_item' | 'total_order'
  ): Promise<any[]> {
    const discountRules = await this.getDiscountRules();
    
    return discountRules.bulk_discount_thresholds
      .filter(threshold => 
        threshold.applies_to === appliesTo && 
        quantity >= threshold.min_quantity
      )
      .sort((a, b) => b.discount_percentage - a.discount_percentage); // Highest discount first
  }
}