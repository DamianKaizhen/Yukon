import {
  TaxSummary,
  TaxDetail,
  Customer,
  ShippingAddress,
  BusinessRules,
  ValidationError
} from '@/types';
import { Logger } from '@/utils/Logger';

export class TaxCalculationService {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Calculate tax for a quote
   */
  public async calculateTax(
    subtotal: number,
    customer: Customer,
    shippingAddress?: ShippingAddress,
    businessRules?: BusinessRules,
    applyTax: boolean = true
  ): Promise<TaxSummary> {
    try {
      this.logger.info('Calculating tax', {
        subtotal,
        customerId: customer.id,
        applyTax,
        hasShippingAddress: !!shippingAddress
      });

      // If tax should not be applied, return zero tax
      if (!applyTax) {
        return this.createZeroTaxSummary(subtotal, 'Tax exempted by request');
      }

      // Check if customer is tax exempt
      if (await this.isCustomerTaxExempt(customer, businessRules)) {
        return this.createZeroTaxSummary(subtotal, 'Customer is tax exempt');
      }

      // Determine tax jurisdiction
      const taxJurisdiction = this.determineTaxJurisdiction(customer, shippingAddress);
      
      // Get tax rate for jurisdiction
      const taxRate = await this.getTaxRate(taxJurisdiction, businessRules);

      // Calculate tax details
      const taxDetails = await this.calculateTaxDetails(
        subtotal,
        taxJurisdiction,
        taxRate,
        businessRules
      );

      // Calculate total tax amount
      const taxAmount = this.roundToDecimalPlaces(
        taxDetails.reduce((sum, detail) => sum + detail.amount, 0),
        2
      );

      const taxSummary: TaxSummary = {
        tax_rate: taxRate,
        taxable_amount: subtotal,
        tax_amount: taxAmount,
        tax_jurisdiction: taxJurisdiction,
        tax_exempt: false,
        tax_details: taxDetails
      };

      this.logger.info('Tax calculation completed', {
        taxRate,
        taxAmount,
        taxJurisdiction
      });

      return taxSummary;

    } catch (error) {
      this.logger.error('Tax calculation failed', { 
        subtotal, 
        customerId: customer.id, 
        error 
      });
      throw error;
    }
  }

  /**
   * Check if customer is tax exempt
   */
  private async isCustomerTaxExempt(
    customer: Customer,
    businessRules?: BusinessRules
  ): Promise<boolean> {
    if (!businessRules) {
      return false;
    }

    return businessRules.tax_rules.tax_exempt_customers.includes(customer.id);
  }

  /**
   * Determine tax jurisdiction based on customer and shipping address
   */
  private determineTaxJurisdiction(
    customer: Customer,
    shippingAddress?: ShippingAddress
  ): string {
    // Use shipping address if provided, otherwise use customer address
    const address = shippingAddress || {
      state_province: customer.state_province,
      country: customer.country
    };

    // Normalize country codes
    const country = this.normalizeCountryCode(address.country || customer.country);
    const province = address.state_province || customer.state_province;

    // For Canadian addresses, use province as jurisdiction
    if (country === 'CA' || country === 'CAN' || country === 'Canada') {
      return province || 'BC'; // Default to BC (British Columbia)
    }

    // For US addresses, use state as jurisdiction
    if (country === 'US' || country === 'USA' || country === 'United States') {
      return province || 'CA'; // Default to California
    }

    // For other countries, return country code
    return country || 'CA';
  }

  /**
   * Normalize country codes to standard format
   */
  private normalizeCountryCode(country?: string): string {
    if (!country) return 'CA'; // Default to Canada

    const normalized = country.toUpperCase().trim();
    
    // Country code mappings
    const countryMappings: Record<string, string> = {
      'CANADA': 'CA',
      'CAN': 'CA',
      'UNITED STATES': 'US',
      'USA': 'US',
      'US': 'US',
      'AMERICA': 'US'
    };

    return countryMappings[normalized] || normalized;
  }

  /**
   * Get tax rate for jurisdiction
   */
  private async getTaxRate(
    jurisdiction: string,
    businessRules?: BusinessRules
  ): Promise<number> {
    if (!businessRules) {
      return 0.0875; // Default CA rate
    }

    const taxRules = businessRules.tax_rules;

    // Check if jurisdiction is in taxable states
    if (!taxRules.taxable_states.includes(jurisdiction)) {
      this.logger.info('No tax for jurisdiction', { jurisdiction });
      return 0;
    }

    // Get regional tax rate
    const regionalRate = taxRules.regional_tax_rates[jurisdiction];
    if (regionalRate !== undefined) {
      return regionalRate;
    }

    // Fall back to default rate
    this.logger.warn('Using default tax rate for jurisdiction', { jurisdiction });
    return taxRules.default_tax_rate;
  }

  /**
   * Calculate detailed tax breakdown (supports Canadian GST/PST and US state taxes)
   */
  private async calculateTaxDetails(
    subtotal: number,
    jurisdiction: string,
    totalTaxRate: number,
    businessRules?: BusinessRules
  ): Promise<TaxDetail[]> {
    const details: TaxDetail[] = [];

    if (totalTaxRate === 0) {
      return details;
    }

    // Check if this is a Canadian province for GST/PST breakdown
    if (this.isCanadianProvince(jurisdiction)) {
      return this.calculateCanadianTaxDetails(subtotal, jurisdiction, totalTaxRate);
    }

    // For US states and other jurisdictions, use single tax
    const taxAmount = this.roundToDecimalPlaces(subtotal * totalTaxRate, 2);

    if (taxAmount > 0) {
      details.push({
        jurisdiction: jurisdiction,
        rate: totalTaxRate,
        amount: taxAmount,
        type: 'state'
      });
    }

    return details;
  }

  /**
   * Calculate Canadian tax breakdown (GST + PST/HST)
   */
  private calculateCanadianTaxDetails(
    subtotal: number,
    province: string,
    totalTaxRate: number
  ): TaxDetail[] {
    const details: TaxDetail[] = [];
    
    // Canadian tax rates (as of 2024)
    const canadianTaxRates: Record<string, { gst: number; pst: number; hst: number; name: string }> = {
      'AB': { gst: 0.05, pst: 0, hst: 0, name: 'Alberta' },
      'BC': { gst: 0.05, pst: 0.07, hst: 0, name: 'British Columbia' },
      'MB': { gst: 0.05, pst: 0.07, hst: 0, name: 'Manitoba' },
      'NB': { gst: 0, pst: 0, hst: 0.15, name: 'New Brunswick' },
      'NL': { gst: 0, pst: 0, hst: 0.15, name: 'Newfoundland and Labrador' },
      'NT': { gst: 0.05, pst: 0, hst: 0, name: 'Northwest Territories' },
      'NS': { gst: 0, pst: 0, hst: 0.15, name: 'Nova Scotia' },
      'NU': { gst: 0.05, pst: 0, hst: 0, name: 'Nunavut' },
      'ON': { gst: 0, pst: 0, hst: 0.13, name: 'Ontario' },
      'PE': { gst: 0, pst: 0, hst: 0.15, name: 'Prince Edward Island' },
      'QC': { gst: 0.05, pst: 0.09975, hst: 0, name: 'Quebec' },
      'SK': { gst: 0.05, pst: 0.06, hst: 0, name: 'Saskatchewan' },
      'YT': { gst: 0.05, pst: 0, hst: 0, name: 'Yukon' }
    };

    const taxInfo = canadianTaxRates[province.toUpperCase()];
    
    if (!taxInfo) {
      // Fallback to BC rates if province not found
      const bcRates = canadianTaxRates['BC'];
      const gstAmount = this.roundToDecimalPlaces(subtotal * bcRates.gst, 2);
      const pstAmount = this.roundToDecimalPlaces(subtotal * bcRates.pst, 2);
      
      details.push({
        jurisdiction: 'Canada',
        rate: bcRates.gst,
        amount: gstAmount,
        type: 'state'
      });
      
      if (pstAmount > 0) {
        details.push({
          jurisdiction: 'British Columbia',
          rate: bcRates.pst,
          amount: pstAmount,
          type: 'state'
        });
      }
      
      return details;
    }

    // HST provinces (combined tax)
    if (taxInfo.hst > 0) {
      const hstAmount = this.roundToDecimalPlaces(subtotal * taxInfo.hst, 2);
      details.push({
        jurisdiction: `${taxInfo.name} (HST)`,
        rate: taxInfo.hst,
        amount: hstAmount,
        type: 'state'
      });
    } else {
      // GST + PST provinces
      if (taxInfo.gst > 0) {
        const gstAmount = this.roundToDecimalPlaces(subtotal * taxInfo.gst, 2);
        details.push({
          jurisdiction: 'Canada (GST)',
          rate: taxInfo.gst,
          amount: gstAmount,
          type: 'state'
        });
      }
      
      if (taxInfo.pst > 0) {
        const pstAmount = this.roundToDecimalPlaces(subtotal * taxInfo.pst, 2);
        details.push({
          jurisdiction: `${taxInfo.name} (PST)`,
          rate: taxInfo.pst,
          amount: pstAmount,
          type: 'state'
        });
      }
    }

    return details;
  }

  /**
   * Check if jurisdiction is a Canadian province
   */
  private isCanadianProvince(jurisdiction: string): boolean {
    const canadianProvinces = [
      'AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
      'ALBERTA', 'BRITISH COLUMBIA', 'MANITOBA', 'NEW BRUNSWICK', 
      'NEWFOUNDLAND AND LABRADOR', 'NORTHWEST TERRITORIES', 'NOVA SCOTIA',
      'NUNAVUT', 'ONTARIO', 'PRINCE EDWARD ISLAND', 'QUEBEC', 'SASKATCHEWAN', 'YUKON'
    ];
    
    return canadianProvinces.includes(jurisdiction.toUpperCase());
  }

  /**
   * Create zero tax summary
   */
  private createZeroTaxSummary(subtotal: number, reason: string): TaxSummary {
    return {
      tax_rate: 0,
      taxable_amount: subtotal,
      tax_amount: 0,
      tax_jurisdiction: reason,
      tax_exempt: true,
      tax_details: []
    };
  }

  /**
   * Calculate tax for specific jurisdiction and amount
   */
  public async calculateTaxForJurisdiction(
    amount: number,
    jurisdiction: string,
    businessRules?: BusinessRules
  ): Promise<number> {
    try {
      const taxRate = await this.getTaxRate(jurisdiction, businessRules);
      return this.roundToDecimalPlaces(amount * taxRate, 2);
    } catch (error) {
      this.logger.error('Tax calculation for jurisdiction failed', { 
        amount, 
        jurisdiction, 
        error 
      });
      throw error;
    }
  }

  /**
   * Get available tax jurisdictions
   */
  public async getAvailableTaxJurisdictions(businessRules?: BusinessRules): Promise<string[]> {
    if (!businessRules) {
      return ['CA', 'NY', 'TX', 'FL']; // Default states
    }

    return businessRules.tax_rules.taxable_states;
  }

  /**
   * Validate tax calculation inputs
   */
  public validateTaxInputs(
    subtotal: number,
    jurisdiction?: string
  ): void {
    if (subtotal < 0) {
      throw new ValidationError('Subtotal cannot be negative for tax calculation');
    }

    if (jurisdiction && jurisdiction.length === 0) {
      throw new ValidationError('Tax jurisdiction cannot be empty');
    }
  }

  /**
   * Get tax rate information for display
   */
  public async getTaxRateInfo(
    jurisdiction: string,
    businessRules?: BusinessRules
  ): Promise<{
    jurisdiction: string;
    rate: number;
    isExempt: boolean;
    description: string;
  }> {
    const rate = await this.getTaxRate(jurisdiction, businessRules);
    
    return {
      jurisdiction,
      rate,
      isExempt: rate === 0,
      description: rate === 0 
        ? `No tax applicable for ${jurisdiction}`
        : `${jurisdiction} tax rate: ${(rate * 100).toFixed(2)}%`
    };
  }

  /**
   * Calculate tax impact of discounts
   */
  public async calculateTaxImpactOfDiscounts(
    originalAmount: number,
    discountedAmount: number,
    jurisdiction: string,
    businessRules?: BusinessRules
  ): Promise<{
    originalTax: number;
    discountedTax: number;
    taxSavings: number;
  }> {
    const taxRate = await this.getTaxRate(jurisdiction, businessRules);
    
    const originalTax = this.roundToDecimalPlaces(originalAmount * taxRate, 2);
    const discountedTax = this.roundToDecimalPlaces(discountedAmount * taxRate, 2);
    const taxSavings = originalTax - discountedTax;

    return {
      originalTax,
      discountedTax,
      taxSavings: this.roundToDecimalPlaces(taxSavings, 2)
    };
  }

  /**
   * Round to specified decimal places
   */
  private roundToDecimalPlaces(value: number, decimalPlaces: number): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
  }
}