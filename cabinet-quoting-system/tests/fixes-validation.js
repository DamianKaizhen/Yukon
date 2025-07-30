#!/usr/bin/env node

/**
 * Cabinet Quoting System - Fixes Validation Test Suite
 * 
 * This script validates the two critical fixes made to the system:
 * 1. Product Details Fix: Temporal dead zone error resolution in product-details.tsx
 * 2. Catalog Pagination Fix: Default limit change from 24 to 100 in catalog-content.tsx
 * 
 * Tests both backend API and frontend behavior to ensure system integration.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3002';
const FRONTEND_URL = 'http://localhost:3000';
const API_PREFIX = '/api/v1';

// Test Results Storage
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Utility functions
function logTest(name, status, message, details = null) {
  const test = {
    name,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  results.tests.push(test);
  results.summary.total++;
  results.summary[status]++;
  
  const statusEmoji = {
    passed: '✅',
    failed: '❌',
    skipped: '⏭️'
  };
  
  console.log(`${statusEmoji[status]} ${name}: ${message}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: 10000,
      ...options
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status || 'unknown',
      data: error.response?.data || null
    };
  }
}

// Test Suite
class FixValidationTests {
  
  async testBackendConnectivity() {
    console.log('\n=== Backend Connectivity Tests ===');
    
    const result = await makeRequest(`${BASE_URL}${API_PREFIX}/products?limit=1`);
    
    if (result.success) {
      logTest(
        'Backend API Connectivity',
        'passed',
        'Successfully connected to backend API',
        { responseTime: 'Under 10s', dataReceived: !!result.data }
      );
      return true;
    } else {
      logTest(
        'Backend API Connectivity',
        'failed',
        `Failed to connect to backend: ${result.error}`,
        { status: result.status, error: result.error }
      );
      return false;
    }
  }

  async testCatalogPaginationFix() {
    console.log('\n=== Catalog Pagination Fix Tests ===');
    
    // Test 1: Verify 100 products are returned by default
    const defaultResult = await makeRequest(`${BASE_URL}${API_PREFIX}/products`);
    
    if (defaultResult.success) {
      const productCount = defaultResult.data.data?.length || 0;
      const expectedMin = 100; // Should be getting 100 products now instead of 24
      
      if (productCount >= expectedMin) {
        logTest(
          'Default Product Limit Fix',
          'passed',
          `Returns ${productCount} products (≥${expectedMin}) - pagination fix successful`,
          { 
            actualCount: productCount,
            expectedMinimum: expectedMin,
            totalAvailable: defaultResult.data.meta?.total
          }
        );
      } else {
        logTest(
          'Default Product Limit Fix',
          'failed',
          `Only returns ${productCount} products, expected ≥${expectedMin}`,
          { 
            actualCount: productCount,
            expectedMinimum: expectedMin,
            totalAvailable: defaultResult.data.meta?.total
          }
        );
      }
    } else {
      logTest(
        'Default Product Limit Fix',
        'failed',
        `API request failed: ${defaultResult.error}`,
        defaultResult
      );
    }

    // Test 2: Verify explicit limit=100 works
    const explicitResult = await makeRequest(`${BASE_URL}${API_PREFIX}/products?limit=100`);
    
    if (explicitResult.success) {
      const productCount = explicitResult.data.data?.length || 0;
      
      if (productCount === 100) {
        logTest(
          'Explicit Limit 100',
          'passed',
          `Correctly returns exactly 100 products when limit=100`,
          { actualCount: productCount }
        );
      } else {
        logTest(
          'Explicit Limit 100',
          'failed',
          `Returns ${productCount} products instead of 100`,
          { actualCount: productCount }
        );
      }
    } else {
      logTest(
        'Explicit Limit 100',
        'failed',
        `API request failed: ${explicitResult.error}`,
        explicitResult
      );
    }

    // Test 3: Verify total product count
    const metaData = defaultResult.success ? defaultResult.data.meta : null;
    if (metaData && metaData.total) {
      const totalProducts = metaData.total;
      const expectedTotal = 324; // Based on CSV import
      
      if (totalProducts === expectedTotal) {
        logTest(
          'Total Product Count Verification',
          'passed',
          `Database contains ${totalProducts} products as expected`,
          { totalProducts, expectedTotal }
        );
      } else {
        logTest(
          'Total Product Count Verification',
          'failed',
          `Database contains ${totalProducts} products, expected ${expectedTotal}`,
          { totalProducts, expectedTotal }
        );
      }
    } else {
      logTest(
        'Total Product Count Verification',
        'skipped',
        'Could not retrieve meta data for total count verification'
      );
    }
  }

  async testProductDetailsCodeStructure() {
    console.log('\n=== Product Details Fix Tests ===');
    
    // Test 1: Check file structure for temporal dead zone fix
    const productDetailsPath = path.join(__dirname, '../frontend/src/components/product-details.tsx');
    
    try {
      const fileContent = fs.readFileSync(productDetailsPath, 'utf8');
      
      // Look for the selectedVariant declaration and its usage in useEffect
      const selectedVariantDeclarationMatch = fileContent.match(/const selectedVariant = .+/);
      const useEffectMatches = [...fileContent.matchAll(/useEffect\(\(\) => \{[\s\S]*?\}, \[[\s\S]*?\]\)/g)];
      
      if (selectedVariantDeclarationMatch) {
        const declarationLineNumber = fileContent.substring(0, selectedVariantDeclarationMatch.index).split('\n').length;
        
        // Find useEffect that uses selectedVariant
        let useEffectLineNumber = null;
        for (const match of useEffectMatches) {
          if (match[0].includes('selectedVariant')) {
            useEffectLineNumber = fileContent.substring(0, match.index).split('\n').length;
            break;
          }
        }
        
        if (useEffectLineNumber && declarationLineNumber < useEffectLineNumber) {
          logTest(
            'Temporal Dead Zone Fix - Code Structure',
            'passed',
            `selectedVariant declared at line ${declarationLineNumber}, used in useEffect at line ${useEffectLineNumber}`,
            { 
              declarationLine: declarationLineNumber,
              useEffectLine: useEffectLineNumber,
              fixApplied: true
            }
          );
        } else {
          logTest(
            'Temporal Dead Zone Fix - Code Structure',
            'failed',
            `selectedVariant declaration ordering issue still exists`,
            { 
              declarationLine: declarationLineNumber,
              useEffectLine: useEffectLineNumber
            }
          );
        }
      } else {
        logTest(
          'Temporal Dead Zone Fix - Code Structure',
          'failed',
          'Could not find selectedVariant declaration in product-details.tsx'
        );
      }
      
    } catch (error) {
      logTest(
        'Temporal Dead Zone Fix - Code Structure',
        'failed',
        `Error reading product-details.tsx: ${error.message}`
      );
    }
  }

  async testProductDetailsAPIIntegration() {
    console.log('\n=== Product Details API Integration Tests ===');
    
    // Test with a real product ID from the catalog
    const catalogResult = await makeRequest(`${BASE_URL}${API_PREFIX}/products?limit=1`);
    
    if (!catalogResult.success || !catalogResult.data.data?.length) {
      logTest(
        'Product Details API Integration',
        'skipped',
        'No products available to test product details endpoint'
      );
      return;
    }
    
    const sampleProductId = catalogResult.data.data[0].id;
    const productResult = await makeRequest(`${BASE_URL}${API_PREFIX}/products/${sampleProductId}`);
    
    if (productResult.success) {
      const product = productResult.data.data;
      
      // Verify product has required fields for the component
      const requiredFields = ['id', 'name', 'variants', 'width', 'height', 'depth'];
      const missingFields = requiredFields.filter(field => !product[field]);
      
      if (missingFields.length === 0) {
        logTest(
          'Product Details Data Structure',
          'passed',
          'Product details endpoint returns all required fields',
          { 
            productId: sampleProductId,
            productName: product.name,
            variantCount: product.variants?.length || 0
          }
        );
      } else {
        logTest(
          'Product Details Data Structure',
          'failed',
          `Missing required fields: ${missingFields.join(', ')}`,
          { productId: sampleProductId, missingFields }
        );
      }
      
      // Test variant structure
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants[0];
        const variantRequiredFields = ['id', 'sku', 'color_option_id', 'pricing'];
        const variantMissingFields = variantRequiredFields.filter(field => !variant[field]);
        
        if (variantMissingFields.length === 0) {
          logTest(
            'Product Variant Data Structure',
            'passed',
            'Product variants have all required fields',
            { 
              variantId: variant.id,
              pricingOptions: variant.pricing?.length || 0
            }
          );
        } else {
          logTest(
            'Product Variant Data Structure',
            'failed',
            `Variant missing fields: ${variantMissingFields.join(', ')}`,
            { variantId: variant.id, variantMissingFields }
          );
        }
      } else {
        logTest(
          'Product Variant Data Structure',
          'failed',
          'Product has no variants available',
          { productId: sampleProductId }
        );
      }
      
    } else {
      logTest(
        'Product Details API Integration',
        'failed',
        `Failed to fetch product details: ${productResult.error}`,
        { productId: sampleProductId, error: productResult.error }
      );
    }
  }

  async testFrontendCatalogContent() {
    console.log('\n=== Frontend Catalog Content Tests ===');
    
    // Test the catalog-content.tsx file structure
    const catalogContentPath = path.join(__dirname, '../frontend/src/components/catalog/catalog-content.tsx');
    
    try {
      const fileContent = fs.readFileSync(catalogContentPath, 'utf8');
      
      // Look for the limit parameter fix
      const limitMatch = fileContent.match(/limit:\s*parseInt\(searchParams\.get\('limit'\)\s*\|\|\s*'(\d+)'\)/);
      
      if (limitMatch) {
        const defaultLimit = parseInt(limitMatch[1]);
        
        if (defaultLimit >= 100) {
          logTest(
            'Catalog Default Limit Fix - Code Structure',
            'passed',
            `Default limit changed to ${defaultLimit} in catalog-content.tsx`,
            { defaultLimit, fixApplied: true }
          );
        } else {
          logTest(
            'Catalog Default Limit Fix - Code Structure',
            'failed',
            `Default limit is still ${defaultLimit}, should be ≥100`,
            { defaultLimit, fixApplied: false }
          );
        }
      } else {
        logTest(
          'Catalog Default Limit Fix - Code Structure',
          'failed',
          'Could not find limit parameter configuration in catalog-content.tsx'
        );
      }
      
    } catch (error) {
      logTest(
        'Catalog Default Limit Fix - Code Structure',
        'failed',
        `Error reading catalog-content.tsx: ${error.message}`
      );
    }
  }

  async testSystemIntegration() {
    console.log('\n=== System Integration Tests ===');
    
    // Test that both fixes work together
    const catalogResult = await makeRequest(`${BASE_URL}${API_PREFIX}/products?limit=100`);
    
    if (catalogResult.success && catalogResult.data.data?.length > 0) {
      const products = catalogResult.data.data;
      const sampleProduct = products[0];
      
      // Test product details for a product from the paginated catalog
      const detailsResult = await makeRequest(`${BASE_URL}${API_PREFIX}/products/${sampleProduct.id}`);
      
      if (detailsResult.success) {
        logTest(
          'Catalog to Product Details Integration',
          'passed',
          'Can successfully navigate from catalog (with 100+ products) to product details',
          { 
            catalogProductCount: products.length,
            productId: sampleProduct.id,
            productName: sampleProduct.name
          }
        );
      } else {
        logTest(
          'Catalog to Product Details Integration',
          'failed',
          `Product details failed for catalog product: ${detailsResult.error}`,
          { productId: sampleProduct.id }
        );
      }
    } else {
      logTest(
        'Catalog to Product Details Integration',
        'failed',
        'Could not retrieve products from catalog for integration test'
      );
    }
  }

  async runAllTests() {
    console.log('🧪 Cabinet Quoting System - Fixes Validation Test Suite');
    console.log('==================================================\n');
    
    // Run all test suites
    const backendConnected = await this.testBackendConnectivity();
    
    if (backendConnected) {
      await this.testCatalogPaginationFix();
      await this.testProductDetailsAPIIntegration();
      await this.testSystemIntegration();
    }
    
    // Always test frontend code structure (doesn't require backend)
    await this.testProductDetailsCodeStructure();
    await this.testFrontendCatalogContent();
    
    // Generate summary
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⏭️ Skipped: ${results.summary.skipped}`);
    console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
    
    // Save detailed results
    const reportPath = path.join(__dirname, 'fixes-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return results;
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new FixValidationTests();
  testSuite.runAllTests().then(results => {
    process.exit(results.summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = FixValidationTests;