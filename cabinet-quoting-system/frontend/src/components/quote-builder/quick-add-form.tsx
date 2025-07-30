"use client"

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCartStore } from '@/stores/cart-store'
import { productApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function QuickAddForm() {
  const addItem = useCartStore((state) => state.addItem)
  
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedColorId, setSelectedColorId] = useState<string>('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  // Search products
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['product-search', searchValue],
    queryFn: () => productApi.searchProducts(searchValue),
    enabled: searchValue.length >= 2,
  })

  // Get selected product details
  const { data: selectedProduct, isLoading: productLoading } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null
      const response = await fetch(`/api/products/${selectedProductId}`)
      const data = await response.json()
      return data.data
    },
    enabled: !!selectedProductId,
  })

  // Reset selections when product changes
  useEffect(() => {
    if (selectedProduct?.variants?.length) {
      setSelectedColorId(selectedProduct.variants[0].color_option_id)
    }
  }, [selectedProduct])

  useEffect(() => {
    const selectedVariant = selectedProduct?.variants?.find(v => v.color_option_id === selectedColorId)
    if (selectedVariant?.pricing?.length) {
      setSelectedMaterialId(selectedVariant.pricing[0].box_material_id)
    }
  }, [selectedProduct, selectedColorId])

  const selectedVariant = selectedProduct?.variants?.find(v => v.color_option_id === selectedColorId)
  const selectedPricing = selectedVariant?.pricing?.find(p => p.box_material_id === selectedMaterialId)

  const handleAddToQuote = async () => {
    if (!selectedProduct || !selectedVariant || !selectedPricing) {
      toast.error('Please select all options')
      return
    }

    setIsAdding(true)
    
    try {
      // Create objects matching the cart store expectations
      const productForCart = {
        ...selectedProduct,
        min_price: selectedPricing.price,
        max_price: selectedPricing.price,
        variant_count: selectedProduct.variants.length
      }
      
      const variantForCart = {
        id: selectedVariant.id,
        product_id: selectedProduct.id,
        color_option_id: selectedVariant.color_option_id,
        sku: selectedVariant.sku,
        color_option: {
          id: selectedVariant.color_option_id,
          name: selectedVariant.color_name,
          display_name: selectedVariant.color_display_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        pricing: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
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
      
      toast.success(`Added ${quantity} × ${selectedProduct.name} to quote`)
      
      // Reset form
      setSearchValue('')
      setSelectedProductId('')
      setSelectedColorId('')
      setSelectedMaterialId('')
      setQuantity(1)
      setOpen(false)
    } catch (error) {
      console.error('Error adding to quote:', error)
      toast.error('Failed to add item to quote')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Add Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Search */}
        <div className="space-y-2">
          <Label>Search Product by Item Code or Name</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedProductId && selectedProduct
                  ? `${selectedProduct.item_code} - ${selectedProduct.name}`
                  : "Search for a product..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput 
                  placeholder="Enter item code or name..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : searchValue.length < 2 ? (
                      "Type at least 2 characters to search..."
                    ) : (
                      "No products found."
                    )}
                  </CommandEmpty>
                  {searchResults && searchResults.length > 0 && (
                    <CommandGroup>
                      {searchResults.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
                          onSelect={(value) => {
                            setSelectedProductId(value)
                            setOpen(false)
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{product.item_code}</span>
                            <span className="text-sm text-muted-foreground">
                              {product.name}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Product Configuration */}
        {productLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {selectedProduct && (
          <>
            {/* Color Selection */}
            <div className="space-y-2">
              <Label>Finish Color</Label>
              <Select value={selectedColorId} onValueChange={setSelectedColorId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants?.map((variant: any) => (
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
                <Label>Box Material</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedVariant.pricing?.map((pricing: any) => (
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
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
            </div>

            {/* Price Display */}
            {selectedPricing && (
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Line Total:</span>
                  <span className="text-lg font-bold">
                    {formatPrice(selectedPricing.price * quantity)}
                  </span>
                </div>
              </div>
            )}

            {/* Add Button */}
            <Button
              onClick={handleAddToQuote}
              disabled={!selectedColorId || !selectedMaterialId || isAdding}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAdding ? 'Adding...' : 'Add to Quote'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}