"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCartStore } from '@/stores/cart-store'
import { productApi } from '@/lib/api'
import { formatPrice, formatDimensions } from '@/lib/utils'
import type { ProductVariant, BoxMaterial } from '@/types'
import { 
  ArrowLeft, 
  ShoppingCart, 
  Heart, 
  Package, 
  Ruler, 
  Palette,
  Info,
  Plus,
  Minus
} from 'lucide-react'
import { toast } from 'sonner'

interface ProductDetailProps {
  productId: string
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<BoxMaterial | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  
  const addItem = useCartStore((state) => state.addItem)

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getProduct(productId),
  })

  // Set default selections when product loads
  useState(() => {
    if (product && !selectedVariant) {
      setSelectedVariant(product.variants[0] || null)
    }
    if (selectedVariant && !selectedMaterial) {
      setSelectedMaterial(selectedVariant.pricing[0]?.box_material || null)
    }
  }, [product, selectedVariant])

  const handleVariantChange = (variantId: string) => {
    const variant = product?.variants.find(v => v.id === variantId)
    if (variant) {
      setSelectedVariant(variant)
      setSelectedMaterial(variant.pricing[0]?.box_material || null)
    }
  }

  const handleMaterialChange = (materialId: string) => {
    const material = selectedVariant?.pricing.find(p => p.box_material.id === materialId)?.box_material
    if (material) {
      setSelectedMaterial(material)
    }
  }

  const getCurrentPrice = () => {
    if (!selectedVariant || !selectedMaterial) return 0
    const pricing = selectedVariant.pricing.find(p => p.box_material.id === selectedMaterial.id)
    return pricing?.price || 0
  }

  const handleAddToCart = async () => {
    if (!product || !selectedVariant || !selectedMaterial) {
      toast.error('Please select all options')
      return
    }

    setIsAdding(true)
    
    try {
      addItem(
        product,
        selectedVariant,
        selectedMaterial,
        quantity,
        getCurrentPrice()
      )
      
      toast.success(`${product.name} added to cart`)
    } catch (error) {
      toast.error('Failed to add item to cart')
    } finally {
      setIsAdding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-96 bg-muted rounded" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Product not found</p>
        <Button asChild>
          <Link href="/catalog">Back to Catalog</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/catalog" className="hover:text-foreground">
          Cabinet Catalog
        </Link>
        <span>/</span>
        <span>{product.category_name}</span>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      {/* Back Button */}
      <Button variant="outline" asChild>
        <Link href="/catalog">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Link>
      </Button>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Product Image Placeholder */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <Package className="h-24 w-24 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded border-2 border-transparent hover:border-primary cursor-pointer" />
            ))}
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{product.item_code}</Badge>
              <Badge variant="outline">{product.category_name}</Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl font-semibold text-primary">
              {formatPrice(getCurrentPrice())}
            </p>
          </div>

          {/* Product Description */}
          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Dimensions</span>
                <p className="font-medium">
                  {formatDimensions(product.width, product.height, product.depth)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">{product.type_name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Doors</span>
                <p className="font-medium">{product.door_count}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Drawers</span>
                <p className="font-medium">{product.drawer_count}</p>
              </div>
              {product.is_left_right && (
                <div>
                  <span className="text-sm text-muted-foreground">Configuration</span>
                  <p className="font-medium">Left/Right Available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variant Selection */}
          {product.variants.length > 1 && (
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Finish
              </label>
              <Select
                value={selectedVariant?.id || ''}
                onValueChange={handleVariantChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a finish" />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.color_option.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Material Selection */}
          {selectedVariant && selectedVariant.pricing.length > 1 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Material</label>
              <Select
                value={selectedMaterial?.id || ''}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a material" />
                </SelectTrigger>
                <SelectContent>
                  {selectedVariant.pricing.map((pricing) => (
                    <SelectItem key={pricing.box_material.id} value={pricing.box_material.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{pricing.box_material.name}</span>
                        <span className="ml-4 font-semibold">
                          {formatPrice(pricing.price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quantity</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleAddToCart}
              disabled={isAdding || !selectedVariant || !selectedMaterial}
              className="flex-1"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isAdding ? 'Adding...' : `Add to Cart - ${formatPrice(getCurrentPrice() * quantity)}`}
            </Button>
            <Button variant="outline" size="lg">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          {/* Additional Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="mb-1">
                    Free shipping on orders over $500. Professional installation available.
                  </p>
                  <p>
                    Contact our design team for custom configurations and bulk pricing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}