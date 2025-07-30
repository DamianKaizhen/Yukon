"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { 
  ShoppingCart, 
  Minus, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Calculator,
  CreditCard
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const router = useRouter()
  const { cart, updateQuantity, removeItem, clearCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const handleQuantityChange = async (productVariantId: string, boxMaterialId: string, newQuantity: number) => {
    setIsUpdating(`${productVariantId}-${boxMaterialId}`)
    try {
      updateQuantity(productVariantId, boxMaterialId, newQuantity)
    } finally {
      setIsUpdating(null)
    }
  }

  const handleRemoveItem = (productVariantId: string, boxMaterialId: string) => {
    removeItem(productVariantId, boxMaterialId)
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout')
      return
    }
    router.push('/checkout')
  }

  const handleCreateQuote = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/quote-builder')
      return
    }
    router.push('/quote-builder')
  }

  if (cart.items.length === 0) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/catalog">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
        </div>

        <div className="text-center py-16">
          <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Add some cabinets to your cart to get started
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/catalog">
                Browse Catalog
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/quote-builder">
                <Calculator className="mr-2 h-4 w-4" />
                Quote Builder
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalog">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
        <Badge variant="secondary" className="ml-2">
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((item) => {
            const itemKey = `${item.productVariantId}-${item.boxMaterialId}`
            const isItemUpdating = isUpdating === itemKey

            return (
              <Card key={itemKey}>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Product Image Placeholder */}
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-muted-foreground text-center px-2">
                        {item.product.name.substring(0, 10)}...
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.product.description || `${item.product.width}"W × ${item.product.height}"H × ${item.product.depth}"D`}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="outline">
                              {item.variant.color_option.display_name}
                            </Badge>
                            <Badge variant="outline">
                              {item.boxMaterial.name}
                            </Badge>
                            {item.product.door_count > 0 && (
                              <Badge variant="outline">
                                {item.product.door_count} {item.product.door_count === 1 ? 'Door' : 'Doors'}
                              </Badge>
                            )}
                            {item.product.drawer_count > 0 && (
                              <Badge variant="outline">
                                {item.product.drawer_count} {item.product.drawer_count === 1 ? 'Drawer' : 'Drawers'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.productVariantId, item.boxMaterialId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Quantity and Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.productVariantId, item.boxMaterialId, item.quantity - 1)}
                            disabled={isItemUpdating || item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1
                              if (qty !== item.quantity) {
                                handleQuantityChange(item.productVariantId, item.boxMaterialId, qty)
                              }
                            }}
                            className="w-16 h-8 text-center"
                            disabled={isItemUpdating}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.productVariantId, item.boxMaterialId, item.quantity + 1)}
                            disabled={isItemUpdating || item.quantity >= 99}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.unitPrice)} each
                          </p>
                          <p className="font-semibold text-lg">
                            {formatPrice(item.lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Cart Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={() => clearCart()}>
              Clear Cart
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/catalog">
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPrice(cart.taxAmount)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(cart.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCreateQuote}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Create Quote
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-4">
                <p>• Free shipping on orders over $500</p>
                <p>• 30-day return policy</p>
                <p>• Professional installation available</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

