import {
  ShippingSummary,
  ShippingMethod,
  CalculatedLineItem,
  Customer,
  ShippingAddress,
  BusinessRules,
  ShippingRate,
  InstallationRate,
  DeliveryZone,
  ValidationError
} from '@/types';
import { Logger } from '@/utils/Logger';

export class ShippingCalculationService {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Calculate shipping costs for a quote
   */
  public async calculateShipping(
    lineItems: CalculatedLineItem[],
    customer: Customer,
    shippingAddress?: ShippingAddress,
    businessRules?: BusinessRules
  ): Promise<ShippingSummary> {
    try {
      this.logger.info('Calculating shipping costs', {
        itemCount: lineItems.length,
        customerId: customer.id,
        hasShippingAddress: !!shippingAddress
      });

      // Default to pickup if no shipping address provided
      if (!shippingAddress) {
        return this.createPickupSummary();
      }

      // Calculate total order value for free shipping threshold
      const orderValue = lineItems.reduce((sum, item) => sum + item.line_total, 0);

      // Check for free shipping
      if (businessRules && orderValue >= businessRules.shipping_rules.free_shipping_threshold) {
        return this.createFreeShippingSummary();
      }

      // Determine best shipping method based on delivery zone and order characteristics
      const shippingMethod = await this.determineShippingMethod(
        lineItems,
        shippingAddress,
        businessRules
      );

      // Calculate shipping cost
      const shippingCost = await this.calculateShippingCost(
        lineItems,
        shippingAddress,
        shippingMethod,
        businessRules
      );

      // Calculate installation cost if applicable
      const installationCost = await this.calculateInstallationCost(
        lineItems,
        shippingAddress,
        shippingMethod,
        businessRules
      );

      // Get delivery estimate
      const deliveryEstimate = await this.getDeliveryEstimate(
        shippingAddress,
        shippingMethod,
        businessRules
      );

      const totalShippingCost = this.roundToDecimalPlaces(
        shippingCost + (installationCost || 0),
        2
      );

      const shippingSummary: ShippingSummary = {
        shipping_method: shippingMethod,
        shipping_cost: this.roundToDecimalPlaces(shippingCost, 2),
        delivery_estimate: deliveryEstimate,
        installation_cost: installationCost ? this.roundToDecimalPlaces(installationCost, 2) : undefined,
        total_shipping_cost: totalShippingCost
      };

      this.logger.info('Shipping calculation completed', {
        shippingMethod,
        shippingCost,
        installationCost,
        totalShippingCost
      });

      return shippingSummary;

    } catch (error) {
      this.logger.error('Shipping calculation failed', { 
        itemCount: lineItems.length,
        customerId: customer.id,
        error 
      });
      throw error;
    }
  }

  /**
   * Determine optimal shipping method
   */
  private async determineShippingMethod(
    lineItems: CalculatedLineItem[],
    shippingAddress: ShippingAddress,
    businessRules?: BusinessRules
  ): Promise<ShippingMethod> {
    // Count total cabinets
    const totalCabinets = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Get delivery zone
    const deliveryZone = await this.getDeliveryZone(shippingAddress, businessRules);
    
    // Determine method based on order size and complexity
    if (totalCabinets >= 20) {
      // Large orders typically need white glove service
      return ShippingMethod.WHITE_GLOVE;
    } else if (totalCabinets >= 10) {
      // Medium orders can use standard delivery
      return ShippingMethod.STANDARD_DELIVERY;
    } else {
      // Small orders can use standard delivery
      return ShippingMethod.STANDARD_DELIVERY;
    }
  }

  /**
   * Calculate shipping cost based on method and items
   */
  private async calculateShippingCost(
    lineItems: CalculatedLineItem[],
    shippingAddress: ShippingAddress,
    shippingMethod: ShippingMethod,
    businessRules?: BusinessRules
  ): Promise<number> {
    if (!businessRules) {
      return this.getDefaultShippingCost(shippingMethod, lineItems.length);
    }

    // Find shipping rate for method
    const shippingRate = businessRules.shipping_rules.shipping_rates.find(
      rate => rate.method === shippingMethod
    );

    if (!shippingRate) {
      throw new ValidationError(`Shipping rate not found for method: ${shippingMethod}`);
    }

    // Calculate base cost
    let totalCost = shippingRate.base_cost;

    // Add per-item cost
    if (shippingRate.cost_per_item) {
      const totalItems = lineItems.reduce((sum, item) => sum + item.quantity, 0);
      totalCost += shippingRate.cost_per_item * totalItems;
    }

    // Add weight-based cost (if implemented)
    if (shippingRate.cost_per_weight) {
      const totalWeight = await this.calculateTotalWeight(lineItems);
      totalCost += shippingRate.cost_per_weight * totalWeight;
    }

    // Add delivery zone cost
    const deliveryZone = await this.getDeliveryZone(shippingAddress, businessRules);
    if (deliveryZone) {
      totalCost += deliveryZone.additional_cost;
    }

    return totalCost;
  }

  /**
   * Calculate installation cost if applicable
   */
  private async calculateInstallationCost(
    lineItems: CalculatedLineItem[],
    shippingAddress: ShippingAddress,
    shippingMethod: ShippingMethod,
    businessRules?: BusinessRules
  ): Promise<number | undefined> {
    // Only calculate installation for installation method
    if (shippingMethod !== ShippingMethod.INSTALLATION) {
      return undefined;
    }

    if (!businessRules || businessRules.shipping_rules.installation_rates.length === 0) {
      // Default installation cost
      const totalCabinets = lineItems.reduce((sum, item) => sum + item.quantity, 0);
      return 500 + (totalCabinets * 150); // Base + per cabinet
    }

    const installationRate = businessRules.shipping_rules.installation_rates[0]; // Use first rate
    
    let installationCost = installationRate.base_cost;

    // Add per-cabinet cost
    const totalCabinets = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    installationCost += installationRate.cost_per_cabinet * totalCabinets;

    // Add linear foot cost (if applicable)
    if (installationRate.cost_per_linear_foot) {
      const totalLinearFeet = await this.calculateTotalLinearFeet(lineItems);
      installationCost += installationRate.cost_per_linear_foot * totalLinearFeet;
    }

    // Add travel cost (if applicable)
    if (installationRate.travel_cost_per_mile) {
      const distance = await this.calculateDistanceToCustomer(shippingAddress);
      installationCost += installationRate.travel_cost_per_mile * distance;
    }

    // Apply minimum charge
    if (installationCost < installationRate.min_charge) {
      installationCost = installationRate.min_charge;
    }

    return installationCost;
  }

  /**
   * Get delivery estimate
   */
  private async getDeliveryEstimate(
    shippingAddress: ShippingAddress,
    shippingMethod: ShippingMethod,
    businessRules?: BusinessRules
  ): Promise<string> {
    if (shippingMethod === ShippingMethod.PICKUP) {
      return 'Available for pickup in 1-2 business days';
    }

    // Get delivery zone
    const deliveryZone = await this.getDeliveryZone(shippingAddress, businessRules);
    
    if (deliveryZone) {
      const deliveryDays = deliveryZone.delivery_days;
      return `${deliveryDays} business days`;
    }

    // Default estimates by method
    switch (shippingMethod) {
      case ShippingMethod.STANDARD_DELIVERY:
        return '5-7 business days';
      case ShippingMethod.WHITE_GLOVE:
        return '7-10 business days';
      case ShippingMethod.INSTALLATION:
        return '10-14 business days (includes installation scheduling)';
      default:
        return '5-7 business days';
    }
  }

  /**
   * Get delivery zone for address
   */
  private async getDeliveryZone(
    shippingAddress: ShippingAddress,
    businessRules?: BusinessRules
  ): Promise<DeliveryZone | null> {
    if (!businessRules) {
      return null;
    }

    const postalCode = shippingAddress.postal_code;
    
    return businessRules.shipping_rules.delivery_zones.find(zone =>
      zone.postal_codes.includes(postalCode)
    ) || null;
  }

  /**
   * Calculate total weight of line items
   */
  private async calculateTotalWeight(lineItems: CalculatedLineItem[]): Promise<number> {
    // This would typically lookup product weights from database
    // For now, estimate based on cabinet dimensions
    let totalWeight = 0;

    lineItems.forEach(item => {
      // Estimate weight based on product type and quantity
      // Average cabinet weight: 50-100 lbs depending on size
      const estimatedWeight = 75; // lbs per cabinet
      totalWeight += estimatedWeight * item.quantity;
    });

    return totalWeight;
  }

  /**
   * Calculate total linear feet
   */
  private async calculateTotalLinearFeet(lineItems: CalculatedLineItem[]): Promise<number> {
    let totalLinearFeet = 0;

    lineItems.forEach(item => {
      // Get width from product data
      const width = item.product_variant.product?.width || 24; // Default 24 inches
      const linearFeet = (width / 12) * item.quantity; // Convert inches to feet
      totalLinearFeet += linearFeet;
    });

    return totalLinearFeet;
  }

  /**
   * Calculate distance to customer (placeholder)
   */
  private async calculateDistanceToCustomer(shippingAddress: ShippingAddress): Promise<number> {
    // This would integrate with a mapping service like Google Maps
    // For now, return a default distance based on postal code
    const postalCode = shippingAddress.postal_code;
    
    // Simple distance estimation (would be replaced with real service)
    if (postalCode.startsWith('90')) {
      return 25; // Local LA area
    } else if (postalCode.startsWith('91') || postalCode.startsWith('92')) {
      return 50; // Greater LA area
    } else {
      return 100; // Extended area
    }
  }

  /**
   * Create pickup summary
   */
  private createPickupSummary(): ShippingSummary {
    return {
      shipping_method: ShippingMethod.PICKUP,
      shipping_cost: 0,
      delivery_estimate: 'Available for pickup in 1-2 business days',
      total_shipping_cost: 0
    };
  }

  /**
   * Create free shipping summary
   */
  private createFreeShippingSummary(): ShippingSummary {
    return {
      shipping_method: ShippingMethod.STANDARD_DELIVERY,
      shipping_cost: 0,
      delivery_estimate: '5-7 business days (Free shipping applied)',
      total_shipping_cost: 0
    };
  }

  /**
   * Get default shipping cost
   */
  private getDefaultShippingCost(method: ShippingMethod, itemCount: number): number {
    const baseCosts = {
      [ShippingMethod.PICKUP]: 0,
      [ShippingMethod.STANDARD_DELIVERY]: 150,
      [ShippingMethod.WHITE_GLOVE]: 300,
      [ShippingMethod.INSTALLATION]: 500
    };

    const perItemCosts = {
      [ShippingMethod.PICKUP]: 0,
      [ShippingMethod.STANDARD_DELIVERY]: 25,
      [ShippingMethod.WHITE_GLOVE]: 50,
      [ShippingMethod.INSTALLATION]: 75
    };

    return baseCosts[method] + (perItemCosts[method] * itemCount);
  }

  /**
   * Get available shipping methods for address
   */
  public async getAvailableShippingMethods(
    shippingAddress: ShippingAddress,
    businessRules?: BusinessRules
  ): Promise<ShippingMethod[]> {
    const availableMethods = [ShippingMethod.PICKUP, ShippingMethod.STANDARD_DELIVERY];

    // Check if address is in delivery zone
    const deliveryZone = await this.getDeliveryZone(shippingAddress, businessRules);
    
    if (deliveryZone) {
      availableMethods.push(ShippingMethod.WHITE_GLOVE);
      
      // Check distance for installation
      const distance = await this.calculateDistanceToCustomer(shippingAddress);
      const maxInstallationDistance = businessRules?.shipping_rules.shipping_rates
        .find(rate => rate.method === ShippingMethod.INSTALLATION)?.max_distance || 150;
      
      if (distance <= maxInstallationDistance) {
        availableMethods.push(ShippingMethod.INSTALLATION);
      }
    }

    return availableMethods;
  }

  /**
   * Get shipping quote for specific method
   */
  public async getShippingQuote(
    lineItems: CalculatedLineItem[],
    shippingAddress: ShippingAddress,
    shippingMethod: ShippingMethod,
    businessRules?: BusinessRules
  ): Promise<{
    method: ShippingMethod;
    cost: number;
    deliveryEstimate: string;
    installationCost?: number;
    totalCost: number;
  }> {
    const shippingCost = await this.calculateShippingCost(
      lineItems,
      shippingAddress,
      shippingMethod,
      businessRules
    );

    const installationCost = await this.calculateInstallationCost(
      lineItems,
      shippingAddress,
      shippingMethod,
      businessRules
    );

    const deliveryEstimate = await this.getDeliveryEstimate(
      shippingAddress,
      shippingMethod,
      businessRules
    );

    const totalCost = shippingCost + (installationCost || 0);

    return {
      method: shippingMethod,
      cost: this.roundToDecimalPlaces(shippingCost, 2),
      deliveryEstimate,
      installationCost: installationCost ? this.roundToDecimalPlaces(installationCost, 2) : undefined,
      totalCost: this.roundToDecimalPlaces(totalCost, 2)
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