import { Request } from 'express';

// Base interfaces
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// User and Authentication
export interface User extends BaseEntity {
  email: string;
  password_hash: string;
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

export interface AuthRequest extends Request {
  user?: User;
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
  is_active: boolean;
  product_variant?: ProductVariant;
  box_material?: BoxMaterial;
}

export interface Inventory extends BaseEntity {
  product_variant_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_point?: number;
  last_updated: Date;
  product_variant?: ProductVariant;
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

// Product Catalog Types
export interface ProductCatalogItem {
  id: string;
  item_code: string;
  name: string;
  description?: string;
  category_name: string;
  type_name: string;
  width?: number;
  height?: number;
  depth?: number;
  door_count?: number;
  drawer_count?: number;
  is_left_right: boolean;
  variants: ProductVariantWithPricing[];
}

// New consolidated cabinet type interface
export interface ConsolidatedCabinetType {
  base_cabinet_type: string;
  display_name: string;
  category_name: string;
  type_name: string;
  available_sizes: number[];
  size_count: number;
  price_range: {
    min: number;
    max: number;
  };
  door_count?: number;
  drawer_count?: number;
  is_left_right: boolean;
  sample_product_id: string; // Representative product for details
}

// Enhanced catalog item with optional size selection
export interface ProductCatalogItemEnhanced extends ProductCatalogItem {
  base_cabinet_type?: string;
  display_name?: string;
  width_inches_extracted?: number;
  selected_size?: number;
}

export interface ProductVariantWithPricing {
  id: string;
  sku: string;
  color_option: ColorOption;
  pricing: ProductPricing[];
  inventory?: Inventory;
}

// CSV Import Types
export interface CSVImportResult {
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  errors: string[];
  warnings: string[];
}

// Database Configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  ssl?: boolean;
  max_connections?: number;
  idle_timeout?: number;
  connection_timeout?: number;
}

// Error Types
export class APIError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}