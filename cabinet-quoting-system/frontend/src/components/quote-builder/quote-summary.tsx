"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart-store'
import { formatPrice } from '@/lib/utils'
import { Receipt, Trash2 } from 'lucide-react'

export function QuoteSummary() {
  const cart = useCartStore((state) => state.cart)
  const clearCart = useCartStore((state) => state.clearCart)

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear all items from your quote?')) {
      clearCart()
    }
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Quote Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cart.items.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No items in quote
            </p>
          </div>
        ) : (
          <>
            {/* Items Summary */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items ({cart.itemCount})</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>{formatPrice(cart.taxAmount)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(cart.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button className="w-full" size="lg">
                Save Quote
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleClearCart}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Items
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p className="mb-1">• Free shipping on orders over $500</p>
              <p className="mb-1">• Professional installation available</p>
              <p>• 30-day return policy</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}