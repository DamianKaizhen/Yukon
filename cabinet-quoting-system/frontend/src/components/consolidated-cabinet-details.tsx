"use client"

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { productApi } from '@/lib/api'
import { formatPrice, formatDimensions } from '@/lib/utils'
import { toast } from 'sonner'
import { useCartStore } from '@/stores/cart-store'
import { ArrowLeft, Package, Ruler, DoorOpen, Archive, Layers, Eye, ShoppingCart, Palette, Minus, Plus } from 'lucide-react'
import type { ConsolidatedCabinetType, CabinetSize, Product, ColorOption, BoxMaterial, ProductVariant } from '@/types'

interface ConsolidatedCabinetDetailsProps {
  baseCabinetType: string
  selectedSize?: string
}

export function ConsolidatedCabinetDetails({ baseCabinetType, selectedSize }: ConsolidatedCabinetDetailsProps) {
  const router = useRouter()
  const { addItem: addToCart } = useCartStore()
  const [currentSelectedSize, setCurrentSelectedSize] = useState<string>(selectedSize || '')
  const [selectedColorId, setSelectedColorId] = useState<string>('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch consolidated cabinet type details
  const { data: cabinetType, isLoading: cabinetLoading, error } = useQuery({
    queryKey: ['consolidated-cabinet', baseCabinetType],
    queryFn: () => productApi.getConsolidatedCabinetType(baseCabinetType),
  })

  // Fetch available sizes
  const { data: availableSizes } = useQuery({
    queryKey: ['cabinet-sizes', baseCabinetType],
    queryFn: () => productApi.getAvailableSizes(baseCabinetType),
    enabled: !!cabinetType,
  })

  // Fetch products for selected size
  const { data: productsForSize, isLoading: productsLoading } = useQuery({
    queryKey: ['cabinet-products', baseCabinetType, currentSelectedSize],
    queryFn: () => productApi.getProductsBySize(baseCabinetType, currentSelectedSize),
    enabled: !!currentSelectedSize,
  })

  // Fetch color options
  const { data: colorOptions } = useQuery({
    queryKey: ['color-options'],
    queryFn: () => productApi.getColorOptions(),
  })

  // Fetch box materials
  const { data: boxMaterials } = useQuery({
    queryKey: ['box-materials'],
    queryFn: () => productApi.getBoxMaterials(),
  })

  // Fetch all cabinets for error handling (always fetch, but only use when needed)
  const { data: allCabinets } = useQuery({
    queryKey: ['all-consolidated-cabinets'],
    queryFn: () => productApi.getCatalog({ limit: 100 }),
  })

  // Fetch product details when a product is selected
  const { data: productDetails, isLoading: productDetailsLoading } = useQuery({
    queryKey: ['product-details', selectedProduct?.id],
    queryFn: () => productApi.getProduct(selectedProduct!.id),
    enabled: !!selectedProduct,
  })

  // Set default selections
  useEffect(() => {
    if (availableSizes?.length && !currentSelectedSize) {
      const firstSize = availableSizes[0]
      setCurrentSelectedSize(`${firstSize.width}x${firstSize.height}x${firstSize.depth}`)
    }
  }, [availableSizes, currentSelectedSize])

  useEffect(() => {
    if (productsForSize?.length && !selectedProduct) {
      setSelectedProduct(productsForSize[0])
    }
  }, [productsForSize, selectedProduct])

  useEffect(() => {
    if (colorOptions?.length && !selectedColorId) {
      setSelectedColorId(colorOptions[0].id)
    }
  }, [colorOptions, selectedColorId])

  useEffect(() => {
    if (boxMaterials?.length && !selectedMaterialId) {
      setSelectedMaterialId(boxMaterials[0].id)
    }
  }, [boxMaterials, selectedMaterialId])

  useEffect(() => {
    if (productDetails?.variants?.length && selectedColorId) {
      const variant = productDetails.variants.find(v => v.color_option_id === selectedColorId)
      setSelectedVariant(variant || null)
    }
  }, [productDetails, selectedColorId])

  const handleViewProduct = (product: Product) => {
    router.push(`/products/${product.id}`)
  }

  const handleAddToCart = async () => {
    if (!selectedProduct || !selectedVariant || !selectedMaterialId) {
      toast.error('Please select size, color, and material')
      return
    }

    const selectedMaterial = boxMaterials?.find(m => m.id === selectedMaterialId)
    if (!selectedMaterial) {
      toast.error('Selected material not found')
      return
    }

    // Get the price for the selected variant and material
    const pricing = selectedVariant.pricing?.find(p => p.box_material_id === selectedMaterialId)
    if (!pricing) {
      toast.error('Pricing not available for selected options')
      return
    }

    setIsLoading(true)
    try {
      addToCart(selectedProduct, selectedVariant, selectedMaterial, quantity, pricing.price)
      toast.success(`Added ${quantity} ${selectedProduct.width}"W ${baseCabinetType} to cart`)
      
      // Optionally redirect to cart or continue shopping
      // router.push('/cart')
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add to cart')
    } finally {
      setIsLoading(false)
    }
  }

  const getSelectedSizeInfo = (): CabinetSize | undefined => {
    return availableSizes?.find(size => 
      `${size.width}x${size.height}x${size.depth}` === currentSelectedSize
    )
  }

  const getCurrentPrice = (): { min: number; max: number } | null => {
    if (!selectedVariant || !selectedMaterialId) {
      return selectedProduct ? { min: selectedProduct.min_price, max: selectedProduct.max_price } : null
    }

    const pricing = selectedVariant.pricing?.find(p => p.box_material_id === selectedMaterialId)
    return pricing ? { min: pricing.price, max: pricing.price } : null
  }

  const selectedSizeInfo = getSelectedSizeInfo()
  const currentPrice = getCurrentPrice()

  if (cabinetLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-6 py-8">
        <LoadingSkeleton count={1} className="h-96" />
      </div>
    )
  }

  // Try to find a cabinet that matches the search term (only when cabinet type not found)
  const suggestedCabinet = (error || !cabinetType) && allCabinets?.find(cabinet => 
    cabinet.display_name.toLowerCase().includes(baseCabinetType.toLowerCase()) ||
    cabinet.base_cabinet_type.toLowerCase() === baseCabinetType.toLowerCase()
  )

  if (error || !cabinetType) {
    return (
      <div className="container max-w-6xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Cabinet type "{baseCabinetType}" not found</p>
            
            {suggestedCabinet ? (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">Did you mean:</p>
                <Card className="max-w-md mx-auto">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{suggestedCabinet.display_name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{suggestedCabinet.base_cabinet_type}</p>
                    <Button 
                      onClick={() => router.push(`/cabinets/${suggestedCabinet.base_cabinet_type}`)}
                      className="w-full"
                    >
                      View This Cabinet
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Here are some available cabinet types:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-lg mx-auto">
                  {allCabinets?.slice(0, 6).map(cabinet => (
                    <Button
                      key={cabinet.base_cabinet_type}
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/cabinets/${cabinet.base_cabinet_type}`)}
                      className="text-xs"
                    >
                      {cabinet.base_cabinet_type}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
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
        {/* Cabinet Information */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">{cabinetType.display_name}</CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {cabinetType.base_cabinet_type}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category and Type */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-5 w-5" />
              <span>{cabinetType.category_name} • {cabinetType.type_name}</span>
            </div>

            {/* Description */}
            {cabinetType.description && (
              <p className="text-muted-foreground">{cabinetType.description}</p>
            )}

            {/* Specifications */}
            <div className="space-y-4">
              <h3 className="font-semibold">Specifications</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Doors:</span>
                    <span className="font-medium">{cabinetType.door_count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Drawers:</span>
                    <span className="font-medium">{cabinetType.drawer_count}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Sizes:</span>
                    <span className="font-medium">{availableSizes?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Variants:</span>
                    <span className="font-medium">{cabinetType.total_variants}</span>
                  </div>
                </div>
              </div>

              {cabinetType.is_left_right && (
                <Badge variant="outline">Left/Right Orientation Available</Badge>
              )}
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <h3 className="font-semibold">Price Range</h3>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(cabinetType.min_price)} - {formatPrice(cabinetType.max_price)}
              </p>
              <p className="text-sm text-muted-foreground">
                Prices vary by size, finish, and materials
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Cabinet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Size Selection */}
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={currentSelectedSize} onValueChange={setCurrentSelectedSize}>
                <SelectTrigger id="size">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes?.map((size) => {
                    const sizeKey = `${size.width}x${size.height}x${size.depth}`
                    return (
                      <SelectItem key={sizeKey} value={sizeKey}>
                        <div className="flex flex-col">
                          <span className="font-medium">{size.width}"W Cabinet ({formatDimensions(size.width, size.height, size.depth)})</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(size.price_range.min)} - {formatPrice(size.price_range.max)} • {size.product_count} product{size.product_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection (if multiple products for size) */}
            {productsForSize && productsForSize.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="product">Product Variant</Label>
                <Select 
                  value={selectedProduct?.id || ''} 
                  onValueChange={(value) => setSelectedProduct(productsForSize.find(p => p.id === value) || null)}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsForSize.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {product.item_code} • {formatPrice(product.min_price)} - {formatPrice(product.max_price)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color Selection */}
            <div className="space-y-2">
              <Label htmlFor="color" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color/Finish
              </Label>
              <Select value={selectedColorId} onValueChange={setSelectedColorId}>
                <SelectTrigger id="color">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions?.map((color) => (
                    <SelectItem key={color.id} value={color.id}>
                      <div className="flex flex-col">
                        <span>{color.display_name}</span>
                        {color.description && (
                          <span className="text-xs text-muted-foreground">{color.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Material Selection */}
            <div className="space-y-2">
              <Label htmlFor="material" className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Box Material
              </Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger id="material">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {boxMaterials?.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      <div className="flex flex-col">
                        <span>{material.name}</span>
                        <span className="text-xs text-muted-foreground">{material.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity Selection */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="99"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  disabled={quantity >= 99}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Configuration Summary */}
            {selectedSizeInfo && currentPrice && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Configuration Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <p className="font-medium">{selectedSizeInfo.width}"W Cabinet</p>
                    <p className="text-xs text-muted-foreground">{formatDimensions(selectedSizeInfo.width, selectedSizeInfo.height, selectedSizeInfo.depth)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <p className="font-medium">{quantity}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Color:</span>
                    <p className="font-medium">{colorOptions?.find(c => c.id === selectedColorId)?.display_name || 'Not selected'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Material:</span>
                    <p className="font-medium">{boxMaterials?.find(m => m.id === selectedMaterialId)?.name || 'Not selected'}</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="font-bold text-lg text-primary">
                    {currentPrice.min === currentPrice.max 
                      ? formatPrice(currentPrice.min)
                      : `${formatPrice(currentPrice.min)} - ${formatPrice(currentPrice.max)}`
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">
                    {currentPrice.min === currentPrice.max 
                      ? formatPrice(currentPrice.min * quantity)
                      : `${formatPrice(currentPrice.min * quantity)} - ${formatPrice(currentPrice.max * quantity)}`
                    }
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleAddToCart}
                disabled={!selectedProduct || !selectedColorId || !selectedMaterialId || isLoading || productDetailsLoading}
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isLoading ? 'Adding to Cart...' : `Add ${quantity} to Cart`}
              </Button>

              {(!selectedColorId || !selectedMaterialId) && (
                <p className="text-xs text-center text-muted-foreground">
                  Please select color and material to add to cart
                </p>
              )}
            </div>

            {/* Available Products for Selected Size */}
            {productsForSize && productsForSize.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Available Products ({productsForSize.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {productsForSize.map((product) => (
                    <Card key={product.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.width}"W {baseCabinetType}</p>
                          <p className="text-xs text-muted-foreground">{product.item_code} • {product.variant_count} finishes</p>
                          <p className="text-sm font-medium text-primary">
                            {formatPrice(product.min_price)} - {formatPrice(product.max_price)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewProduct(product)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {productsLoading && currentSelectedSize && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}