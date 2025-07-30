// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// Product & Cabinet Types
export interface Product {
  id: string
  item_code: string
  name: string
  description?: string
  category_name: string
  type_name: string
  width: number
  height: number
  depth: number
  door_count: number
  drawer_count: number
  is_left_right: boolean
  min_price: number
  max_price: number
  variant_count: number
  variants?: ProductVariant[]
  created_at: string
  updated_at: string
}

// Consolidated Cabinet Type for new structure
export interface ConsolidatedCabinetType {
  base_cabinet_type: string
  display_name: string
  description?: string
  category_name: string
  type_name: string
  door_count: number
  drawer_count: number
  is_left_right: boolean
  min_price: number
  max_price: number
  available_sizes: CabinetSize[]
  total_variants: number
  created_at: string
  updated_at: string
}

export interface CabinetSize {
  width: number
  height: number
  depth: number
  product_count: number
  price_range: {
    min: number
    max: number
  }
}

export interface ProductVariant {
  id: string
  product_id: string
  color_option_id: string
  sku: string
  color_option: ColorOption
  pricing: ProductPricing[]
  inventory?: InventoryItem
  created_at: string
  updated_at: string
}

export interface ColorOption {
  id: string
  name: string
  display_name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface BoxMaterial {
  id: string
  code: string
  name: string
  created_at: string
  updated_at: string
}

export interface ProductPricing {
  id: string
  product_variant_id: string
  box_material_id: string
  price: number
  effective_date: string
  expiration_date?: string
  box_material: BoxMaterial
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  product_variant_id: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  reorder_point: number
  reorder_quantity: number
  created_at: string
  updated_at: string
}

// Category Types
export interface CabinetCategory {
  id: string
  code: string
  name: string
  description?: string
  parent_category_id?: string
  created_at: string
  updated_at: string
}

export interface CabinetType {
  id: string
  code: string
  name: string
  description?: string
  category_id: string
  created_at: string
  updated_at: string
}

// Search & Filter Types
export interface ProductSearchParams {
  q?: string
  page?: number
  limit?: number
  sort?: 'name' | 'item_code' | 'created_at' | 'width' | 'height' | 'display_name' | 'base_cabinet_type'
  order?: 'asc' | 'desc'
  category_id?: string
  type_id?: string
  base_cabinet_type?: string
  width_min?: number
  width_max?: number
  height_min?: number
  height_max?: number
  depth_min?: number
  depth_max?: number
  price_min?: number
  price_max?: number
  color_options?: string[]
  box_materials?: string[]
  door_count?: number
  drawer_count?: number
  is_left_right?: boolean
}

// Search params specifically for consolidated catalog
export interface ConsolidatedSearchParams {
  q?: string
  page?: number
  limit?: number
  sort?: 'display_name' | 'base_cabinet_type' | 'category_name'
  order?: 'asc' | 'desc'
  category_id?: string
  type_id?: string
  base_cabinet_type?: string
  door_count?: number
  drawer_count?: number
  is_left_right?: boolean
}

export interface ProductFilters {
  categories: CabinetCategory[]
  types: CabinetType[]
  colorOptions: ColorOption[]
  boxMaterials: BoxMaterial[]
  priceRange: {
    min: number
    max: number
  }
  dimensionRanges: {
    width: { min: number; max: number }
    height: { min: number; max: number }
    depth: { min: number; max: number }
  }
}

// Quote Types
export interface Quote {
  id: string
  customer_id: string
  quote_number: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  subtotal: number
  tax_amount: number
  total_amount: number
  valid_until: string
  notes?: string
  items: QuoteItem[]
  customer?: Customer
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_variant_id: string
  box_material_id: string
  quantity: number
  unit_price: number
  line_total: number
  product_variant: ProductVariant
  box_material: BoxMaterial
  created_at: string
  updated_at: string
}

export interface CreateQuoteRequest {
  customer_id: string
  notes?: string
  items: CreateQuoteItemRequest[]
}

export interface CreateQuoteItemRequest {
  product_variant_id: string
  box_material_id: string
  quantity: number
}

// Customer Types
export interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company?: string
  address?: CustomerAddress
  created_at: string
  updated_at: string
}

export interface CustomerAddress {
  street: string
  city: string
  state: string
  zip_code: string
  country: string
}

// Cart Types
export interface CartItem {
  productVariantId: string
  boxMaterialId: string
  quantity: number
  product: Product
  variant: ProductVariant
  boxMaterial: BoxMaterial
  unitPrice: number
  lineTotal: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  itemCount: number
}

// Authentication Types
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'customer' | 'sales' | 'admin'
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// UI State Types
export interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  currentPage: string
}

// Error Types
export interface ApiError {
  message: string
  code?: string
  field?: string
  details?: Record<string, any>
}