describe('Customer Quote Journey - End-to-End', () => {
  const testCustomer = {
    name: 'John Cypress',
    email: 'john.cypress@example.com',
    password: 'CypressTest123!',
    phone: '+1234567890',
    company: 'Cypress Construction'
  };

  const testProject = {
    name: 'E2E Test Kitchen',
    description: 'Complete kitchen renovation for Cypress testing'
  };

  beforeEach(() => {
    // Visit the homepage
    cy.visit('/');
    
    // Clear any existing data
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Customer Registration and Authentication', () => {
    it('should allow new customer registration', () => {
      cy.get('[data-cy="register-link"]').click();
      
      cy.get('[data-cy="name-input"]').type(testCustomer.name);
      cy.get('[data-cy="email-input"]').type(testCustomer.email);
      cy.get('[data-cy="password-input"]').type(testCustomer.password);
      cy.get('[data-cy="phone-input"]').type(testCustomer.phone);
      cy.get('[data-cy="company-input"]').type(testCustomer.company);
      
      cy.get('[data-cy="register-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="welcome-message"]').should('contain', testCustomer.name);
    });

    it('should allow customer login', () => {
      // First register the user
      cy.registerCustomer(testCustomer);
      
      // Then test login
      cy.visit('/login');
      
      cy.get('[data-cy="email-input"]').type(testCustomer.email);
      cy.get('[data-cy="password-input"]').type(testCustomer.password);
      cy.get('[data-cy="login-button"]').click();
      
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="user-menu"]').should('contain', testCustomer.name);
    });

    it('should handle invalid login credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-cy="email-input"]').type('invalid@example.com');
      cy.get('[data-cy="password-input"]').type('wrongpassword');
      cy.get('[data-cy="login-button"]').click();
      
      cy.get('[data-cy="error-message"]').should('contain', 'Invalid credentials');
      cy.url().should('include', '/login');
    });
  });

  describe('Product Catalog Browsing', () => {
    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
    });

    it('should browse product catalog', () => {
      cy.get('[data-cy="catalog-link"]').click();
      
      cy.url().should('include', '/catalog');
      cy.get('[data-cy="product-grid"]').should('be.visible');
      cy.get('[data-cy="product-card"]').should('have.length.greaterThan', 0);
    });

    it('should filter products by category', () => {
      cy.visit('/catalog');
      
      cy.get('[data-cy="category-filter"]').select('Kitchen Cabinets');
      cy.get('[data-cy="product-card"]').each(($card) => {
        cy.wrap($card).find('[data-cy="product-category"]').should('contain', 'Kitchen');
      });
    });

    it('should search for products', () => {
      cy.visit('/catalog');
      
      cy.get('[data-cy="search-input"]').type('base cabinet');
      cy.get('[data-cy="search-button"]').click();
      
      cy.get('[data-cy="product-card"]').should('have.length.greaterThan', 0);
      cy.get('[data-cy="product-card"]').first().should('contain', 'Base');
    });

    it('should view product details', () => {
      cy.visit('/catalog');
      
      cy.get('[data-cy="product-card"]').first().click();
      
      cy.url().should('include', '/products/');
      cy.get('[data-cy="product-details"]').should('be.visible');
      cy.get('[data-cy="product-specifications"]').should('be.visible');
      cy.get('[data-cy="add-to-cart-button"]').should('be.visible');
    });
  });

  describe('Quote Building Process', () => {
    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
    });

    it('should add products to cart and build quote', () => {
      // Add products to cart
      cy.visit('/catalog');
      
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.get('[data-cy="cart-notification"]').should('contain', 'Added to cart');
      cy.get('[data-cy="cart-count"]').should('contain', '1');
      
      // Add another product
      cy.get('[data-cy="product-card"]').eq(1).within(() => {
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.get('[data-cy="cart-count"]').should('contain', '2');
      
      // Go to quote builder
      cy.get('[data-cy="cart-icon"]').click();
      cy.get('[data-cy="build-quote-button"]').click();
      
      cy.url().should('include', '/quote-builder');
    });

    it('should complete quote builder form', () => {
      // Add products first
      cy.addProductsToCart(2);
      
      cy.visit('/quote-builder');
      
      // Fill out project information
      cy.get('[data-cy="project-name-input"]').type(testProject.name);
      cy.get('[data-cy="project-description-input"]').type(testProject.description);
      
      // Verify cart items are displayed
      cy.get('[data-cy="quote-item"]').should('have.length', 2);
      
      // Update quantities
      cy.get('[data-cy="quantity-input"]').first().clear().type('3');
      
      // Verify total updates
      cy.get('[data-cy="quote-total"]').should('be.visible');
      
      // Generate quote
      cy.get('[data-cy="generate-quote-button"]').click();
      
      cy.url().should('include', '/quotes/');
      cy.get('[data-cy="quote-details"]').should('be.visible');
    });

    it('should customize product specifications', () => {
      cy.addProductsToCart(1);
      cy.visit('/quote-builder');
      
      cy.get('[data-cy="customize-button"]').first().click();
      
      cy.get('[data-cy="width-input"]').clear().type('42');
      cy.get('[data-cy="height-input"]').clear().type('90');
      cy.get('[data-cy="finish-select"]').select('Cherry Stain');
      
      cy.get('[data-cy="save-customization"]').click();
      
      // Verify customization is applied
      cy.get('[data-cy="quote-item"]').first().should('contain', '42"');
      cy.get('[data-cy="quote-item"]').first().should('contain', 'Cherry Stain');
    });

    it('should validate required fields', () => {
      cy.addProductsToCart(1);
      cy.visit('/quote-builder');
      
      // Try to generate quote without required fields
      cy.get('[data-cy="generate-quote-button"]').click();
      
      cy.get('[data-cy="error-message"]').should('contain', 'Project name is required');
      cy.url().should('include', '/quote-builder');
    });
  });

  describe('Quote Management', () => {
    let quoteId: string;

    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
      cy.createQuote(testProject).then((id) => {
        quoteId = id;
      });
    });

    it('should view quote details', () => {
      cy.visit(`/quotes/${quoteId}`);
      
      cy.get('[data-cy="quote-number"]').should('be.visible');
      cy.get('[data-cy="quote-status"]').should('contain', 'Draft');
      cy.get('[data-cy="quote-items"]').should('be.visible');
      cy.get('[data-cy="quote-totals"]').should('be.visible');
    });

    it('should edit draft quote', () => {
      cy.visit(`/quotes/${quoteId}`);
      
      cy.get('[data-cy="edit-quote-button"]').click();
      
      cy.get('[data-cy="project-name-input"]').clear().type('Updated Project Name');
      cy.get('[data-cy="save-changes-button"]').click();
      
      cy.get('[data-cy="success-message"]').should('contain', 'Quote updated');
      cy.get('[data-cy="project-name"]').should('contain', 'Updated Project Name');
    });

    it('should finalize quote', () => {
      cy.visit(`/quotes/${quoteId}`);
      
      cy.get('[data-cy="finalize-quote-button"]').click();
      cy.get('[data-cy="confirm-finalize"]').click();
      
      cy.get('[data-cy="quote-status"]').should('contain', 'Finalized');
      cy.get('[data-cy="edit-quote-button"]').should('not.exist');
    });

    it('should download PDF quote', () => {
      // Finalize quote first
      cy.finalizeQuote(quoteId);
      
      cy.visit(`/quotes/${quoteId}`);
      
      cy.get('[data-cy="download-pdf-button"]').click();
      
      // Verify PDF download
      cy.verifyDownload('quote-', '.pdf');
    });

    it('should email quote', () => {
      cy.finalizeQuote(quoteId);
      cy.visit(`/quotes/${quoteId}`);
      
      cy.get('[data-cy="email-quote-button"]').click();
      
      cy.get('[data-cy="email-modal"]').should('be.visible');
      cy.get('[data-cy="recipient-email"]').type('client@example.com');
      cy.get('[data-cy="email-message"]').type('Please review the attached quote.');
      
      cy.get('[data-cy="send-email-button"]').click();
      
      cy.get('[data-cy="success-message"]').should('contain', 'Quote emailed successfully');
    });
  });

  describe('Customer Dashboard', () => {
    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
    });

    it('should display customer dashboard', () => {
      cy.visit('/dashboard');
      
      cy.get('[data-cy="dashboard-header"]').should('contain', 'Welcome');
      cy.get('[data-cy="quotes-summary"]').should('be.visible');
      cy.get('[data-cy="recent-activity"]').should('be.visible');
    });

    it('should list customer quotes', () => {
      // Create some test quotes
      cy.createQuote(testProject);
      cy.createQuote({ ...testProject, name: 'Second Project' });
      
      cy.visit('/dashboard');
      
      cy.get('[data-cy="quotes-list"]').should('be.visible');
      cy.get('[data-cy="quote-item"]').should('have.length.greaterThan', 1);
    });

    it('should navigate to quote from dashboard', () => {
      cy.createQuote(testProject).then((quoteId) => {
        cy.visit('/dashboard');
        
        cy.get('[data-cy="quote-item"]').first().click();
        
        cy.url().should('include', `/quotes/${quoteId}`);
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
    });

    it('should work on mobile devices', () => {
      cy.viewport('iphone-x');
      
      cy.visit('/catalog');
      
      cy.get('[data-cy="mobile-menu-button"]').should('be.visible');
      cy.get('[data-cy="product-grid"]').should('be.visible');
      
      // Test mobile navigation
      cy.get('[data-cy="mobile-menu-button"]').click();
      cy.get('[data-cy="mobile-nav"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      
      cy.visit('/quote-builder');
      
      cy.get('[data-cy="quote-builder-form"]').should('be.visible');
      cy.get('[data-cy="quote-summary-sidebar"]').should('be.visible');
    });
  });

  describe('Performance and Accessibility', () => {
    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
    });

    it('should load pages within acceptable time', () => {
      const startTime = Date.now();
      
      cy.visit('/catalog');
      
      cy.get('[data-cy="product-grid"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 seconds
      });
    });

    it('should be accessible', () => {
      cy.visit('/catalog');
      
      // Check for accessibility violations
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should handle network errors gracefully', () => {
      // Simulate network failure
      cy.intercept('GET', '/api/v1/products', { forceNetworkError: true });
      
      cy.visit('/catalog');
      
      cy.get('[data-cy="error-message"]').should('contain', 'Unable to load products');
      cy.get('[data-cy="retry-button"]').should('be.visible');
    });
  });

  describe('Data Validation and Edge Cases', () => {
    beforeEach(() => {
      cy.registerAndLogin(testCustomer);
    });

    it('should handle empty cart', () => {
      cy.visit('/quote-builder');
      
      cy.get('[data-cy="empty-cart-message"]').should('contain', 'No items in your quote');
      cy.get('[data-cy="add-products-button"]').should('be.visible');
    });

    it('should validate email format', () => {
      cy.visit('/register');
      
      cy.get('[data-cy="email-input"]').type('invalid-email');
      cy.get('[data-cy="register-button"]').click();
      
      cy.get('[data-cy="error-message"]').should('contain', 'Invalid email format');
    });

    it('should handle large quantities', () => {
      cy.addProductsToCart(1);
      cy.visit('/quote-builder');
      
      cy.get('[data-cy="quantity-input"]').first().clear().type('999');
      
      cy.get('[data-cy="quantity-warning"]').should('contain', 'Large quantity');
    });

    it('should handle special characters in project names', () => {
      cy.addProductsToCart(1);
      cy.visit('/quote-builder');
      
      const specialName = 'Project with "special" & symbols!';
      cy.get('[data-cy="project-name-input"]').type(specialName);
      cy.get('[data-cy="generate-quote-button"]').click();
      
      cy.get('[data-cy="project-name"]').should('contain', specialName);
    });
  });
});