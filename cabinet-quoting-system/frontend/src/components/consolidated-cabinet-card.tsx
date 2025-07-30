"use client"

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPrice, formatDimensions } from '@/lib/utils'
import type { ConsolidatedCabinetType, CabinetSize } from '@/types'
import { ShoppingCart, Eye, Heart, Package, Ruler, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { productApi } from '@/lib/api'

interface ConsolidatedCabinetCardProps {
  cabinet: ConsolidatedCabinetType
  showAddToCart?: boolean
}

export function ConsolidatedCabinetCard({ cabinet, showAddToCart = true }: ConsolidatedCabinetCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Get available sizes for this cabinet type
  const { data: availableSizes } = useQuery({
    queryKey: ['cabinet-sizes', cabinet.base_cabinet_type],
    queryFn: () => productApi.getAvailableSizes(cabinet.base_cabinet_type),
    enabled: cabinet.available_sizes.length === 0 // Only fetch if not already provided
  })

  const sizes = availableSizes || cabinet.available_sizes

  const handleConfigure = async () => {
    if (!selectedSize) {
      // If no size selected, go to consolidated cabinet details page
      window.location.href = `/cabinets/${cabinet.base_cabinet_type}`
      return
    }

    setIsLoading(true)
    try {
      // Get products for the selected size and redirect to first product
      const products = await productApi.getProductsBySize(cabinet.base_cabinet_type, selectedSize)
      if (products.length > 0) {
        window.location.href = `/products/${products[0].id}`
      } else {
        window.location.href = `/cabinets/${cabinet.base_cabinet_type}?size=${selectedSize}`
      }
    } catch (error) {
      console.error('Error getting products for size:', error)
      window.location.href = `/cabinets/${cabinet.base_cabinet_type}`
    } finally {
      setIsLoading(false)
    }
  }

  const getSelectedSizeInfo = (): CabinetSize | undefined => {
    return sizes.find(size => 
      `${size.width}x${size.height}x${size.depth}` === selectedSize
    )
  }

  const selectedSizeInfo = getSelectedSizeInfo()

  return (
    <Card className="cabinet-card-hover h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {cabinet.display_name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {cabinet.base_cabinet_type}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 h-8 w-8"
            title="Add to favorites"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4" />
              {cabinet.category_name} • {cabinet.type_name}
            </div>
          </div>

          {cabinet.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {cabinet.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doors:</span>
              <span>{cabinet.door_count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Drawers:</span>
              <span>{cabinet.drawer_count}</span>
            </div>
            {cabinet.is_left_right && (
              <Badge variant="outline" className="text-xs">
                L/R Available
              </Badge>
            )}
          </div>

          {/* Size Selection */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ruler className="h-4 w-4" />
              <span>Available Sizes:</span>
            </div>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={`${sizes.length} sizes available`} />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((size) => {
                  const sizeKey = `${size.width}x${size.height}x${size.depth}`
                  return (
                    <SelectItem key={sizeKey} value={sizeKey}>
                      <div className="flex items-center justify-between w-full">
                        <span>{formatDimensions(size.width, size.height, size.depth)}</span>
                        <span className="ml-4 text-xs text-muted-foreground">
                          {formatPrice(size.price_range.min)} - {formatPrice(size.price_range.max)}
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedSizeInfo ? 'Selected size:' : 'Price range:'}
              </span>
              <span className="text-lg font-bold text-primary">
                {selectedSizeInfo ? (
                  `${formatPrice(selectedSizeInfo.price_range.min)} - ${formatPrice(selectedSizeInfo.price_range.max)}`
                ) : (
                  `${formatPrice(cabinet.min_price)} - ${formatPrice(cabinet.max_price)}`
                )}
              </span>
            </div>
            {!selectedSizeInfo && (
              <p className="text-xs text-muted-foreground mt-1">
                <Layers className="inline h-3 w-3 mr-1" />
                {cabinet.total_variants} total variants • {sizes.length} sizes
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/cabinets/${cabinet.base_cabinet_type}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </Button>
        
        {showAddToCart && (
          <Button 
            onClick={handleConfigure}
            disabled={isLoading}
            className="flex-1"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isLoading ? 'Loading...' : 'Configure'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}