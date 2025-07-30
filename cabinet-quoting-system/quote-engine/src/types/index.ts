// Core Business Types
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// Import shared types from backend
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
}

export interface ProductVariant extends BaseEntity {
  product_id: string;
  color_option_id: string;
  sku: string;
  is_active: boolean;
  product?: Product;
  color_option?: ColorOption;
}

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

export interface ProductPricing extends BaseEntity {
  product_variant_id: string;
  box_material_id: string;
  price: number;
  cost?: number;
  effective_date: Date;
  expiration_date?: Date;
  is_active: boolean;
}

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// Quote Engine Specific Types

export interface QuoteCalculationRequest {
  customer_id: string;
  items: QuoteItemInput[];
  shipping_address?: ShippingAddress;
  apply_tax?: boolean;
  customer_discount_tier?: CustomerDiscountTier;
  notes?: string;
  valid_until?: Date;
}

export interface QuoteItemInput {
  product_variant_id: string;
  box_material_id: string;
  quantity: number;
  custom_price?: number; // Override pricing
  discount_percent?: number;
  notes?: string;
}

export interface ShippingAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
}

export enum CustomerDiscountTier {
  RETAIL = 'retail',
  CONTRACTOR = 'contractor',
  DEALER = 'dealer',
  WHOLESALE = 'wholesale'
}

export interface QuoteCalculation {
  quote_id?: string;
  customer: Customer;
  line_items: CalculatedLineItem[];
  subtotal: number;
  discount_summary: DiscountSummary;
  tax_summary: TaxSummary;
  shipping_summary: ShippingSummary;
  total_amount: number;
  valid_until: Date;
  created_at: Date;
  notes?: string;
}

export interface CalculatedLineItem {
  line_number: number;
  product_variant: ProductVariant;
  box_material: BoxMaterial;
  quantity: number;
  unit_price: number;
  list_price: number; // Original price before discounts
  line_subtotal: number;
  discount_details: LineItemDiscount[];
  line_total: number; // After discounts, before tax
  notes?: string;
}

export interface LineItemDiscount {
  type: DiscountType;
  description: string;
  amount: number;
  percentage?: number;
  applied_to: 'unit_price' | 'line_total';
}

export enum DiscountType {
  CUSTOMER_TIER = 'customer_tier',
  BULK_QUANTITY = 'bulk_quantity',
  PROMOTIONAL = 'promotional',
  MANUAL = 'manual',
  SEASONAL = 'seasonal'
}

export interface DiscountSummary {
  total_discount_amount: number;
  discounts_applied: {
    type: DiscountType;
    description: string;
    amount: number;
    percentage?: number;
  }[];
}

export interface TaxSummary {
  tax_rate: number;
  taxable_amount: number;
  tax_amount: number;
  tax_jurisdiction: string;
  tax_exempt: boolean;
  tax_details: TaxDetail[];
}

export interface TaxDetail {
  jurisdiction: string;
  rate: number;
  amount: number;
  type: 'state' | 'county' | 'city' | 'district';
}

export interface ShippingSummary {
  shipping_method: ShippingMethod;
  shipping_cost: number;
  delivery_estimate: string;
  installation_cost?: number;
  total_shipping_cost: number;
}

export enum ShippingMethod {
  PICKUP = 'pickup',
  STANDARD_DELIVERY = 'standard_delivery',
  WHITE_GLOVE = 'white_glove',
  INSTALLATION = 'installation'
}

// PDF Generation Types

export interface PDFGenerationRequest {
  quote_calculation: QuoteCalculation;
  template_type: PDFTemplateType;
  include_terms: boolean;
  include_installation_guide?: boolean;
  custom_branding?: CustomBranding;
  watermark?: string;
}

export enum PDFTemplateType {
  STANDARD = 'standard',
  DETAILED = 'detailed',
  SUMMARY = 'summary',
  CONTRACTOR = 'contractor'
}

export interface CustomBranding {
  company_name?: string;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  font_family?: string;
}

export interface PDFGenerationResult {
  pdf_id: string;
  file_path: string;
  file_size: number;
  generated_at: Date;
  expires_at: Date;
  download_url: string;
  pages: number;
}

// Email Service Types

export interface EmailRequest {
  quote_calculation: QuoteCalculation;
  pdf_attachment?: PDFGenerationResult;
  email_type: EmailType;
  recipient_email?: string; // Override customer email
  cc_emails?: string[];
  custom_message?: string;
  scheduled_send?: Date;
}

export enum EmailType {
  QUOTE_CREATED = 'quote_created',
  QUOTE_UPDATED = 'quote_updated',
  QUOTE_APPROVED = 'quote_approved',
  QUOTE_REJECTED = 'quote_rejected',
  QUOTE_EXPIRED = 'quote_expired',
  FOLLOW_UP = 'follow_up',
  REMINDER = 'reminder'
}

export interface EmailResult {
  email_id: string;
  sent_at: Date;
  recipient: string;
  status: EmailStatus;
  error_message?: string;
}

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}

// Business Rules Types

export interface BusinessRules {
  pricing_rules: PricingRules;
  discount_rules: DiscountRules;
  tax_rules: TaxRules;
  shipping_rules: ShippingRules;
  validation_rules: ValidationRules;
}

export interface PricingRules {
  min_order_amount: number;
  max_line_item_quantity: number;
  price_precision: number; // Decimal places
  markup_rules: MarkupRule[];
}

export interface MarkupRule {
  customer_tier: CustomerDiscountTier;
  markup_percentage: number;
  effective_date: Date;
  expiration_date?: Date;
}

export interface DiscountRules {
  max_discount_percentage: number;
  bulk_discount_thresholds: BulkDiscountThreshold[];
  customer_tier_discounts: CustomerTierDiscount[];
  promotional_discounts: PromotionalDiscount[];
}

export interface BulkDiscountThreshold {
  min_quantity: number;
  discount_percentage: number;
  applies_to: 'line_item' | 'total_order';
}

export interface CustomerTierDiscount {
  tier: CustomerDiscountTier;
  discount_percentage: number;
  min_order_amount?: number;
}

export interface PromotionalDiscount {
  id: string;
  name: string;
  code?: string;
  discount_percentage?: number;
  discount_amount?: number;
  valid_from: Date;
  valid_until: Date;
  min_order_amount?: number;
  max_uses?: number;
  current_uses: number;
  applies_to_products?: string[]; // Product IDs
}

export interface TaxRules {
  default_tax_rate: number;
  regional_tax_rates: Record<string, number>; // State/Province -> Rate
  tax_exempt_customers: string[]; // Customer IDs
  taxable_states: string[];
}

export interface ShippingRules {
  free_shipping_threshold: number;
  shipping_rates: ShippingRate[];
  installation_rates: InstallationRate[];
  delivery_zones: DeliveryZone[];
}

export interface ShippingRate {
  method: ShippingMethod;
  base_cost: number;
  cost_per_item?: number;
  cost_per_weight?: number;
  max_distance?: number; // Miles
}

export interface InstallationRate {
  base_cost: number;
  cost_per_cabinet: number;
  cost_per_linear_foot?: number;
  travel_cost_per_mile?: number;
  min_charge: number;
}

export interface DeliveryZone {
  zone_id: string;
  zone_name: string;
  postal_codes: string[];
  delivery_days: number;
  additional_cost: number;
}

export interface ValidationRules {
  min_quote_amount: number;
  max_quote_amount: number;
  max_quote_validity_days: number;
  required_customer_fields: string[];
  required_quote_fields: string[];
}

// Quote Versioning Types

export interface QuoteVersion extends BaseEntity {
  quote_id: string;
  version_number: number;
  quote_data: QuoteCalculation;
  changes_summary: string;
  created_by: string;
  is_current: boolean;
}

export interface QuoteChangeLog extends BaseEntity {
  quote_id: string;
  version_from: number;
  version_to: number;
  change_type: ChangeType;
  field_changed: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  reason?: string;
}

export enum ChangeType {
  ITEM_ADDED = 'item_added',
  ITEM_REMOVED = 'item_removed',
  ITEM_MODIFIED = 'item_modified',
  PRICE_CHANGED = 'price_changed',
  DISCOUNT_APPLIED = 'discount_applied',
  CUSTOMER_CHANGED = 'customer_changed',
  STATUS_CHANGED = 'status_changed',
  NOTES_UPDATED = 'notes_updated'
}

// Configuration Types

export interface QuoteEngineConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  email: EmailConfig;
  pdf: PDFConfig;
  business: BusinessConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  api_version: string;
  cors_origins: string[];
  rate_limit: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  ssl: boolean;
  max_connections: number;
  idle_timeout: number;
  connection_timeout: number;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
  from_address: string;
}

export interface PDFConfig {
  storage_path: string;
  temp_path: string;
  company_logo_path: string;
  max_file_size: number;
  retention_days: number;
}

export interface BusinessConfig {
  default_tax_rate: number;
  default_quote_validity_days: number;
  min_order_amount: number;
  bulk_discount_threshold: number;
  bulk_discount_percentage: number;
  regional_tax_rates: Record<string, number>;
}

export interface LoggingConfig {
  level: string;
  file_path: string;
  max_size: string;
  max_files: number;
}

export interface SecurityConfig {
  jwt_secret: string;
  backend_api_key: string;
  api_rate_limit: number;
}

// API Response Types

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  processing_time?: number;
  version?: string;
}

// Error Types

export class QuoteEngineError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CalculationError extends QuoteEngineError {
  constructor(message: string, details?: any) {
    super(message, 400, 'CALCULATION_ERROR', details);
  }
}

export class PDFGenerationError extends QuoteEngineError {
  constructor(message: string, details?: any) {
    super(message, 500, 'PDF_GENERATION_ERROR', details);
  }
}

export class EmailError extends QuoteEngineError {
  constructor(message: string, details?: any) {
    super(message, 500, 'EMAIL_ERROR', details);
  }
}

export class ValidationError extends QuoteEngineError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends QuoteEngineError {
  constructor(message: string, details?: any) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
  }
}

export class ConfigurationError extends QuoteEngineError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CONFIGURATION_ERROR', details);
  }
}