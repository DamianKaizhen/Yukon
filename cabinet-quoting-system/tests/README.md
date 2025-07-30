# Cabinet Quoting System - Testing Suite

This directory contains comprehensive testing for the Cabinet Quoting System, covering all application layers and services.

## Test Structure

```
tests/
├── backend/           # Backend API tests
├── frontend/          # Frontend/UI tests
├── admin-interface/   # Admin dashboard tests
├── quote-engine/      # Quote engine service tests
├── integration/       # End-to-end integration tests
├── performance/       # Load and performance tests
├── security/          # Security and vulnerability tests
├── fixtures/          # Test data fixtures
├── utils/             # Testing utilities and helpers
└── reports/           # Test reports and coverage
```

## Testing Strategy

### 1. Unit Testing
- **Backend**: API endpoints, business logic, services
- **Frontend**: React components, hooks, utilities
- **Quote Engine**: PDF generation, calculations, business rules
- **Admin Interface**: Component interactions, data management

### 2. Integration Testing
- API endpoint interactions
- Database operations
- Service-to-service communication
- Complete user workflows

### 3. End-to-End Testing
- Customer registration and login flow
- Product catalog browsing and search
- Quote creation and management
- PDF generation and download
- Admin management workflows

### 4. Performance Testing
- API response times under load
- Database query performance
- PDF generation performance
- Concurrent user scenarios

### 5. Security Testing
- Authentication and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Running Tests

### Prerequisites
```bash
# Ensure Docker services are running
cd cabinet-quoting-system
docker-compose up -d

# Install test dependencies
npm install
```

### Test Commands
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:admin
npm run test:quote-engine
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security
```

## Test Coverage Goals
- **Unit Tests**: >90% code coverage
- **Integration Tests**: All critical user workflows
- **Performance Tests**: All API endpoints under load
- **Security Tests**: All input vectors and auth flows

## Tools and Frameworks
- **Jest**: Unit and integration testing
- **React Testing Library**: Frontend component testing
- **Cypress**: End-to-end testing
- **Supertest**: API testing
- **Artillery**: Performance testing
- **OWASP ZAP**: Security testing
- **Istanbul**: Code coverage reporting