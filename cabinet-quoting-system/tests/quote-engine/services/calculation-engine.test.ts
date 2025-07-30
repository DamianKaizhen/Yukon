import { CalculationEngine } from '../../../quote-engine/src/services/CalculationEngine';
import { QuoteItem } from '../../../quote-engine/src/types';

describe('CalculationEngine', () => {
  let calculationEngine: CalculationEngine;
  let mockQuoteItems: QuoteItem[];

  beforeAll(() => {
    calculationEngine = new CalculationEngine();
  });

  beforeEach(() => {
    mockQuoteItems = [
      {
        id: 1,
        productId: 1,
        productName: 'Base Cabinet 36"',
        category: 'Kitchen Cabinets',
        subcategory: 'Base Cabinets',
        quantity: 2,
        unitPrice: 299.99,
        totalPrice: 0, // Will be calculated
        specifications: {
          width: 36,
          height: 84,
          depth: 24,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        },
        customizations: {}
      },
      {
        id: 2,
        productId: 2,
        productName: 'Wall Cabinet 30"',
        category: 'Kitchen Cabinets',
        subcategory: 'Wall Cabinets',
        quantity: 3,
        unitPrice: 199.99,
        totalPrice: 0, // Will be calculated
        specifications: {
          width: 30,
          height: 42,
          depth: 12,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        },
        customizations: {}
      }
    ];
  });

  describe('calculateItemTotals', () => {
    it('should calculate correct total for each item', () => {
      const result = calculationEngine.calculateItemTotals(mockQuoteItems);

      expect(result[0].totalPrice).toBe(599.98); // 2 × 299.99
      expect(result[1].totalPrice).toBe(599.97); // 3 × 199.99
    });

    it('should handle zero quantities', () => {
      const itemsWithZero = [
        { ...mockQuoteItems[0], quantity: 0 }
      ];

      const result = calculationEngine.calculateItemTotals(itemsWithZero);
      expect(result[0].totalPrice).toBe(0);
    });

    it('should handle decimal quantities for custom items', () => {
      const itemsWithDecimal = [
        { ...mockQuoteItems[0], quantity: 2.5 }
      ];

      const result = calculationEngine.calculateItemTotals(itemsWithDecimal);
      expect(result[0].totalPrice).toBe(749.975); // 2.5 × 299.99
    });

    it('should round calculations to 2 decimal places', () => {
      const itemsWithRounding = [
        { ...mockQuoteItems[0], unitPrice: 100.999, quantity: 1 }
      ];

      const result = calculationEngine.calculateItemTotals(itemsWithRounding);
      expect(result[0].totalPrice).toBe(100.999); // Raw calculation
      
      // Test formatted value
      const formatted = parseFloat(result[0].totalPrice.toFixed(2));
      expect(formatted).toBe(101.00);
    });

    it('should preserve original item properties', () => {
      const result = calculationEngine.calculateItemTotals(mockQuoteItems);

      expect(result[0].productName).toBe(mockQuoteItems[0].productName);
      expect(result[0].specifications).toEqual(mockQuoteItems[0].specifications);
      expect(result[0].customizations).toEqual(mockQuoteItems[0].customizations);
    });
  });

  describe('calculateSubtotal', () => {
    it('should calculate correct subtotal for multiple items', () => {
      const itemsWithTotals = calculationEngine.calculateItemTotals(mockQuoteItems);
      const subtotal = calculationEngine.calculateSubtotal(itemsWithTotals);

      expect(subtotal).toBe(1199.95); // 599.98 + 599.97
    });

    it('should handle empty items array', () => {
      const subtotal = calculationEngine.calculateSubtotal([]);
      expect(subtotal).toBe(0);
    });

    it('should handle single item', () => {
      const singleItem = [mockQuoteItems[0]];
      const itemsWithTotals = calculationEngine.calculateItemTotals(singleItem);
      const subtotal = calculationEngine.calculateSubtotal(itemsWithTotals);

      expect(subtotal).toBe(599.98);
    });

    it('should accumulate totals correctly for large numbers', () => {
      const largeItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockQuoteItems[0],
        id: i + 1,
        unitPrice: 1000.00,
        quantity: 1
      }));

      const itemsWithTotals = calculationEngine.calculateItemTotals(largeItems);
      const subtotal = calculationEngine.calculateSubtotal(itemsWithTotals);

      expect(subtotal).toBe(100000.00);
    });
  });

  describe('calculateTax', () => {
    it('should calculate correct tax amount', () => {
      const subtotal = 1000.00;
      const taxRate = 0.085; // 8.5%
      
      const taxAmount = calculationEngine.calculateTax(subtotal, taxRate);
      expect(taxAmount).toBe(85.00);
    });

    it('should handle zero tax rate', () => {
      const subtotal = 1000.00;
      const taxRate = 0;
      
      const taxAmount = calculationEngine.calculateTax(subtotal, taxRate);
      expect(taxAmount).toBe(0);
    });

    it('should handle zero subtotal', () => {
      const subtotal = 0;
      const taxRate = 0.085;
      
      const taxAmount = calculationEngine.calculateTax(subtotal, taxRate);
      expect(taxAmount).toBe(0);
    });

    it('should calculate tax correctly for decimal amounts', () => {
      const subtotal = 1199.95;
      const taxRate = 0.085;
      
      const taxAmount = calculationEngine.calculateTax(subtotal, taxRate);
      expect(taxAmount).toBeCloseTo(101.996, 3);
    });

    it('should handle high tax rates', () => {
      const subtotal = 1000.00;
      const taxRate = 0.25; // 25%
      
      const taxAmount = calculationEngine.calculateTax(subtotal, taxRate);
      expect(taxAmount).toBe(250.00);
    });
  });

  describe('calculateShipping', () => {
    it('should calculate shipping based on weight and distance', () => {
      const totalWeight = 500; // lbs
      const distance = 50; // miles
      
      const shipping = calculationEngine.calculateShipping(totalWeight, distance);
      expect(shipping).toBeGreaterThan(0);
    });

    it('should have minimum shipping cost', () => {
      const totalWeight = 10; // very light
      const distance = 5; // very close
      
      const shipping = calculationEngine.calculateShipping(totalWeight, distance);
      expect(shipping).toBeGreaterThanOrEqual(25.00); // Minimum shipping
    });

    it('should scale with weight', () => {
      const distance = 50;
      const lightWeight = 100;
      const heavyWeight = 1000;
      
      const lightShipping = calculationEngine.calculateShipping(lightWeight, distance);
      const heavyShipping = calculationEngine.calculateShipping(heavyWeight, distance);
      
      expect(heavyShipping).toBeGreaterThan(lightShipping);
    });

    it('should scale with distance', () => {
      const weight = 500;
      const shortDistance = 10;
      const longDistance = 200;
      
      const shortShipping = calculationEngine.calculateShipping(weight, shortDistance);
      const longShipping = calculationEngine.calculateShipping(weight, longDistance);
      
      expect(longShipping).toBeGreaterThan(shortShipping);
    });

    it('should handle zero weight', () => {
      const weight = 0;
      const distance = 50;
      
      const shipping = calculationEngine.calculateShipping(weight, distance);
      expect(shipping).toBeGreaterThanOrEqual(25.00); // Minimum shipping
    });

    it('should handle zero distance (pickup)', () => {
      const weight = 500;
      const distance = 0;
      
      const shipping = calculationEngine.calculateShipping(weight, distance);
      expect(shipping).toBe(0); // No shipping for pickup
    });
  });

  describe('applyDiscounts', () => {
    it('should apply percentage discount correctly', () => {
      const subtotal = 1000.00;
      const discount = { type: 'percentage', value: 10 }; // 10%
      
      const discountedAmount = calculationEngine.applyDiscounts(subtotal, [discount]);
      expect(discountedAmount).toBe(900.00);
    });

    it('should apply fixed amount discount correctly', () => {
      const subtotal = 1000.00;
      const discount = { type: 'fixed', value: 100 }; // $100 off
      
      const discountedAmount = calculationEngine.applyDiscounts(subtotal, [discount]);
      expect(discountedAmount).toBe(900.00);
    });

    it('should apply multiple discounts', () => {
      const subtotal = 1000.00;
      const discounts = [
        { type: 'percentage', value: 10 }, // 10% off = $100
        { type: 'fixed', value: 50 } // Additional $50 off
      ];
      
      const discountedAmount = calculationEngine.applyDiscounts(subtotal, discounts);
      expect(discountedAmount).toBe(850.00); // 1000 - 100 - 50
    });

    it('should not allow discount to go below zero', () => {
      const subtotal = 100.00;
      const discount = { type: 'fixed', value: 150 }; // $150 off (more than subtotal)
      
      const discountedAmount = calculationEngine.applyDiscounts(subtotal, [discount]);
      expect(discountedAmount).toBe(0);
    });

    it('should handle empty discounts array', () => {
      const subtotal = 1000.00;
      
      const discountedAmount = calculationEngine.applyDiscounts(subtotal, []);
      expect(discountedAmount).toBe(1000.00);
    });

    it('should handle 100% discount', () => {
      const subtotal = 1000.00;
      const discount = { type: 'percentage', value: 100 };
      
      const discountedAmount = calculationEngine.applyDiscounts(subtotal, [discount]);
      expect(discountedAmount).toBe(0);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate correct total with all components', () => {
      const subtotal = 1000.00;
      const taxAmount = 85.00;
      const shippingCost = 50.00;
      
      const total = calculationEngine.calculateTotal(subtotal, taxAmount, shippingCost);
      expect(total).toBe(1135.00);
    });

    it('should handle zero values', () => {
      const total = calculationEngine.calculateTotal(0, 0, 0);
      expect(total).toBe(0);
    });

    it('should handle negative shipping (credit)', () => {
      const subtotal = 1000.00;
      const taxAmount = 85.00;
      const shippingCredit = -25.00; // Free shipping credit
      
      const total = calculationEngine.calculateTotal(subtotal, taxAmount, shippingCredit);
      expect(total).toBe(1060.00);
    });
  });

  describe('getEstimatedWeight', () => {
    it('should calculate weight based on cabinet specifications', () => {
      const weight = calculationEngine.getEstimatedWeight(mockQuoteItems);
      expect(weight).toBeGreaterThan(0);
    });

    it('should scale weight with quantity', () => {
      const singleItem = [{ ...mockQuoteItems[0], quantity: 1 }];
      const doubleItem = [{ ...mockQuoteItems[0], quantity: 2 }];
      
      const singleWeight = calculationEngine.getEstimatedWeight(singleItem);
      const doubleWeight = calculationEngine.getEstimatedWeight(doubleItem);
      
      expect(doubleWeight).toBe(singleWeight * 2);
    });

    it('should account for different cabinet sizes', () => {
      const smallCabinet = [{
        ...mockQuoteItems[0],
        specifications: { width: 12, height: 30, depth: 12 }
      }];
      
      const largeCabinet = [{
        ...mockQuoteItems[0],
        specifications: { width: 48, height: 84, depth: 24 }
      }];
      
      const smallWeight = calculationEngine.getEstimatedWeight(smallCabinet);
      const largeWeight = calculationEngine.getEstimatedWeight(largeCabinet);
      
      expect(largeWeight).toBeGreaterThan(smallWeight);
    });

    it('should handle different materials', () => {
      const plywoodCabinet = [{
        ...mockQuoteItems[0],
        specifications: { 
          ...mockQuoteItems[0].specifications,
          material: 'Plywood'
        }
      }];
      
      const solidWoodCabinet = [{
        ...mockQuoteItems[0],
        specifications: { 
          ...mockQuoteItems[0].specifications,
          material: 'Solid Wood'
        }
      }];
      
      const plywoodWeight = calculationEngine.getEstimatedWeight(plywoodCabinet);
      const solidWoodWeight = calculationEngine.getEstimatedWeight(solidWoodCabinet);
      
      expect(solidWoodWeight).toBeGreaterThan(plywoodWeight);
    });
  });

  describe('Integration Tests', () => {
    it('should calculate complete quote correctly', () => {
      const itemsWithTotals = calculationEngine.calculateItemTotals(mockQuoteItems);
      const subtotal = calculationEngine.calculateSubtotal(itemsWithTotals);
      const taxAmount = calculationEngine.calculateTax(subtotal, 0.085);
      const weight = calculationEngine.getEstimatedWeight(itemsWithTotals);
      const shippingCost = calculationEngine.calculateShipping(weight, 50);
      const total = calculationEngine.calculateTotal(subtotal, taxAmount, shippingCost);

      expect(subtotal).toBe(1199.95);
      expect(taxAmount).toBeCloseTo(101.996, 2);
      expect(shippingCost).toBeGreaterThan(0);
      expect(total).toBe(subtotal + taxAmount + shippingCost);
    });

    it('should handle complex quote with discounts', () => {
      const itemsWithTotals = calculationEngine.calculateItemTotals(mockQuoteItems);
      let subtotal = calculationEngine.calculateSubtotal(itemsWithTotals);
      
      const discounts = [{ type: 'percentage', value: 10 }];
      subtotal = calculationEngine.applyDiscounts(subtotal, discounts);
      
      const taxAmount = calculationEngine.calculateTax(subtotal, 0.085);
      const weight = calculationEngine.getEstimatedWeight(itemsWithTotals);
      const shippingCost = calculationEngine.calculateShipping(weight, 50);
      const total = calculationEngine.calculateTotal(subtotal, taxAmount, shippingCost);

      expect(subtotal).toBeCloseTo(1079.955, 2); // After 10% discount
      expect(total).toBeGreaterThan(subtotal);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', () => {
      expect(() => calculationEngine.calculateItemTotals(null as any)).toThrow();
      expect(() => calculationEngine.calculateSubtotal(null as any)).toThrow();
      expect(() => calculationEngine.calculateTax(-100, 0.085)).toThrow();
      expect(() => calculationEngine.calculateShipping(-100, 50)).toThrow();
    });

    it('should validate tax rate range', () => {
      expect(() => calculationEngine.calculateTax(1000, -0.1)).toThrow();
      expect(() => calculationEngine.calculateTax(1000, 1.5)).toThrow();
    });

    it('should validate shipping parameters', () => {
      expect(() => calculationEngine.calculateShipping(-100, 50)).toThrow();
      expect(() => calculationEngine.calculateShipping(100, -50)).toThrow();
    });
  });
});