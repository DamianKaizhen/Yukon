import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Customer,
  ProductVariant,
  BoxMaterial,
  ProductPricing,
  QuoteEngineError,
  ValidationError
} from '@/types';
import { config } from '@/config';
import { Logger } from '@/utils/Logger';

export class BackendApiService {
  private apiClient: AxiosInstance;
  private logger: Logger;
  private readonly baseUrl: string;

  constructor() {
    this.logger = Logger.getInstance();
    this.baseUrl = config.getBackendApiUrl();
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Quote-Engine-Service/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.apiClient.interceptors.request.use(
      (config) => {
        // Add API key if configured
        const apiKey = config.getSecurityConfig().backend_api_key;
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }

        this.logger.debug('Backend API request', {
          method: config.method,
          url: config.url,
          data: config.data
        });

        return config;
      },
      (error) => {
        this.logger.error('Backend API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.apiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug('Backend API response', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });

        return response;
      },
      (error) => {
        this.logger.error('Backend API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });

        // Transform backend errors to our error types
        if (error.response?.status === 404) {
          throw new ValidationError(`Resource not found: ${error.config?.url}`);
        }

        if (error.response?.status >= 500) {
          throw new QuoteEngineError(
            'Backend service error',
            500,
            'BACKEND_ERROR',
            { originalError: error.response?.data }
          );
        }

        throw new QuoteEngineError(
          `Backend API error: ${error.message}`,
          error.response?.status || 500,
          'API_ERROR',
          { originalError: error.response?.data }
        );
      }
    );
  }

  /**
   * Get customer by ID
   */
  public async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      this.logger.info('Fetching customer data', { customerId });

      const response = await this.apiClient.get(`/customers/${customerId}`);
      
      if (response.data.success && response.data.data) {
        this.logger.info('Customer data fetched successfully', { customerId });
        return response.data.data;
      }

      this.logger.warn('Customer not found', { customerId });
      return null;

    } catch (error) {
      if (error instanceof ValidationError) {
        return null; // Customer not found
      }
      
      this.logger.error('Failed to fetch customer', { customerId, error });
      throw error;
    }
  }

  /**
   * Get product variant by ID
   */
  public async getProductVariant(variantId: string): Promise<ProductVariant | null> {
    try {
      this.logger.info('Fetching product variant', { variantId });

      const response = await this.apiClient.get(`/products/variants/${variantId}`);
      
      if (response.data.success && response.data.data) {
        this.logger.info('Product variant fetched successfully', { variantId });
        return response.data.data;
      }

      this.logger.warn('Product variant not found', { variantId });
      return null;

    } catch (error) {
      if (error instanceof ValidationError) {
        return null; // Variant not found
      }
      
      this.logger.error('Failed to fetch product variant', { variantId, error });
      throw error;
    }
  }

  /**
   * Get box material by ID
   */
  public async getBoxMaterial(materialId: string): Promise<BoxMaterial | null> {
    try {
      this.logger.info('Fetching box material', { materialId });

      const response = await this.apiClient.get(`/products/materials/${materialId}`);
      
      if (response.data.success && response.data.data) {
        this.logger.info('Box material fetched successfully', { materialId });
        return response.data.data;
      }

      this.logger.warn('Box material not found', { materialId });
      return null;

    } catch (error) {
      if (error instanceof ValidationError) {
        return null; // Material not found
      }
      
      this.logger.error('Failed to fetch box material', { materialId, error });
      throw error;
    }
  }

  /**
   * Get product pricing
   */
  public async getProductPricing(variantId: string, materialId: string): Promise<ProductPricing | null> {
    try {
      this.logger.info('Fetching product pricing', { variantId, materialId });

      const response = await this.apiClient.get(`/products/pricing`, {
        params: {
          variant_id: variantId,
          material_id: materialId
        }
      });
      
      if (response.data.success && response.data.data) {
        this.logger.info('Product pricing fetched successfully', { variantId, materialId });
        return response.data.data;
      }

      this.logger.warn('Product pricing not found', { variantId, materialId });
      return null;

    } catch (error) {
      if (error instanceof ValidationError) {
        return null; // Pricing not found
      }
      
      this.logger.error('Failed to fetch product pricing', { variantId, materialId, error });
      throw error;
    }
  }

  /**
   * Validate quote with backend
   */
  public async validateQuote(quoteData: any): Promise<boolean> {
    try {
      this.logger.info('Validating quote with backend');

      const response = await this.apiClient.post('/quotes/validate', quoteData);
      
      if (response.data.success) {
        this.logger.info('Quote validation successful');
        return true;
      }

      this.logger.warn('Quote validation failed', { 
        errors: response.data.errors 
      });
      return false;

    } catch (error) {
      this.logger.error('Quote validation error', { error });
      throw error;
    }
  }

  /**
   * Save quote to backend
   */
  public async saveQuote(quoteData: any): Promise<string> {
    try {
      this.logger.info('Saving quote to backend');

      const response = await this.apiClient.post('/quotes', quoteData);
      
      if (response.data.success && response.data.data?.id) {
        const quoteId = response.data.data.id;
        this.logger.info('Quote saved successfully', { quoteId });
        return quoteId;
      }

      throw new QuoteEngineError('Failed to save quote - no ID returned');

    } catch (error) {
      this.logger.error('Failed to save quote', { error });
      throw error;
    }
  }

  /**
   * Update quote in backend
   */
  public async updateQuote(quoteId: string, updates: any): Promise<boolean> {
    try {
      this.logger.info('Updating quote in backend', { quoteId });

      const response = await this.apiClient.put(`/quotes/${quoteId}`, updates);
      
      if (response.data.success) {
        this.logger.info('Quote updated successfully', { quoteId });
        return true;
      }

      this.logger.warn('Quote update failed', { 
        quoteId,
        errors: response.data.errors 
      });
      return false;

    } catch (error) {
      this.logger.error('Failed to update quote', { quoteId, error });
      throw error;
    }
  }

  /**
   * Get quote from backend
   */
  public async getQuote(quoteId: string): Promise<any | null> {
    try {
      this.logger.info('Fetching quote from backend', { quoteId });

      const response = await this.apiClient.get(`/quotes/${quoteId}`);
      
      if (response.data.success && response.data.data) {
        this.logger.info('Quote fetched successfully', { quoteId });
        return response.data.data;
      }

      this.logger.warn('Quote not found in backend', { quoteId });
      return null;

    } catch (error) {
      if (error instanceof ValidationError) {
        return null; // Quote not found
      }
      
      this.logger.error('Failed to fetch quote', { quoteId, error });
      throw error;
    }
  }

  /**
   * Batch fetch multiple products
   */
  public async batchGetProducts(variantIds: string[]): Promise<Map<string, ProductVariant>> {
    try {
      this.logger.info('Batch fetching product variants', { 
        count: variantIds.length 
      });

      const response = await this.apiClient.post('/products/variants/batch', {
        variant_ids: variantIds
      });
      
      const products = new Map<string, ProductVariant>();
      
      if (response.data.success && response.data.data) {
        response.data.data.forEach((product: ProductVariant) => {
          products.set(product.id, product);
        });
      }

      this.logger.info('Batch product fetch completed', { 
        requested: variantIds.length,
        found: products.size 
      });

      return products;

    } catch (error) {
      this.logger.error('Batch product fetch failed', { variantIds, error });
      throw error;
    }
  }

  /**
   * Batch fetch multiple materials
   */
  public async batchGetMaterials(materialIds: string[]): Promise<Map<string, BoxMaterial>> {
    try {
      this.logger.info('Batch fetching box materials', { 
        count: materialIds.length 
      });

      const response = await this.apiClient.post('/products/materials/batch', {
        material_ids: materialIds
      });
      
      const materials = new Map<string, BoxMaterial>();
      
      if (response.data.success && response.data.data) {
        response.data.data.forEach((material: BoxMaterial) => {
          materials.set(material.id, material);
        });
      }

      this.logger.info('Batch material fetch completed', { 
        requested: materialIds.length,
        found: materials.size 
      });

      return materials;

    } catch (error) {
      this.logger.error('Batch material fetch failed', { materialIds, error });
      throw error;
    }
  }

  /**
   * Health check for backend API
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/health', {
        timeout: 5000 // 5 second timeout for health check
      });
      
      return response.status === 200 && response.data.status === 'ok';

    } catch (error) {
      this.logger.warn('Backend API health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get API statistics
   */
  public getApiStats(): any {
    return {
      baseUrl: this.baseUrl,
      timeout: this.apiClient.defaults.timeout,
      lastHealthCheck: new Date().toISOString()
    };
  }
}