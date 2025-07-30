# Cabinet Quote Engine Service

A comprehensive Node.js TypeScript microservice for processing cabinet quotes, generating professional PDFs, and managing the complete quote lifecycle for the Yudezign Cabinet Quoting System.

## Features

### 🧮 Quote Calculation Engine
- **Precise Calculations**: Line-item calculations with 2 decimal place precision
- **Multi-tier Pricing**: Support for ParticleBoard, Plywood, UV Birch, White materials
- **Flexible Discounts**: Percentage and fixed discounts, customer tier pricing
- **Tax Calculations**: Regional tax rates and tax exemption handling
- **Shipping Costs**: Multiple shipping methods with installation options

### 📄 PDF Generation
- **Professional Templates**: Standard, Detailed, Summary, and Contractor templates
- **Yudezign Branding**: Company logo, colors, and professional layouts
- **Dynamic Content**: Customer info, line items, terms, installation guides
- **Secure Storage**: File retention and automatic cleanup

### 📧 Email Integration
- **Automated Notifications**: Quote creation, updates, approvals, rejections
- **PDF Attachments**: Automatic PDF attachment to emails
- **Template System**: Professional HTML email templates
- **Bulk Operations**: Send multiple emails efficiently

### 🔄 Quote Versioning
- **Version Control**: Track all quote changes with detailed history
- **Change Detection**: Automatic comparison between versions
- **Audit Trail**: Complete change logs with user attribution
- **Restore Capability**: Restore previous versions when needed

### 🛡️ Production Ready
- **Comprehensive Logging**: Structured logging with correlation IDs
- **Error Handling**: Robust error handling and validation
- **Rate Limiting**: API rate limiting and request throttling
- **Health Checks**: Kubernetes-ready health endpoints
- **Configuration Management**: Environment-based configuration

## Quick Start

### Prerequisites
- Node.js 20.0.0 or higher
- TypeScript 5.3.3 or higher
- Access to the backend API service
- SMTP server for email functionality

### Installation

1. **Install Dependencies**
   ```bash
   cd quote-engine
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access the API**
   - API Base URL: `http://localhost:3002/api/v1`
   - API Documentation: `http://localhost:3002/api/v1/docs`

## API Endpoints

### Quote Processing
- `POST /api/v1/quotes/calculate` - Calculate quote with pricing
- `POST /api/v1/quotes/pdf` - Generate PDF for existing quote
- `POST /api/v1/quotes/calculate-and-pdf` - Calculate and generate PDF
- `POST /api/v1/quotes/breakdown` - Get detailed calculation breakdown
- `POST /api/v1/quotes/validate` - Validate quote request

### PDF Management
- `GET /api/v1/pdfs/{pdfId}/download` - Download PDF file
- `GET /api/v1/pdfs/{pdfId}/view` - View PDF in browser
- `GET /api/v1/pdfs/{pdfId}/info` - Get PDF metadata
- `DELETE /api/v1/pdfs/cleanup` - Clean up old PDF files

### Health & Monitoring
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health with dependencies
- `GET /api/v1/health/ready` - Kubernetes readiness probe
- `GET /api/v1/health/live` - Kubernetes liveness probe
- `GET /api/v1/health/metrics` - Service metrics

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3002
NODE_ENV=development
API_VERSION=v1

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cabinet_quoting
DATABASE_USER=cabinet_user
DATABASE_PASSWORD=cabinet_password

# Backend Service Configuration
BACKEND_API_URL=http://localhost:3001/api/v1
BACKEND_API_KEY=your-backend-api-key

# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM_NAME=Yudezign
EMAIL_FROM_ADDRESS=quotes@yudezign.com

# PDF Configuration
PDF_STORAGE_PATH=./storage/pdfs
PDF_TEMP_PATH=./storage/temp
COMPANY_LOGO_PATH=./assets/logo.png

# Business Configuration
DEFAULT_TAX_RATE=0.0875
DEFAULT_QUOTE_VALIDITY_DAYS=30
MIN_ORDER_AMOUNT=100.00
BULK_DISCOUNT_THRESHOLD=10000.00
BULK_DISCOUNT_PERCENTAGE=5.0

# Regional Tax Rates (JSON format) - Canadian provinces with GST+PST/HST
REGIONAL_TAX_RATES={"AB":0.05,"BC":0.12,"MB":0.12,"NB":0.15,"NL":0.15,"NT":0.05,"NS":0.15,"NU":0.05,"ON":0.13,"PE":0.15,"QC":0.14975,"SK":0.11,"YT":0.05}
```

## Project Structure

```
quote-engine/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # API controllers
│   ├── middleware/       # Express middleware
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic services
│   │   ├── CalculationEngine.ts      # Quote calculations
│   │   ├── PDFGenerationService.ts   # PDF generation
│   │   ├── EmailService.ts           # Email functionality
│   │   ├── BusinessRulesService.ts   # Business rules
│   │   ├── BackendApiService.ts      # Backend integration
│   │   ├── TaxCalculationService.ts  # Tax calculations
│   │   ├── ShippingCalculationService.ts # Shipping costs
│   │   └── QuoteVersioningService.ts # Version control
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── templates/       # Email and PDF templates
│   ├── app.ts          # Express application
│   └── index.ts        # Application entry point
├── storage/
│   ├── pdfs/           # Generated PDF files
│   └── temp/           # Temporary files
├── logs/               # Application logs
├── assets/             # Static assets (logos, etc.)
├── Dockerfile          # Docker configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

## Usage Examples

### Calculate Quote

```javascript
const quoteRequest = {
  customer_id: "uuid-customer-id",
  items: [
    {
      product_variant_id: "uuid-product-variant",
      box_material_id: "uuid-box-material",
      quantity: 2,
      discount_percent: 5
    }
  ],
  shipping_address: {
    address_line1: "123 Main St",
    city: "Los Angeles",
    state_province: "CA",
    postal_code: "90210",
    country: "US"
  },
  apply_tax: true,
  customer_discount_tier: "contractor"
};

// Calculate quote
const response = await fetch('/api/v1/quotes/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(quoteRequest)
});

const result = await response.json();
console.log('Quote Total:', result.data.total_amount);
```

### Generate PDF

```javascript
const pdfRequest = {
  quote_calculation: quoteCalculationData,
  template_type: "detailed",
  include_terms: true,
  include_installation_guide: false,
  custom_branding: {
    company_name: "Custom Cabinet Co",
    primary_color: "#2563eb"
  }
};

const response = await fetch('/api/v1/quotes/pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pdfRequest)
});

const result = await response.json();
console.log('PDF URL:', result.data.download_url);
```

## Business Rules

### Pricing Rules
- **Minimum Order**: $100.00
- **Price Precision**: 2 decimal places
- **Maximum Line Quantity**: 1000 units
- **Customer Tiers**: Retail, Contractor, Dealer, Wholesale

### Discount Rules
- **Maximum Discount**: 50% total
- **Bulk Discounts**: 
  - 10+ units: 2%
  - 25+ units: 5%
  - 50+ units: 8%
- **Order-level Bulk**: $10,000+ orders get 5% discount

### Tax Rules
- **Default Rate**: 8.75% (California)
- **Regional Rates**: Configurable by state/province
- **Tax Exemptions**: Customer-based exemptions supported

### Shipping Rules
- **Free Shipping**: Orders over $2,500
- **Methods**: Pickup, Standard, White Glove, Installation
- **Zones**: Local, Regional, Extended delivery areas

## Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # TypeScript type checking
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testNamePattern="CalculationEngine"
```

### Docker Support

```bash
# Build Docker image
docker build -t quote-engine .

# Run container
docker run -p 3002:3002 --env-file .env quote-engine
```

## Monitoring & Observability

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Log Rotation**: Automatic file rotation and cleanup
- **Performance Metrics**: Request timing and resource usage

### Health Checks
- **Basic Health**: Service status and uptime
- **Detailed Health**: Dependencies and configuration
- **Readiness**: Kubernetes readiness probe
- **Liveness**: Kubernetes liveness probe

### Metrics
- **Request Metrics**: Response times, status codes
- **Business Metrics**: Quote calculations, PDF generations
- **System Metrics**: Memory usage, CPU usage
- **Rate Limiting**: Request counts and throttling

## Security

### API Security
- **Rate Limiting**: Per-IP and per-endpoint limits
- **Input Validation**: Comprehensive request validation
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers and protection

### Data Protection
- **Sensitive Data**: Automatic redaction in logs
- **File Security**: Secure PDF storage and cleanup
- **API Keys**: Secure backend API communication

## Deployment

### Environment Setup
1. Configure environment variables
2. Set up SMTP server for emails
3. Configure backend API connection
4. Set up file storage permissions

### Production Considerations
- **Resource Limits**: Configure memory and CPU limits
- **Log Management**: Set up log aggregation
- **Monitoring**: Configure application monitoring
- **Backup**: Set up PDF file backup if needed

## Architecture

### Service Dependencies
- **Backend API**: Customer and product data
- **SMTP Server**: Email delivery
- **File Storage**: PDF file storage
- **Database**: (Future: for versioning and audit logs)

### Integration Points
- **REST API**: HTTP/JSON communication
- **File System**: PDF storage and retrieval
- **Email**: SMTP for notifications
- **Logging**: Structured log output

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and type checks
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Testing**: Comprehensive test coverage
- **Documentation**: Clear code documentation

## License

This project is proprietary software for Yudezign Cabinet Solutions.

## Support

For technical support or questions:
- **Email**: dev@yudezign.com
- **Documentation**: `/api/v1/docs`
- **Health Status**: `/api/v1/health`