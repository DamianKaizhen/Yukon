"use client"

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/stores/cart-store'
import { productApi } from '@/lib/api'
import { formatPrice, formatDimensions } from '@/lib/utils'
import { toast } from 'sonner'
import { ShoppingCart, ArrowLeft, Package, Ruler, DoorOpen, Archive } from 'lucide-react'
import type { ColorOption, BoxMaterial } from '@/types'

interface ProductDetailsProps {
  productId: string
}

interface ProductVariant {
  id: string
  sku: string
  color_option_id: string
  color_name: string
  color_display_name: string
  pricing: Array<{
    box_material_id: string
    box_material_code: string
    box_material_name: string
    price: number
  }>
}

interface ProductWithVariants {
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
  variants: ProductVariant[]
  created_at: string
  updated_at: string
}

export function ProductDetails({ productId }: ProductDetailsProps) {
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)
  
  const [selectedColorId, setSelectedColorId] = useState<string>('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  // Fetch product details with variants
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/products/${productId}`)
      const data = await response.json()
      return data.data as ProductWithVariants
    }
  })

  // Fetch color options
  const { data: colorOptions } = useQuery({
    queryKey: ['color-options'],
    queryFn: productApi.getColorOptions
  })

  // Fetch box materials
  const { data: boxMaterials } = useQuery({
    queryKey: ['box-materials'],
    queryFn: productApi.getBoxMaterials
  })

  // Set default selections when data loads
  useEffect(() => {
    if (product?.variants?.length && !selectedColorId) {
      setSelectedColorId(product.variants[0].color_option_id)
    }
  }, [product, selectedColorId])

  // Get selected variant
  const selectedVariant = product?.variants?.find(v => v.color_option_id === selectedColorId)

  useEffect(() => {
    if (selectedVariant?.pricing?.length && !selectedMaterialId) {
      setSelectedMaterialId(selectedVariant.pricing[0].box_material_id)
    }
  }, [selectedVariant, selectedMaterialId])
  
  // Get selected pricing
  const selectedPricing = selectedVariant?.pricing?.find(p => p.box_material_id === selectedMaterialId)
  
  const handleAddToCart = async () => {
    if (!product || !selectedVariant || !selectedPricing) {
      toast.error('Please select all options')
      return
    }

    setIsAdding(true)
    
    try {
      // Create a product object that matches the expected type
      const productForCart = {
        ...product,
        min_price: selectedPricing.price,
        max_price: selectedPricing.price,
        variant_count: product.variants.length
      }
      
      // Create a variant object that matches the expected type
      const variantForCart = {
        id: selectedVariant.id,
        product_id: product.id,
        color_option_id: selectedVariant.color_option_id,
        sku: selectedVariant.sku,
        color_option: {
          id: selectedVariant.color_option_id,
          name: selectedVariant.color_name,
          display_name: selectedVariant.color_display_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        pricing: selectedVariant.pricing.map(p => ({
          id: '',
          product_variant_id: selectedVariant.id,
          box_material_id: p.box_material_id,
          price: p.price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Create a box material object
      const boxMaterialForCart = {
        id: selectedPricing.box_material_id,
        code: selectedPricing.box_material_code,
        name: selectedPricing.box_material_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      addItem(
        productForCart,
        variantForCart,
        boxMaterialForCart,
        quantity,
        selectedPricing.price
      )
      
      toast.success(`${product.name} added to cart`, {
        description: `${selectedVariant.color_display_name} • ${selectedPricing.box_material_name}`
      })
      
      // Navigate to cart after a short delay
      setTimeout(() => {
        router.push('/cart')
      }, 500)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart')
    } finally {
      setIsAdding(false)
    }
  }

  if (productLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-6 py-8">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container max-w-6xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Product not found</p>
            <Button onClick={() => router.push('/catalog')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto px-6 py-8">
      <Button
        onClick={() => router.push('/catalog')}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Catalog
      </Button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Product Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">{product.name}</CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {product.item_code}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category and Type */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-5 w-5" />
              <span>{product.category_name} • {product.type_name}</span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}

            {/* Specifications */}
            <div className="space-y-4">
              <h3 className="font-semibold">Specifications</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Dimensions:</span>
                  </div>
                  <p className="font-medium">
                    {formatDimensions(product.width, product.height, product.depth)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Doors:</span>
                    <span className="font-medium">{product.door_count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Drawers:</span>
                    <span className="font-medium">{product.drawer_count}</span>
                  </div>
                </div>
              </div>

              {product.is_left_right && (
                <Badge variant="outline">Left/Right Orientation Available</Badge>
              )}
            </div>

            {/* Available Options */}
            <div className="space-y-2">
              <h3 className="font-semibold">Available Options</h3>
              <p className="text-sm text-muted-foreground">
                {product.variants.length} color finishes • 
                {selectedVariant ? ` ${selectedVariant.pricing.length} material options` : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuration and Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Cabinet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Selection */}
            <div className="space-y-2">
              <Label htmlFor="color">Finish Color</Label>
              <Select value={selectedColorId} onValueChange={setSelectedColorId}>
                <SelectTrigger id="color">
                  <SelectValue placeholder="Select a finish" />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.color_option_id}>
                      {variant.color_display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Material Selection */}
            {selectedVariant && (
              <div className="space-y-2">
                <Label htmlFor="material">Box Material</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                  <SelectTrigger id="material">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedVariant.pricing.map((pricing) => (
                      <SelectItem key={pricing.box_material_id} value={pricing.box_material_id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{pricing.box_material_name}</span>
                          <span className="ml-4 font-medium">
                            {formatPrice(pricing.price)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
            </div>

            <Separator />

            {/* Pricing Summary */}
            {selectedPricing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="text-lg font-medium">
                    {formatPrice(selectedPricing.price)}
                  </span>
                </div>
                {quantity > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(selectedPricing.price * quantity)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!selectedColorId || !selectedMaterialId || isAdding}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </Button>

            {/* Selected Configuration Summary */}
            {selectedVariant && selectedPricing && (
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium">Selected Configuration:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVariant.color_display_name} • {selectedPricing.box_material_name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}