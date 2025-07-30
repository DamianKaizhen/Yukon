"use client"

import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowUpDown, Grid, List } from 'lucide-react'

interface CatalogHeaderProps {
  productCount: number
  isLoading: boolean
  currentSort: string
  currentOrder: string
  onSortChange: (sort: string, order: string) => void
}

export function CatalogHeader({
  productCount,
  isLoading,
  currentSort,
  currentOrder,
  onSortChange,
}: CatalogHeaderProps) {
  const handleSortChange = (value: string) => {
    const [sort, order] = value.split('-')
    onSortChange(sort, order)
  }

  const currentSortValue = `${currentSort}-${currentOrder}`

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            'Loading products...'
          ) : (
            `${productCount} cabinet${productCount !== 1 ? 's' : ''} found`
          )}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={currentSortValue} onValueChange={handleSortChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="display_name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="display_name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="base_cabinet_type-asc">Cabinet Type (A-Z)</SelectItem>
              <SelectItem value="base_cabinet_type-desc">Cabinet Type (Z-A)</SelectItem>
              <SelectItem value="category_name-asc">Category (A-Z)</SelectItem>
              <SelectItem value="category_name-desc">Category (Z-A)</SelectItem>
              <SelectItem value="name-asc">Product Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Product Name (Z-A)</SelectItem>
              <SelectItem value="item_code-asc">Item Code (A-Z)</SelectItem>
              <SelectItem value="item_code-desc">Item Code (Z-A)</SelectItem>
              <SelectItem value="width-asc">Width (Small to Large)</SelectItem>
              <SelectItem value="width-desc">Width (Large to Small)</SelectItem>
              <SelectItem value="height-asc">Height (Short to Tall)</SelectItem>
              <SelectItem value="height-desc">Height (Tall to Short)</SelectItem>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-r-none border-r"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}