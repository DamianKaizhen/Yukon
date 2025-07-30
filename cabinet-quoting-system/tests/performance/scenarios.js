// Artillery.io processor for custom logic and data generation

module.exports = {
  // Generate random customer data
  generateCustomerData,
  
  // Custom metrics
  trackPDFGeneration,
  trackDatabaseOperations,
  
  // Setup and teardown
  setupScenario,
  teardownScenario,
  
  // Validation functions
  validateQuoteCreation,
  validateProductSearch,
  
  // Custom variables
  setRandomVariables
};

function generateCustomerData(requestParams, context, ee, next) {
  const names = [
    'John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Davis',
    'Diana Wilson', 'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Ivy Chen'
  ];
  
  const companies = [
    'ABC Construction', 'XYZ Builders', 'Quality Homes', 'Dream Kitchens',
    'Modern Living', 'Elite Interiors', 'Custom Spaces', 'Perfect Fit'
  ];
  
  const projects = [
    'Kitchen Renovation', 'Bathroom Remodel', 'Office Makeover', 'Living Room Update',
    'Master Bedroom Refresh', 'Basement Finishing', 'Home Office Setup', 'Pantry Organization'
  ];

  context.vars.customerName = names[Math.floor(Math.random() * names.length)];
  context.vars.customerEmail = `customer${Math.floor(Math.random() * 10000)}@example.com`;
  context.vars.companyName = companies[Math.floor(Math.random() * companies.length)];
  context.vars.projectName = projects[Math.floor(Math.random() * projects.length)];
  context.vars.phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  
  return next();
}

function setRandomVariables(requestParams, context, ee, next) {
  // Set random product configurations
  context.vars.randomProductId = Math.floor(Math.random() * 10) + 1;
  context.vars.randomQuantity = Math.floor(Math.random() * 5) + 1;
  context.vars.randomWidth = Math.floor(Math.random() * 36) + 12; // 12-48 inches
  context.vars.randomHeight = Math.floor(Math.random() * 54) + 30; // 30-84 inches
  context.vars.randomDepth = Math.floor(Math.random() * 12) + 12; // 12-24 inches
  
  // Set random search terms
  const searchTerms = [
    'cabinet', 'kitchen', 'bathroom', 'base', 'wall', 'tall',
    'oak', 'maple', 'cherry', 'white', 'espresso', 'natural'
  ];
  context.vars.randomSearchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  // Set random pagination
  context.vars.randomPage = Math.floor(Math.random() * 5) + 1;
  context.vars.randomLimit = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
  
  return next();
}

function setupScenario(requestParams, context, ee, next) {
  // Initialize scenario-specific variables
  context.vars.scenarioStartTime = Date.now();
  context.vars.requestCount = 0;
  
  // Set up authentication token if needed
  if (!context.vars.authToken && context.vars.useExistingAuth) {
    context.vars.authToken = 'mock-auth-token-for-load-test';
  }
  
  return next();
}

function teardownScenario(requestParams, context, ee, next) {
  // Calculate scenario duration
  const duration = Date.now() - context.vars.scenarioStartTime;
  
  // Emit custom metrics
  ee.emit('counter', 'scenario.duration', duration);
  ee.emit('counter', 'scenario.requests.total', context.vars.requestCount);
  
  return next();
}

function trackPDFGeneration(requestParams, context, ee, next) {
  const startTime = Date.now();
  
  // Store start time for later calculation
  context.vars.pdfStartTime = startTime;
  
  return next();
}

function validateQuoteCreation(requestParams, response, context, ee, next) {
  // Increment request counter
  context.vars.requestCount = (context.vars.requestCount || 0) + 1;
  
  // Validate quote response
  if (response.statusCode === 201 && response.body) {
    try {
      const data = JSON.parse(response.body);
      
      if (data.success && data.data && data.data.quote) {
        const quote = data.data.quote;
        
        // Validate required fields
        const requiredFields = ['id', 'quoteNumber', 'subtotal', 'total', 'status'];
        const missingFields = requiredFields.filter(field => !quote[field]);
        
        if (missingFields.length === 0) {
          ee.emit('counter', 'quote.creation.success', 1);
          
          // Track quote value for business metrics
          ee.emit('histogram', 'quote.value', quote.total);
          ee.emit('counter', 'quote.items.total', quote.items ? quote.items.length : 0);
        } else {
          ee.emit('counter', 'quote.creation.validation_error', 1);
          console.error('Quote missing required fields:', missingFields);
        }
      } else {
        ee.emit('counter', 'quote.creation.invalid_response', 1);
      }
    } catch (error) {
      ee.emit('counter', 'quote.creation.parse_error', 1);
      console.error('Failed to parse quote response:', error);
    }
  } else {
    ee.emit('counter', 'quote.creation.failure', 1);
  }
  
  return next();
}

function validateProductSearch(requestParams, response, context, ee, next) {
  if (response.statusCode === 200 && response.body) {
    try {
      const data = JSON.parse(response.body);
      
      if (data.success && data.data && data.data.products) {
        const products = data.data.products;
        
        // Track search results
        ee.emit('histogram', 'search.results.count', products.length);
        ee.emit('counter', 'search.success', 1);
        
        // Track search performance
        if (products.length === 0) {
          ee.emit('counter', 'search.no_results', 1);
        } else if (products.length > 50) {
          ee.emit('counter', 'search.large_result_set', 1);
        }
        
        // Validate product data structure
        const validProducts = products.filter(product => 
          product.id && product.name && product.price && product.category
        );
        
        if (validProducts.length === products.length) {
          ee.emit('counter', 'search.valid_products', 1);
        } else {
          ee.emit('counter', 'search.invalid_products', 1);
        }
      }
    } catch (error) {
      ee.emit('counter', 'search.parse_error', 1);
    }
  } else {
    ee.emit('counter', 'search.failure', 1);
  }
  
  return next();
}

function trackDatabaseOperations(requestParams, context, ee, next) {
  // Track database operation timing
  const operationType = requestParams.url.includes('products') ? 'product_query' : 
                       requestParams.url.includes('quotes') ? 'quote_operation' :
                       requestParams.url.includes('auth') ? 'auth_operation' : 'unknown';
  
  context.vars.dbOperationType = operationType;
  context.vars.dbOperationStart = Date.now();
  
  return next();
}

// Custom function to simulate realistic user behavior
function simulateUserThinkTime(requestParams, context, ee, next) {
  // Add realistic delays between requests (1-5 seconds)
  const thinkTime = Math.floor(Math.random() * 4000) + 1000;
  
  setTimeout(() => {
    return next();
  }, thinkTime);
}

// Function to handle PDF generation timing
function handlePDFResponse(requestParams, response, context, ee, next) {
  if (context.vars.pdfStartTime) {
    const pdfGenerationTime = Date.now() - context.vars.pdfStartTime;
    
    // Emit custom metric for PDF generation time
    ee.emit('histogram', 'pdf_generation_time', pdfGenerationTime);
    
    if (response.statusCode === 200) {
      ee.emit('counter', 'pdf.generation.success', 1);
      
      // Track PDF size if available
      if (response.headers['content-length']) {
        const pdfSize = parseInt(response.headers['content-length']);
        ee.emit('histogram', 'pdf.size.bytes', pdfSize);
      }
    } else {
      ee.emit('counter', 'pdf.generation.failure', 1);
    }
    
    // Log slow PDF generations
    if (pdfGenerationTime > 10000) {
      console.warn(`Slow PDF generation: ${pdfGenerationTime}ms for quote ${context.vars.quoteId}`);
      ee.emit('counter', 'pdf.generation.slow', 1);
    }
  }
  
  return next();
}

// Function to validate authentication responses
function validateAuthResponse(requestParams, response, context, ee, next) {
  if (response.statusCode === 200 || response.statusCode === 201) {
    try {
      const data = JSON.parse(response.body);
      
      if (data.success && data.data && data.data.token) {
        ee.emit('counter', 'auth.success', 1);
        
        // Store token for subsequent requests
        context.vars.authToken = data.data.token;
        
        if (data.data.user) {
          context.vars.customerId = data.data.user.id;
        }
      } else {
        ee.emit('counter', 'auth.invalid_response', 1);
      }
    } catch (error) {
      ee.emit('counter', 'auth.parse_error', 1);
    }
  } else {
    ee.emit('counter', 'auth.failure', 1);
  }
  
  return next();
}

// Function to generate realistic quote items
function generateQuoteItems(requestParams, context, ee, next) {
  const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items
  const items = [];
  
  for (let i = 0; i < itemCount; i++) {
    items.push({
      productId: Math.floor(Math.random() * 20) + 1,
      quantity: Math.floor(Math.random() * 3) + 1,
      specifications: {
        width: Math.floor(Math.random() * 36) + 12,
        height: Math.floor(Math.random() * 54) + 30,
        depth: Math.floor(Math.random() * 12) + 12,
        material: ['Solid Wood', 'Plywood', 'MDF'][Math.floor(Math.random() * 3)],
        finish: ['Natural Oak', 'Cherry Stain', 'White Paint', 'Espresso'][Math.floor(Math.random() * 4)]
      },
      customizations: {
        hardware: ['Standard', 'Soft-close', 'Touch-latch'][Math.floor(Math.random() * 3)]
      }
    });
  }
  
  context.vars.quoteItems = items;
  return next();
}