import axios, { AxiosResponse } from 'axios'
import type {
  ApiResponse,
  Product,
  ProductSearchParams,
  ConsolidatedSearchParams,
  ConsolidatedCabinetType,
  CabinetSize,
  ProductFilters,
  CabinetCategory,
  CabinetType,
  ColorOption,
  BoxMaterial,
  Quote,
  CreateQuoteRequest,
  Customer,
} from '@/types'

// Create axios instance with default config  
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper function to simulate consolidated catalog from legacy products
function simulateConsolidatedCatalog(products: Product[]): ConsolidatedCabinetType[] {
  const consolidatedMap = new Map<string, ConsolidatedCabinetType>()

  products.forEach(product => {
    // Extract base cabinet type from product name - improve regex to handle various formats
    // Examples: "B30FD" -> "B", "ADA Sink Base 24"D" -> "ADA Sink Base", "WC3042" -> "WC"
    let baseCabinetType = product.name
      .replace(/\s*\d+["']?\s*[WwHhDd]?.*$/, '') // Remove trailing dimensions 
      .replace(/\d+$/, '') // Remove trailing numbers
      .trim()
    
    // If the extraction results in something too short, use the first significant part
    if (baseCabinetType.length < 2) {
      const words = product.name.split(/\s+/)
      baseCabinetType = words[0] + (words[1] ? ' ' + words[1] : '')
    }
    
    const displayName = baseCabinetType
    
    if (!consolidatedMap.has(baseCabinetType)) {
      consolidatedMap.set(baseCabinetType, {
        base_cabinet_type: baseCabinetType,
        display_name: displayName,
        description: product.description,
        category_name: product.category_name,
        type_name: product.type_name,
        door_count: product.door_count,
        drawer_count: product.drawer_count,
        is_left_right: product.is_left_right,
        min_price: product.min_price,
        max_price: product.max_price,
        available_sizes: [{
          width: product.width,
          height: product.height,
          depth: product.depth,
          product_count: 1,
          price_range: {
            min: product.min_price,
            max: product.max_price
          }
        }],
        total_variants: product.variant_count,
        created_at: product.created_at,
        updated_at: product.updated_at
      })
    } else {
      const existing = consolidatedMap.get(baseCabinetType)!
      // Update price range
      existing.min_price = Math.min(existing.min_price, product.min_price)
      existing.max_price = Math.max(existing.max_price, product.max_price)
      existing.total_variants += product.variant_count
      
      // Add new size if not exists
      const sizeExists = existing.available_sizes.some(size => 
        size.width === product.width && 
        size.height === product.height && 
        size.depth === product.depth
      )
      
      if (!sizeExists) {
        existing.available_sizes.push({
          width: product.width,
          height: product.height,
          depth: product.depth,
          product_count: 1,
          price_range: {
            min: product.min_price,
            max: product.max_price
          }
        })
      } else {
        // Update existing size's product count and price range
        const existingSize = existing.available_sizes.find(size =>
          size.width === product.width && 
          size.height === product.height && 
          size.depth === product.depth
        )!
        existingSize.product_count += 1
        existingSize.price_range.min = Math.min(existingSize.price_range.min, product.min_price)
        existingSize.price_range.max = Math.max(existingSize.price_range.max, product.max_price)
      }
    }
  })

  return Array.from(consolidatedMap.values())
}

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Product API
export const productApi = {
  // New consolidated catalog API (with fallback to legacy)
  getCatalog: async (params: ConsolidatedSearchParams = {}): Promise<ConsolidatedCabinetType[]> => {
    try {
      const response = await api.get<ApiResponse<ConsolidatedCabinetType[]>>('/products/consolidated', {
        params,
      })
      return response.data.data
    } catch (error) {
      console.warn('Consolidated catalog not available, falling back to simulated consolidated data')
      // Fallback to legacy catalog and simulate consolidated structure
      const legacyResponse = await api.get<ApiResponse<Product[]>>('/products', {
        params: {
          ...params,
          limit: params.limit || 100
        },
      })
      return simulateConsolidatedCatalog(legacyResponse.data.data)
    }
  },

  // Legacy individual products catalog
  getLegacyCatalog: async (params: ProductSearchParams = {}): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products', {
      params,
    })
    return response.data.data
  },

  // Get consolidated cabinet type details (with fallback)
  getConsolidatedCabinetType: async (baseCabinetType: string): Promise<ConsolidatedCabinetType> => {
    try {
      const response = await api.get<ApiResponse<ConsolidatedCabinetType>>(`/products/consolidated/${baseCabinetType}`)
      return response.data.data
    } catch (error) {
      // Fallback: get all products and find matching ones
      const products = await productApi.getLegacyCatalog({ q: baseCabinetType, limit: 100 })
      const consolidated = simulateConsolidatedCatalog(products)
      const found = consolidated.find(c => c.base_cabinet_type === baseCabinetType)
      if (!found) throw new Error(`Cabinet type ${baseCabinetType} not found`)
      return found
    }
  },

  // Get available sizes for a consolidated cabinet type (with fallback)
  getAvailableSizes: async (baseCabinetType: string): Promise<CabinetSize[]> => {
    try {
      const response = await api.get<ApiResponse<CabinetSize[]>>(`/products/consolidated/${baseCabinetType}/sizes`)
      return response.data.data
    } catch (error) {
      // Fallback: get cabinet type and return sizes
      const cabinetType = await productApi.getConsolidatedCabinetType(baseCabinetType)
      return cabinetType.available_sizes
    }
  },

  // Get products by size for a consolidated cabinet type (with fallback)
  getProductsBySize: async (baseCabinetType: string, size: string): Promise<Product[]> => {
    try {
      const response = await api.get<ApiResponse<Product[]>>(`/products/consolidated/${baseCabinetType}/products/${size}`)
      return response.data.data
    } catch (error) {
      // Fallback: get products matching the cabinet type and size
      const [width, height, depth] = size.split('x').map(Number)
      const products = await productApi.getLegacyCatalog({ 
        q: baseCabinetType, 
        width_min: width, 
        width_max: width,
        height_min: height,
        height_max: height,
        depth_min: depth,
        depth_max: depth,
        limit: 100 
      })
      return products.filter(p => 
        p.name.includes(baseCabinetType) && 
        p.width === width && 
        p.height === height && 
        p.depth === depth
      )
    }
  },

  searchProducts: async (query: string, limit = 20): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products/search', {
      params: { q: query, limit },
    })
    return response.data.data
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`)
    return response.data.data
  },

  getFilters: async (): Promise<ProductFilters> => {
    const response = await api.get<ApiResponse<ProductFilters>>('/products/filters')
    return response.data.data
  },

  getCategories: async (): Promise<CabinetCategory[]> => {
    const response = await api.get<ApiResponse<CabinetCategory[]>>('/products/categories')
    return response.data.data
  },

  getCabinetTypes: async (): Promise<CabinetType[]> => {
    const response = await api.get<ApiResponse<CabinetType[]>>('/products/cabinet-types')
    return response.data.data
  },

  getColorOptions: async (): Promise<ColorOption[]> => {
    const response = await api.get<ApiResponse<ColorOption[]>>('/color-options')
    return response.data.data
  },

  getBoxMaterials: async (): Promise<BoxMaterial[]> => {
    const response = await api.get<ApiResponse<BoxMaterial[]>>('/box-materials')
    return response.data.data
  },

  getPopularProducts: async (limit = 12): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products/popular', {
      params: { limit },
    })
    return response.data.data
  },
}

// Quote API
export const quoteApi = {
  getQuotes: async (customerId?: string): Promise<Quote[]> => {
    const response = await api.get<ApiResponse<Quote[]>>('/quotes', {
      params: customerId ? { customer_id: customerId } : {},
    })
    return response.data.data
  },

  getQuote: async (id: string): Promise<Quote> => {
    const response = await api.get<ApiResponse<Quote>>(`/quotes/${id}`)
    return response.data.data
  },

  createQuote: async (quoteData: CreateQuoteRequest): Promise<Quote> => {
    const response = await api.post<ApiResponse<Quote>>('/quotes', quoteData)
    return response.data.data
  },

  updateQuote: async (id: string, quoteData: Partial<CreateQuoteRequest>): Promise<Quote> => {
    const response = await api.put<ApiResponse<Quote>>(`/quotes/${id}`, quoteData)
    return response.data.data
  },

  deleteQuote: async (id: string): Promise<void> => {
    await api.delete(`/quotes/${id}`)
  },

  sendQuote: async (id: string): Promise<Quote> => {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${id}/send`)
    return response.data.data
  },
}

// Customer API
export const customerApi = {
  getCustomers: async (): Promise<Customer[]> => {
    const response = await api.get<ApiResponse<Customer[]>>('/customers')
    return response.data.data
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`)
    return response.data.data
  },

  createCustomer: async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const response = await api.post<ApiResponse<Customer>>('/customers', customerData)
    return response.data.data
  },

  updateCustomer: async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, customerData)
    return response.data.data
  },
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('auth_token')
  },

  me: async () => {
    const response = await api.get('/auth/me')
    return response.data.data
  },
}

export default api