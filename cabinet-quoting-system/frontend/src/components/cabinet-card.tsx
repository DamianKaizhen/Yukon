"use client"

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cart-store'
import { formatPrice, formatDimensions } from '@/lib/utils'
import type { Product } from '@/types'
import { ShoppingCart, Eye, Heart, Package } from 'lucide-react'
import { toast } from 'sonner'

interface CabinetCardProps {
  product: Product
  showAddToCart?: boolean
}

export function CabinetCard({ product, showAddToCart = true }: CabinetCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = async () => {
    setIsAdding(true)
    
    try {
      // For now, we'll navigate to product details for configuration
      // In the future, we can add a quick-add modal
      window.location.href = `/products/${product.id}`
    } catch (error) {
      toast.error('Failed to add item to cart')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card className="cabinet-card-hover h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {product.name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {product.item_code}
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
              {product.category_name} • {product.type_name}
            </div>
            <div>
              {formatDimensions(product.width, product.height, product.depth)}
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doors:</span>
              <span>{product.door_count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Drawers:</span>
              <span>{product.drawer_count}</span>
            </div>
            {product.is_left_right && (
              <Badge variant="outline" className="text-xs">
                L/R Available
              </Badge>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Starting at:</span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(product.min_price)}
              </span>
            </div>
            {product.min_price !== product.max_price && (
              <p className="text-xs text-muted-foreground mt-1">
                Up to {formatPrice(product.max_price)} • {product.variant_count} options
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/products/${product.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </Button>
        
        {showAddToCart && (
          <Button 
            onClick={handleAddToCart}
            disabled={isAdding}
            className="flex-1"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Configure
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}