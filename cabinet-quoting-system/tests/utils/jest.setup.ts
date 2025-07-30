import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'cabinet_quoting_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BACKEND_API_URL = 'http://localhost:3001';
process.env.QUOTE_ENGINE_URL = 'http://localhost:3003';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn();

// Setup DOM environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Setup and teardown for each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});