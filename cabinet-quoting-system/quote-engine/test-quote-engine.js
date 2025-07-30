#!/usr/bin/env node

/**
 * Test script for Quote Engine functionality
 * This script tests the core calculation and PDF generation features
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3002/api/v1';

// Sample quote request data
const sampleQuoteRequest = {
  customer_id: 'customer-123e4567-e89b-12d3-a456-426614174000',
  items: [
    {
      product_variant_id: 'variant-123e4567-e89b-12d3-a456-426614174001',
      box_material_id: 'material-123e4567-e89b-12d3-a456-426614174002',
      quantity: 5,
      discount_percent: 10,
      notes: 'Base cabinets for kitchen'
    },
    {
      product_variant_id: 'variant-123e4567-e89b-12d3-a456-426614174003',
      box_material_id: 'material-123e4567-e89b-12d3-a456-426614174004',
      quantity: 3,
      notes: 'Wall cabinets'
    }
  ],
  shipping_address: {
    address_line1: '123 Main Street',
    city: 'Vancouver',
    state_province: 'BC',
    postal_code: 'V6B 1A1',
    country: 'Canada'
  },
  apply_tax: true,
  customer_discount_tier: 'contractor',
  notes: 'Kitchen renovation project - urgent delivery needed',
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};

async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testQuoteValidation() {
  console.log('\\n🔍 Testing quote validation...');
  try {
    const response = await axios.post(`${BASE_URL}/quotes/validate`, sampleQuoteRequest);
    console.log('✅ Quote validation passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Quote validation failed:', error.response?.data || error.message);
    return false;
  }
}

async function testQuoteCalculation() {
  console.log('\\n🧮 Testing quote calculation...');
  try {
    const response = await axios.post(`${BASE_URL}/quotes/calculate`, sampleQuoteRequest);
    console.log('✅ Quote calculation successful!');
    console.log('📊 Quote Summary:');
    console.log(`   - Customer: ${response.data.data.customer.first_name} ${response.data.data.customer.last_name}`);
    console.log(`   - Line Items: ${response.data.data.line_items.length}`);
    console.log(`   - Subtotal: $${response.data.data.subtotal.toFixed(2)}`);
    console.log(`   - Tax: $${response.data.data.tax_summary.tax_amount.toFixed(2)} (${(response.data.data.tax_summary.tax_rate * 100).toFixed(2)}%)`);
    console.log(`   - Shipping: $${response.data.data.shipping_summary.total_shipping_cost.toFixed(2)}`);
    console.log(`   - Total: $${response.data.data.total_amount.toFixed(2)}`);
    console.log(`   - Valid Until: ${response.data.data.valid_until}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Quote calculation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testPDFGeneration(quoteCalculation) {
  console.log('\\n📄 Testing PDF generation...');
  try {
    const pdfRequest = {
      quote_calculation: quoteCalculation,
      template_type: 'detailed',
      include_terms: true,
      include_installation_guide: true,
      watermark: 'SAMPLE'
    };

    const response = await axios.post(`${BASE_URL}/quotes/pdf`, pdfRequest);
    console.log('✅ PDF generation successful!');
    console.log('📋 PDF Details:');
    console.log(`   - PDF ID: ${response.data.data.pdf_id}`);
    console.log(`   - File Size: ${response.data.data.file_size} bytes`);
    console.log(`   - Pages: ${response.data.data.pages}`);
    console.log(`   - Download URL: ${response.data.data.download_url}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ PDF generation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCalculateAndPDF() {
  console.log('\\n🚀 Testing combined calculate and PDF generation...');
  try {
    const combinedRequest = {
      ...sampleQuoteRequest,
      template_type: 'standard',
      include_terms: true,
      watermark: 'DEMO'
    };

    const response = await axios.post(`${BASE_URL}/quotes/calculate-and-pdf`, combinedRequest);
    console.log('✅ Combined operation successful!');
    console.log('📊 Results:');
    console.log(`   - Quote Total: $${response.data.data.calculation.total_amount.toFixed(2)}`);
    console.log(`   - PDF ID: ${response.data.data.pdf.pdf_id}`);
    console.log(`   - Processing Time: ${response.data.meta.processing_time}ms`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Combined operation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCalculationBreakdown() {
  console.log('\\n🔍 Testing calculation breakdown...');
  try {
    const response = await axios.post(`${BASE_URL}/quotes/breakdown`, sampleQuoteRequest);
    console.log('✅ Calculation breakdown generated!');
    console.log('📈 Breakdown Details:');
    
    response.data.data.line_items_breakdown.forEach((item, index) => {
      console.log(`   Item ${index + 1}:`);
      console.log(`     - Product: ${item.product}`);
      console.log(`     - Quantity: ${item.quantity}`);
      console.log(`     - Unit Price: $${item.unit_price.toFixed(2)}`);
      console.log(`     - Line Total: $${item.line_total.toFixed(2)}`);
      if (item.discounts.length > 0) {
        console.log(`     - Discounts: ${item.discounts.map(d => d.description).join(', ')}`);
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Calculation breakdown failed:', error.response?.data || error.message);
    return null;
  }
}

async function testInvalidRequest() {
  console.log('\\n❌ Testing invalid request handling...');
  try {
    const invalidRequest = {
      customer_id: 'invalid-uuid',
      items: [] // Empty items array should fail
    };

    const response = await axios.post(`${BASE_URL}/quotes/calculate`, invalidRequest);
    console.log('❌ Should have failed but didn\\'t:', response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid request properly rejected:', error.response.data.message);
      return true;
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('🧪 Starting Quote Engine Test Suite');
  console.log('==========================================\\n');

  const results = [];

  // Test 1: Health Check
  results.push(await testHealthCheck());

  // Test 2: Quote Validation
  results.push(await testQuoteValidation());

  // Test 3: Quote Calculation
  const quoteCalculation = await testQuoteCalculation();
  results.push(!!quoteCalculation);

  // Test 4: PDF Generation (only if calculation succeeded)
  if (quoteCalculation) {
    results.push(!!(await testPDFGeneration(quoteCalculation)));
  } else {
    results.push(false);
    console.log('\\n⏭️  Skipping PDF generation test (calculation failed)');
  }

  // Test 5: Combined Calculate and PDF
  results.push(!!(await testCalculateAndPDF()));

  // Test 6: Calculation Breakdown
  results.push(!!(await testCalculationBreakdown()));

  // Test 7: Invalid Request Handling
  results.push(await testInvalidRequest());

  // Summary
  console.log('\\n==========================================');
  console.log('🧪 Test Results Summary');
  console.log('==========================================');
  
  const testNames = [
    'Health Check',
    'Quote Validation',
    'Quote Calculation',
    'PDF Generation',
    'Calculate & PDF',
    'Calculation Breakdown',
    'Invalid Request Handling'
  ];

  let passedTests = 0;
  results.forEach((result, index) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testNames[index]}`);
    if (result) passedTests++;
  });

  console.log(`\\n📊 Overall Result: ${passedTests}/${results.length} tests passed`);
  
  if (passedTests === results.length) {
    console.log('🎉 All tests passed! Quote Engine is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the error messages above.');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Quote Engine Test Script

Usage: node test-quote-engine.js [options]

Options:
  --help, -h     Show this help message
  --health       Run only health check
  --calc         Run only calculation test
  --pdf          Run only PDF generation test (requires running server)

Examples:
  node test-quote-engine.js                  # Run all tests
  node test-quote-engine.js --health         # Health check only
  node test-quote-engine.js --calc           # Calculation test only

Make sure the Quote Engine server is running on port 3002 before running tests.
  `);
  process.exit(0);
}

// Run specific tests based on arguments
if (process.argv.includes('--health')) {
  testHealthCheck().then(result => process.exit(result ? 0 : 1));
} else if (process.argv.includes('--calc')) {
  testQuoteCalculation().then(result => process.exit(result ? 0 : 1));
} else if (process.argv.includes('--pdf')) {
  testQuoteCalculation()
    .then(calc => calc ? testPDFGeneration(calc) : null)
    .then(result => process.exit(result ? 0 : 1));
} else {
  // Run all tests
  runAllTests().then(() => {
    console.log('\\n✨ Test suite completed.');
    process.exit(0);
  }).catch(error => {
    console.error('\\n💥 Test suite crashed:', error.message);
    process.exit(1);
  });
}