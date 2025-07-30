"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cart-store'
import { formatPrice, formatDimensions } from '@/lib/utils'
import type { CartItem } from '@/types'
import { Minus, Plus, Trash2, Package } from 'lucide-react'

interface QuoteItemCardProps {
  item: CartItem
}

export function QuoteItemCard({ item }: QuoteItemCardProps) {
  const { updateQuantity, removeItem } = useCartStore()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleQuantityChange = async (newQuantity: number) => {
    setIsUpdating(true)
    updateQuantity(item.productVariantId, item.boxMaterialId, newQuantity)
    setTimeout(() => setIsUpdating(false), 200)
  }

  const handleRemove = () => {
    removeItem(item.productVariantId, item.boxMaterialId)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Product Image Placeholder */}
          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center shrink-0">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Product Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-2 mb-1">
                  {item.product.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.product.item_code}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {item.product.category_name}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Dimensions:</span>{' '}
                    {formatDimensions(item.product.width, item.product.height, item.product.depth)}
                  </p>
                  <p>
                    <span className="font-medium">Finish:</span>{' '}
                    {item.variant.color_option.display_name}
                  </p>
                  <p>
                    <span className="font-medium">Material:</span>{' '}
                    {item.boxMaterial.name}
                  </p>
                </div>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Quantity and Pricing */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(item.quantity - 1)}
                    disabled={item.quantity <= 1 || isUpdating}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(item.quantity + 1)}
                    disabled={isUpdating}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.unitPrice)} × {item.quantity}
                </p>
                <p className="text-lg font-semibold">
                  {formatPrice(item.lineTotal)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}