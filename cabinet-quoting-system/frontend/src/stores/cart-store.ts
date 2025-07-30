import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cart, CartItem, Product, ProductVariant, BoxMaterial } from '@/types'

interface CartStore {
  cart: Cart
  addItem: (
    product: Product,
    variant: ProductVariant,
    boxMaterial: BoxMaterial,
    quantity: number,
    unitPrice: number
  ) => void
  removeItem: (productVariantId: string, boxMaterialId: string) => void
  updateQuantity: (productVariantId: string, boxMaterialId: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
}

const initialCart: Cart = {
  items: [],
  subtotal: 0,
  taxAmount: 0,
  totalAmount: 0,
  itemCount: 0,
}

const TAX_RATE = 0.08 // 8% tax rate

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: initialCart,

      addItem: (product, variant, boxMaterial, quantity, unitPrice) => {
        set((state) => {
          const existingItemIndex = state.cart.items.findIndex(
            (item) =>
              item.productVariantId === variant.id &&
              item.boxMaterialId === boxMaterial.id
          )

          let newItems: CartItem[]

          if (existingItemIndex >= 0) {
            // Update existing item
            newItems = [...state.cart.items]
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + quantity,
              lineTotal: (newItems[existingItemIndex].quantity + quantity) * unitPrice,
            }
          } else {
            // Add new item
            const newItem: CartItem = {
              productVariantId: variant.id,
              boxMaterialId: boxMaterial.id,
              quantity,
              product,
              variant,
              boxMaterial,
              unitPrice,
              lineTotal: quantity * unitPrice,
            }
            newItems = [...state.cart.items, newItem]
          }

          const subtotal = newItems.reduce((sum, item) => sum + item.lineTotal, 0)
          const taxAmount = subtotal * TAX_RATE
          const totalAmount = subtotal + taxAmount
          const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

          return {
            cart: {
              items: newItems,
              subtotal,
              taxAmount,
              totalAmount,
              itemCount,
            },
          }
        })
      },

      removeItem: (productVariantId, boxMaterialId) => {
        set((state) => {
          const newItems = state.cart.items.filter(
            (item) =>
              !(item.productVariantId === productVariantId && item.boxMaterialId === boxMaterialId)
          )

          const subtotal = newItems.reduce((sum, item) => sum + item.lineTotal, 0)
          const taxAmount = subtotal * TAX_RATE
          const totalAmount = subtotal + taxAmount
          const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

          return {
            cart: {
              items: newItems,
              subtotal,
              taxAmount,
              totalAmount,
              itemCount,
            },
          }
        })
      },

      updateQuantity: (productVariantId, boxMaterialId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productVariantId, boxMaterialId)
          return
        }

        set((state) => {
          const newItems = state.cart.items.map((item) => {
            if (item.productVariantId === productVariantId && item.boxMaterialId === boxMaterialId) {
              return {
                ...item,
                quantity,
                lineTotal: quantity * item.unitPrice,
              }
            }
            return item
          })

          const subtotal = newItems.reduce((sum, item) => sum + item.lineTotal, 0)
          const taxAmount = subtotal * TAX_RATE
          const totalAmount = subtotal + taxAmount
          const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

          return {
            cart: {
              items: newItems,
              subtotal,
              taxAmount,
              totalAmount,
              itemCount,
            },
          }
        })
      },

      clearCart: () => {
        set({ cart: initialCart })
      },

      getItemCount: () => {
        const state = get()
        return state.cart.itemCount
      },

      getSubtotal: () => {
        const state = get()
        return state.cart.subtotal
      },
    }),
    {
      name: 'cabinet-cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
)