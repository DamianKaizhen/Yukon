import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  User,
  LoginRequest,
  LoginResponse,
  Product,
  Customer,
  Quote,
  SystemInfo,
  SystemStats,
  CSVImportResult,
  ImportHistory,
  BackupInfo,
  LogEntry,
  PaginationParams,
  SearchParams,
  ColorOption,
  BoxMaterial,
  ProductPricing,
  ProductVariantForPricing,
} from '@/types';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: 'http://localhost:3002/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.instance.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return response.data.data!;
  }

  async logout(): Promise<void> {
    await this.instance.post('/auth/logout');
    localStorage.removeItem('admin_token');
  }

  async getProfile(): Promise<User> {
    const response = await this.instance.get<ApiResponse<User>>('/auth/profile');
    return response.data.data!;
  }

  // System endpoints
  async getSystemInfo(): Promise<SystemInfo> {
    const response = await this.instance.get<ApiResponse<SystemInfo>>('/admin/system/info');
    return response.data.data!;
  }

  async getSystemStats(): Promise<SystemStats> {
    const response = await this.instance.get<ApiResponse<SystemStats>>('/admin/system/stats');
    return response.data.data!;
  }

  async getSystemHealth(): Promise<{ status: string; details: Record<string, any> }> {
    const response = await this.instance.get<ApiResponse<{ status: string; details: Record<string, any> }>>('/admin/system/health');
    return response.data.data!;
  }

  // User management
  async getUsers(params?: SearchParams): Promise<{ users: User[]; meta: any }> {
    const response = await this.instance.get<ApiResponse<User[]>>('/admin/users', { params });
    return { users: response.data.data!, meta: response.data.meta };
  }

  async getUser(id: string): Promise<User> {
    const response = await this.instance.get<ApiResponse<User>>(`/admin/users/${id}`);
    return response.data.data!;
  }

  async createUser(userData: Partial<User> & { password: string }): Promise<User> {
    const response = await this.instance.post<ApiResponse<User>>('/admin/users', userData);
    return response.data.data!;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await this.instance.put<ApiResponse<User>>(`/admin/users/${id}`, userData);
    return response.data.data!;
  }

  async deleteUser(id: string): Promise<void> {
    await this.instance.delete(`/admin/users/${id}`);
  }

  async resetUserPassword(id: string): Promise<{ temporary_password: string }> {
    const response = await this.instance.post<ApiResponse<{ temporary_password: string }>>(`/admin/users/${id}/reset-password`);
    return response.data.data!;
  }

  // Product management
  async getProducts(params?: SearchParams): Promise<{ products: Product[]; meta: any }> {
    const response = await this.instance.get<ApiResponse<Product[]>>('/products', { params });
    return { products: response.data.data!, meta: response.data.meta };
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.instance.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data!;
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const response = await this.instance.put<ApiResponse<Product>>(`/products/${id}`, productData);
    return response.data.data!;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.instance.delete(`/products/${id}`);
  }

  // Customer management
  async getCustomers(params?: SearchParams): Promise<{ customers: Customer[]; meta: any }> {
    const response = await this.instance.get<ApiResponse<Customer[]>>('/customers', { params });
    return { customers: response.data.data!, meta: response.data.meta };
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await this.instance.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data!;
  }

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const response = await this.instance.post<ApiResponse<Customer>>('/customers', customerData);
    return response.data.data!;
  }

  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
    const response = await this.instance.put<ApiResponse<Customer>>(`/customers/${id}`, customerData);
    return response.data.data!;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.instance.delete(`/customers/${id}`);
  }

  // Quote management
  async getQuotes(params?: SearchParams): Promise<{ quotes: Quote[]; meta: any }> {
    const response = await this.instance.get<ApiResponse<Quote[]>>('/quotes', { params });
    return { quotes: response.data.data!, meta: response.data.meta };
  }

  async getQuote(id: string): Promise<Quote> {
    const response = await this.instance.get<ApiResponse<Quote>>(`/quotes/${id}`);
    return response.data.data!;
  }

  async updateQuote(id: string, quoteData: Partial<Quote>): Promise<Quote> {
    const response = await this.instance.put<ApiResponse<Quote>>(`/quotes/${id}`, quoteData);
    return response.data.data!;
  }

  async deleteQuote(id: string): Promise<void> {
    await this.instance.delete(`/quotes/${id}`);
  }

  // CSV Import
  async importProducts(file: File): Promise<CSVImportResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    const response = await this.instance.post<ApiResponse<CSVImportResult>>('/admin/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data!;
  }

  async importCustomers(file: File): Promise<CSVImportResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    const response = await this.instance.post<ApiResponse<CSVImportResult>>('/admin/import/customers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data!;
  }

  async importPricing(file: File): Promise<CSVImportResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    const response = await this.instance.post<ApiResponse<CSVImportResult>>('/admin/import/pricing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data!;
  }

  async getImportHistory(): Promise<ImportHistory[]> {
    const response = await this.instance.get<ApiResponse<ImportHistory[]>>('/admin/import/history');
    return response.data.data!;
  }

  async getImportTemplate(type: 'products' | 'customers' | 'pricing'): Promise<Blob> {
    const response = await this.instance.get(`/admin/import/template/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Data export
  async exportProducts(): Promise<Blob> {
    const response = await this.instance.get('/admin/export/products', {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportCustomers(): Promise<Blob> {
    const response = await this.instance.get('/admin/export/customers', {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportQuotes(): Promise<Blob> {
    const response = await this.instance.get('/admin/export/quotes', {
      responseType: 'blob',
    });
    return response.data;
  }

  // Database operations
  async createBackup(): Promise<BackupInfo> {
    const response = await this.instance.post<ApiResponse<BackupInfo>>('/admin/database/backup');
    return response.data.data!;
  }

  async getBackups(): Promise<BackupInfo[]> {
    const response = await this.instance.get<ApiResponse<BackupInfo[]>>('/admin/database/backups');
    return response.data.data!;
  }

  async restoreBackup(backupId: string): Promise<void> {
    await this.instance.post(`/admin/database/restore/${backupId}`);
  }

  async vacuumDatabase(): Promise<void> {
    await this.instance.post('/admin/database/vacuum');
  }

  // Logs and monitoring
  async getLogs(params?: { level?: string; limit?: number }): Promise<LogEntry[]> {
    const response = await this.instance.get<ApiResponse<LogEntry[]>>('/admin/logs', { params });
    return response.data.data!;
  }

  async getErrorLogs(): Promise<LogEntry[]> {
    const response = await this.instance.get<ApiResponse<LogEntry[]>>('/admin/logs/errors');
    return response.data.data!;
  }

  async clearLogs(): Promise<void> {
    await this.instance.delete('/admin/logs');
  }

  // Color Options Management
  async getColorOptions(): Promise<ColorOption[]> {
    const response = await this.instance.get<ApiResponse<ColorOption[]>>('/admin/color-options');
    return response.data.data!;
  }

  async createColorOption(data: { name: string; display_name: string; description?: string; is_active?: boolean; sort_order?: number }): Promise<ColorOption> {
    const response = await this.instance.post<ApiResponse<ColorOption>>('/admin/color-options', data);
    return response.data.data!;
  }

  async updateColorOption(id: string, data: Partial<ColorOption>): Promise<ColorOption> {
    const response = await this.instance.put<ApiResponse<ColorOption>>(`/admin/color-options/${id}`, data);
    return response.data.data!;
  }

  async deleteColorOption(id: string): Promise<void> {
    await this.instance.delete(`/admin/color-options/${id}`);
  }

  // Box Materials Management
  async getBoxMaterials(): Promise<BoxMaterial[]> {
    const response = await this.instance.get<ApiResponse<BoxMaterial[]>>('/admin/box-materials');
    return response.data.data!;
  }

  async createBoxMaterial(data: { code: string; name: string; description?: string; is_active?: boolean; sort_order?: number }): Promise<BoxMaterial> {
    const response = await this.instance.post<ApiResponse<BoxMaterial>>('/admin/box-materials', data);
    return response.data.data!;
  }

  async updateBoxMaterial(id: string, data: Partial<BoxMaterial>): Promise<BoxMaterial> {
    const response = await this.instance.put<ApiResponse<BoxMaterial>>(`/admin/box-materials/${id}`, data);
    return response.data.data!;
  }

  async deleteBoxMaterial(id: string): Promise<void> {
    await this.instance.delete(`/admin/box-materials/${id}`);
  }

  // Pricing Management
  async getPricing(params?: SearchParams): Promise<{ pricing: ProductPricing[]; meta: any }> {
    const response = await this.instance.get<ApiResponse<ProductPricing[]>>('/admin/pricing', { params });
    return { pricing: response.data.data!, meta: response.data.meta };
  }

  async getPricingForVariant(variantId: string): Promise<ProductPricing[]> {
    const response = await this.instance.get<ApiResponse<ProductPricing[]>>(`/admin/pricing/variant/${variantId}`);
    return response.data.data!;
  }

  async createPricing(data: { product_variant_id: string; box_material_id: string; price: number; effective_date?: string; expiration_date?: string }): Promise<ProductPricing> {
    const response = await this.instance.post<ApiResponse<ProductPricing>>('/admin/pricing', data);
    return response.data.data!;
  }

  async updatePricing(id: string, data: { price: number; effective_date?: string; expiration_date?: string }): Promise<ProductPricing> {
    const response = await this.instance.put<ApiResponse<ProductPricing>>(`/admin/pricing/${id}`, data);
    return response.data.data!;
  }

  async deletePricing(id: string): Promise<void> {
    await this.instance.delete(`/admin/pricing/${id}`);
  }

  async bulkUpdatePricing(updates: Array<{ id: string; price: number; effective_date?: string; expiration_date?: string }>): Promise<ProductPricing[]> {
    const response = await this.instance.post<ApiResponse<ProductPricing[]>>('/admin/pricing/bulk-update', { updates });
    return response.data.data!;
  }

  async getProductVariants(): Promise<ProductVariantForPricing[]> {
    const response = await this.instance.get<ApiResponse<ProductVariantForPricing[]>>('/admin/product-variants');
    return response.data.data!;
  }
}

export const apiClient = new ApiClient();
export default apiClient;