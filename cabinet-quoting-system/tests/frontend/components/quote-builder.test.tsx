import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteBuilder } from '../../../frontend/src/components/quote-builder/quote-builder';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock cart store
const mockCartStore = {
  items: [
    {
      id: 1,
      product: {
        id: 1,
        name: 'Base Cabinet 36"',
        price: 299.99,
        category: 'Kitchen Cabinets',
        specifications: { width: 36, height: 84, depth: 24 }
      },
      quantity: 2,
      customizations: {}
    },
    {
      id: 2,
      product: {
        id: 2,
        name: 'Wall Cabinet 30"',
        price: 199.99,
        category: 'Kitchen Cabinets',
        specifications: { width: 30, height: 42, depth: 12 }
      },
      quantity: 1,
      customizations: {}
    }
  ],
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
  totalItems: 3,
  subtotal: 799.97
};

jest.mock('../../../frontend/src/stores/cart-store', () => ({
  useCartStore: () => mockCartStore,
}));

// Mock API calls
jest.mock('../../../frontend/src/lib/api', () => ({
  createQuote: jest.fn(),
  getProducts: jest.fn(),
}));

describe('QuoteBuilder Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quote builder interface', () => {
    render(<QuoteBuilder />);

    expect(screen.getByText('Quote Builder')).toBeInTheDocument();
    expect(screen.getByText('Project Information')).toBeInTheDocument();
    expect(screen.getByText('Selected Items')).toBeInTheDocument();
    expect(screen.getByText('Quote Summary')).toBeInTheDocument();
  });

  it('displays cart items correctly', () => {
    render(<QuoteBuilder />);

    expect(screen.getByText('Base Cabinet 36"')).toBeInTheDocument();
    expect(screen.getByText('Wall Cabinet 30"')).toBeInTheDocument();
    expect(screen.getByText('$299.99')).toBeInTheDocument();
    expect(screen.getByText('$199.99')).toBeInTheDocument();
  });

  it('shows empty state when no items in cart', () => {
    const emptyCartStore = { ...mockCartStore, items: [], totalItems: 0, subtotal: 0 };
    jest.mocked(require('../../../frontend/src/stores/cart-store').useCartStore).mockReturnValue(emptyCartStore);

    render(<QuoteBuilder />);

    expect(screen.getByText('No items in your quote')).toBeInTheDocument();
    expect(screen.getByText('Add products to get started')).toBeInTheDocument();
  });

  describe('Project Information Form', () => {
    it('renders all required form fields', () => {
      render(<QuoteBuilder />);

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project description/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/customer name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '123');

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });
  });

  describe('Item Management', () => {
    it('allows updating item quantities', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const quantityInput = screen.getAllByLabelText(/quantity/i)[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');

      expect(mockCartStore.updateQuantity).toHaveBeenCalledWith(1, 3);
    });

    it('prevents zero or negative quantities', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const quantityInput = screen.getAllByLabelText(/quantity/i)[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');

      await waitFor(() => {
        expect(screen.getByText(/quantity must be at least 1/i)).toBeInTheDocument();
      });
    });

    it('allows removing items from quote', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(mockCartStore.removeItem).toHaveBeenCalledWith(1);
    });

    it('shows confirmation before removing items', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(screen.getByText(/are you sure you want to remove this item/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Customizations', () => {
    it('allows adding custom specifications', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
      await user.click(customizeButtons[0]);

      expect(screen.getByText(/customize specifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/depth/i)).toBeInTheDocument();
    });

    it('validates custom dimensions', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
      await user.click(customizeButtons[0]);

      const widthInput = screen.getByLabelText(/width/i);
      await user.clear(widthInput);
      await user.type(widthInput, '0');

      const saveButton = screen.getByRole('button', { name: /save customization/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/width must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('allows selecting finishes and materials', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
      await user.click(customizeButtons[0]);

      expect(screen.getByLabelText(/finish/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/material/i)).toBeInTheDocument();
    });
  });

  describe('Quote Summary', () => {
    it('displays correct subtotal', () => {
      render(<QuoteBuilder />);

      expect(screen.getByText('$799.97')).toBeInTheDocument();
    });

    it('calculates and displays tax', () => {
      render(<QuoteBuilder />);

      // Assuming 8.5% tax rate
      const expectedTax = (799.97 * 0.085).toFixed(2);
      expect(screen.getByText(`$${expectedTax}`)).toBeInTheDocument();
    });

    it('displays total including tax', () => {
      render(<QuoteBuilder />);

      const subtotal = 799.97;
      const tax = subtotal * 0.085;
      const total = (subtotal + tax).toFixed(2);
      expect(screen.getByText(`$${total}`)).toBeInTheDocument();
    });

    it('updates totals when quantities change', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const quantityInput = screen.getAllByLabelText(/quantity/i)[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      // Mock should update the store, and totals should recalculate
      expect(mockCartStore.updateQuantity).toHaveBeenCalled();
    });
  });

  describe('Quote Generation', () => {
    it('generates quote with valid form data', async () => {
      const user = userEvent.setup();
      const mockCreateQuote = jest.mocked(require('../../../frontend/src/lib/api').createQuote);
      mockCreateQuote.mockResolvedValue({ id: 1, quoteNumber: 'Q-2024-001' });

      render(<QuoteBuilder />);

      // Fill out form
      await user.type(screen.getByLabelText(/project name/i), 'Kitchen Renovation');
      await user.type(screen.getByLabelText(/customer name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone/i), '+1234567890');

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateQuote).toHaveBeenCalledWith({
          projectName: 'Kitchen Renovation',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '+1234567890',
          items: mockCartStore.items
        });
      });
    });

    it('shows loading state during quote generation', async () => {
      const user = userEvent.setup();
      const mockCreateQuote = jest.mocked(require('../../../frontend/src/lib/api').createQuote);
      mockCreateQuote.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<QuoteBuilder />);

      // Fill out minimal form
      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      expect(screen.getByText(/generating quote/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('handles quote generation errors', async () => {
      const user = userEvent.setup();
      const mockCreateQuote = jest.mocked(require('../../../frontend/src/lib/api').createQuote);
      mockCreateQuote.mockRejectedValue(new Error('Server error'));

      render(<QuoteBuilder />);

      // Fill out form
      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate quote/i)).toBeInTheDocument();
      });
    });

    it('redirects to quote view after successful generation', async () => {
      const user = userEvent.setup();
      const mockCreateQuote = jest.mocked(require('../../../frontend/src/lib/api').createQuote);
      const mockPush = jest.fn();
      
      jest.mocked(require('next/navigation').useRouter).mockReturnValue({
        push: mockPush,
        replace: jest.fn(),
        back: jest.fn(),
      });

      mockCreateQuote.mockResolvedValue({ id: 1, quoteNumber: 'Q-2024-001' });

      render(<QuoteBuilder />);

      // Fill out form
      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/quotes/1');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<QuoteBuilder />);

      expect(screen.getByLabelText(/project name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/customer name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true');
    });

    it('announces form validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const submitButton = screen.getByRole('button', { name: /generate quote/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByText(/project name is required/i);
        expect(errorElement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<QuoteBuilder />);

      const projectNameInput = screen.getByLabelText(/project name/i);
      
      await user.tab();
      expect(projectNameInput).toHaveFocus();
      
      await user.keyboard('Test Project');
      expect(projectNameInput).toHaveValue('Test Project');
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(<QuoteBuilder />);
      
      // Test mobile-specific classes are applied
      expect(container.firstChild).toHaveClass('quote-builder');
    });

    it('shows mobile-optimized summary', () => {
      render(<QuoteBuilder />);

      // On mobile, summary might be collapsible
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();
    });
  });
});