# Cabinet Quoting System - Frontend

A modern React/Next.js application for browsing cabinets, building quotes, and managing customer orders.

## Features

### 🏠 Core Functionality
- **Cabinet Catalog**: Browse and search through 1,635+ cabinet products
- **Advanced Filtering**: Filter by category, type, dimensions, price, finish, and material
- **Product Details**: Comprehensive product specifications and pricing
- **Quote Builder**: Interactive cart and quote generation system
- **Responsive Design**: Mobile-first design with Tailwind CSS

### 🎨 UI/UX
- **shadcn/ui Components**: Professional, accessible component library
- **Dark/Light Theme**: Theme switching with next-themes
- **Smooth Animations**: Framer Motion and Tailwind CSS animations
- **Loading States**: Skeleton components and progress indicators
- **Toast Notifications**: User feedback with Sonner

### 🔧 Technical Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand (cart, auth)
- **API Integration**: React Query + Axios
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites
- Node.js 20+ 
- Backend API running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

3. Start development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── catalog/           # Product catalog pages
│   ├── products/[id]/     # Product detail pages
│   ├── quote-builder/     # Quote builder interface
│   └── layout.tsx         # Root layout with header
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui base components
│   ├── catalog/          # Catalog-specific components
│   ├── product/          # Product detail components
│   ├── quote-builder/    # Quote builder components
│   └── layout/           # Layout components (header, etc.)
├── lib/                  # Utilities and API client
├── stores/               # Zustand state stores
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks
```

## Key Components

### Cabinet Catalog (`/catalog`)
- **Search & Filters**: Real-time search with advanced filtering
- **Product Grid**: Responsive grid with loading states
- **Pagination**: Handle large product datasets

### Product Details (`/products/[id]`)
- **Variant Selection**: Choose finish and material options
- **Dynamic Pricing**: Real-time price updates
- **Add to Cart**: Shopping cart integration

### Quote Builder (`/quote-builder`)
- **Cart Management**: Add, remove, update quantities
- **Price Calculation**: Real-time totals with tax
- **Quote Generation**: Save and export quotes

## State Management

### Cart Store (Zustand)
```typescript
interface CartStore {
  cart: Cart
  addItem: (product, variant, material, quantity, price) => void
  removeItem: (variantId, materialId) => void
  updateQuantity: (variantId, materialId, quantity) => void
  clearCart: () => void
}
```

### Auth Store (Zustand)
```typescript
interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (email, password) => Promise<void>
  logout: () => Promise<void>
}
```

## API Integration

### Product API
- `GET /products/catalog` - Browse products with filters
- `GET /products/search` - Search products
- `GET /products/{id}` - Get product details
- `GET /products/filters` - Get filter options

### Quote API  
- `POST /quotes` - Create new quote
- `GET /quotes` - List customer quotes
- `PUT /quotes/{id}` - Update quote

## Styling

### Tailwind CSS
Custom utility classes for cabinet-specific layouts:
```css
.cabinet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.cabinet-card-hover {
  transition: all 0.2s ease-in-out;
}
```

### shadcn/ui Theme
Customizable design system with CSS variables:
```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 96%;
  /* ... */
}
```

## Performance

### Optimization Features
- **React Query**: Efficient data fetching and caching
- **Dynamic Imports**: Code splitting for better load times
- **Image Optimization**: Next.js automatic image optimization
- **Bundle Analysis**: Monitor and optimize bundle size

### SEO & Accessibility
- **Metadata API**: Dynamic meta tags and Open Graph
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA Labels**: Screen reader accessibility
- **Keyboard Navigation**: Full keyboard support

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code linting with Prettier
- **Pre-commit Hooks**: Automatic formatting

## Backend Integration

The frontend connects to the Cabinet Quoting System backend API:
- **Base URL**: http://localhost:3001/api/v1
- **Authentication**: JWT tokens in localStorage
- **Error Handling**: Automatic retry and user feedback

## Future Enhancements

### Planned Features
- **User Authentication**: Customer login and registration
- **Customer Dashboard**: Order history and saved quotes
- **Advanced Quote Builder**: Drag-and-drop room layout
- **Real-time Updates**: WebSocket integration
- **Progressive Web App**: Offline capabilities

### Technical Improvements
- **Testing**: Jest + Testing Library setup
- **E2E Testing**: Playwright integration
- **Performance Monitoring**: Real User Monitoring
- **Analytics**: User behavior tracking

## Contributing

1. Follow TypeScript strict mode
2. Use shadcn/ui components when possible
3. Implement responsive design (mobile-first)
4. Add proper loading states and error handling
5. Write meaningful commit messages

## License

This project is part of the Cabinet Quoting System suite and is proprietary software.