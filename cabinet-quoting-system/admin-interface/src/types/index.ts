// Base interfaces
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// User and Authentication
export interface User extends BaseEntity {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  last_login?: Date;
  email_verified: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  SALES = 'sales',
  VIEWER = 'viewer'
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Cabinet System Entities
export interface ColorOption extends BaseEntity {
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export interface BoxMaterial extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export interface CabinetCategory extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  sort_order: number;
  is_active: boolean;
}

export interface CabinetType extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  category_id: string;
  is_active: boolean;
  sort_order: number;
}

export interface Product extends BaseEntity {
  item_code: string;
  name: string;
  description?: string;
  cabinet_type_id: string;
  width?: number;
  height?: number;
  depth?: number;
  door_count?: number;
  drawer_count?: number;
  is_left_right: boolean;
  is_active: boolean;
  category?: CabinetCategory;
  cabinet_type?: CabinetType;
}

export interface ProductVariant extends BaseEntity {
  product_id: string;
  color_option_id: string;
  sku: string;
  is_active: boolean;
  product?: Product;
  color_option?: ColorOption;
}

export interface ProductPricing extends BaseEntity {
  product_variant_id: string;
  box_material_id: string;
  price: number;
  effective_date: Date;
  expiration_date?: Date;
  is_active?: boolean;
  product_variant?: ProductVariant;
  box_material?: BoxMaterial;
  // Extended fields for admin pricing display
  sku?: string;
  item_code?: string;
  product_name?: string;
  width_inches?: number;
  height_inches?: number;
  depth_inches?: number;
  color_option?: string;
  color_display_name?: string;
  material_code?: string;
  material_name?: string;
}

export interface ProductVariantForPricing {
  id: string;
  sku: string;
  item_code: string;
  product_name: string;
  width_inches?: number;
  height_inches?: number;
  depth_inches?: number;
  color_option: string;
  color_display_name: string;
}

export interface Customer extends BaseEntity {
  customer_number?: string;
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  is_active: boolean;
  notes?: string;
}

export interface Quote extends BaseEntity {
  quote_number: string;
  customer_id: string;
  status: QuoteStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_until: Date;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: Date;
  customer?: Customer;
  quote_items?: QuoteItem[];
}

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface QuoteItem extends BaseEntity {
  quote_id: string;
  product_variant_id: string;
  box_material_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount_percent?: number;
  discount_amount?: number;
  notes?: string;
  line_number: number;
  product_variant?: ProductVariant;
  box_material?: BoxMaterial;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}

// CSV Import Types
export interface CSVImportResult {
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  errors: string[];
  warnings: string[];
}

// System Types
export interface SystemInfo {
  version: string;
  environment: string;
  uptime: number;
  memory_usage: {
    used: number;
    total: number;
    percentage: number;
  };
  database_status: string;
}

export interface SystemStats {
  total_products: number;
  total_customers: number;
  total_quotes: number;
  total_users: number;
  recent_quotes: number;
  pending_quotes: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Admin specific types
export interface ImportHistory {
  id: string;
  type: 'products' | 'customers' | 'pricing';
  filename: string;
  status: 'completed' | 'failed' | 'processing';
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  errors: string[];
  created_at: Date;
  created_by: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  created_at: Date;
  created_by: string;
}

export interface LogEntry {
  id: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}