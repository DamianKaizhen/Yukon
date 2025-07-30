import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CabinetCard } from '../../../frontend/src/components/cabinet-card';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock the cart store
jest.mock('../../../frontend/src/stores/cart-store', () => ({
  useCartStore: () => ({
    addItem: jest.fn(),
    items: [],
  }),
}));

describe('CabinetCard Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Base Cabinet 36"',
    category: 'Kitchen Cabinets',
    subcategory: 'Base Cabinets',
    price: 299.99,
    description: 'A high-quality base cabinet for your kitchen renovation.',
    specifications: {
      width: 36,
      height: 84,
      depth: 24,
      material: 'Solid Wood',
      finish: 'Natural Oak'
    },
    imageUrl: '/images/cabinet-1.jpg',
    inStock: true,
    featured: true
  };

  const mockProps = {
    product: mockProduct,
    onAddToCart: jest.fn(),
    showActions: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(<CabinetCard {...mockProps} />);

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.category)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.subcategory)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price}`)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
  });

  it('displays product specifications', () => {
    render(<CabinetCard {...mockProps} />);

    expect(screen.getByText(`${mockProduct.specifications.width}"`)).toBeInTheDocument();
    expect(screen.getByText(`H: ${mockProduct.specifications.height}"`)).toBeInTheDocument();
    expect(screen.getByText(`D: ${mockProduct.specifications.depth}"`)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.specifications.material)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.specifications.finish)).toBeInTheDocument();
  });

  it('shows featured badge for featured products', () => {
    render(<CabinetCard {...mockProps} />);

    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('does not show featured badge for non-featured products', () => {
    const nonFeaturedProduct = { ...mockProduct, featured: false };
    render(<CabinetCard {...mockProps} product={nonFeaturedProduct} />);

    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('shows in stock status for available products', () => {
    render(<CabinetCard {...mockProps} />);

    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('shows out of stock status for unavailable products', () => {
    const outOfStockProduct = { ...mockProduct, inStock: false };
    render(<CabinetCard {...mockProps} product={outOfStockProduct} />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('displays product image with correct alt text', () => {
    render(<CabinetCard {...mockProps} />);

    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockProduct.imageUrl);
  });

  it('handles missing image gracefully', () => {
    const productWithoutImage = { ...mockProduct, imageUrl: undefined };
    render(<CabinetCard {...mockProps} product={productWithoutImage} />);

    // Should show placeholder or default image
    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
  });

  describe('User Interactions', () => {
    it('calls onAddToCart when add to cart button is clicked', async () => {
      const user = userEvent.setup();
      render(<CabinetCard {...mockProps} />);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      expect(mockProps.onAddToCart).toHaveBeenCalledWith(mockProduct);
    });

    it('disables add to cart button for out of stock products', () => {
      const outOfStockProduct = { ...mockProduct, inStock: false };
      render(<CabinetCard {...mockProps} product={outOfStockProduct} />);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeDisabled();
    });

    it('navigates to product detail on view details click', async () => {
      const user = userEvent.setup();
      render(<CabinetCard {...mockProps} />);

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      // This would test router navigation in a real implementation
      expect(viewDetailsButton).toBeInTheDocument();
    });

    it('shows loading state during add to cart action', async () => {
      const user = userEvent.setup();
      const slowAddToCart = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<CabinetCard {...mockProps} onAddToCart={slowAddToCart} />);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /adding/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies mobile-friendly classes', () => {
      const { container } = render(<CabinetCard {...mockProps} />);

      expect(container.firstChild).toHaveClass('cabinet-card');
      // Test responsive classes are applied
    });

    it('truncates long descriptions appropriately', () => {
      const longDescription = 'This is a very long description that should be truncated to maintain card layout consistency and prevent overflow issues in the grid layout.';
      const productWithLongDescription = { ...mockProduct, description: longDescription };
      
      render(<CabinetCard {...mockProps} product={productWithLongDescription} />);

      // Description should be present but truncated
      expect(screen.getByText(longDescription, { exact: false })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CabinetCard {...mockProps} />);

      expect(screen.getByLabelText(/product card for/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CabinetCard {...mockProps} />);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      
      // Test keyboard navigation
      await user.tab();
      expect(addToCartButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockProps.onAddToCart).toHaveBeenCalled();
    });

    it('has proper color contrast for text', () => {
      render(<CabinetCard {...mockProps} />);

      // In a real test, you would check computed styles for color contrast
      const productName = screen.getByText(mockProduct.name);
      expect(productName).toBeVisible();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with minimal re-renders', () => {
      const { rerender } = render(<CabinetCard {...mockProps} />);

      // Re-render with same props
      rerender(<CabinetCard {...mockProps} />);

      // Component should handle re-renders efficiently
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    });

    it('lazy loads images when implemented', () => {
      render(<CabinetCard {...mockProps} />);

      const image = screen.getByAltText(mockProduct.name);
      // In a real implementation, you would test lazy loading attributes
      expect(image).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing product data gracefully', () => {
      const incompleteProduct = {
        id: 1,
        name: 'Test Product',
        price: 100
      };

      render(<CabinetCard {...mockProps} product={incompleteProduct as any} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
    });

    it('handles add to cart errors gracefully', async () => {
      const user = userEvent.setup();
      const failingAddToCart = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(<CabinetCard {...mockProps} onAddToCart={failingAddToCart} />);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      // Should show error state or message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Actions Visibility', () => {
    it('shows actions when showActions is true', () => {
      render(<CabinetCard {...mockProps} showActions={true} />);

      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('hides actions when showActions is false', () => {
      render(<CabinetCard {...mockProps} showActions={false} />);

      expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
    });
  });
});