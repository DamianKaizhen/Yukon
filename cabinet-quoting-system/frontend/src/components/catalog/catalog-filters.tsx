"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { debounce } from '@/lib/utils'
import type { ProductSearchParams, ProductFilters } from '@/types'
import { Search, X, Filter } from 'lucide-react'

interface CatalogFiltersProps {
  filters: ProductSearchParams
  filterOptions?: ProductFilters
  onFiltersChange: (filters: ProductSearchParams) => void
}

export function CatalogFilters({ 
  filters, 
  filterOptions, 
  onFiltersChange 
}: CatalogFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.q || '')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [dimensionFilters, setDimensionFilters] = useState({
    width: [0, 100],
    height: [0, 100],
    depth: [0, 30],
  })
  const [priceRange, setPriceRange] = useState([0, 5000])

  // Debounced search handler
  const debouncedSearch = debounce((query: string) => {
    onFiltersChange({ q: query })
  }, 300)

  useEffect(() => {
    if (searchQuery !== filters.q) {
      debouncedSearch(searchQuery)
    }
  }, [searchQuery, debouncedSearch, filters.q])

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter(id => id !== categoryId)
    
    setSelectedCategories(newCategories)
    onFiltersChange({ 
      category_id: newCategories.length > 0 ? newCategories[0] : undefined 
    })
  }

  const handleColorChange = (colorId: string, checked: boolean) => {
    const newColors = checked
      ? [...selectedColors, colorId]
      : selectedColors.filter(id => id !== colorId)
    
    setSelectedColors(newColors)
    onFiltersChange({ 
      color_options: newColors.length > 0 ? newColors : undefined 
    })
  }

  const handleMaterialChange = (materialId: string, checked: boolean) => {
    const newMaterials = checked
      ? [...selectedMaterials, materialId]
      : selectedMaterials.filter(id => id !== materialId)
    
    setSelectedMaterials(newMaterials)
    onFiltersChange({ 
      box_materials: newMaterials.length > 0 ? newMaterials : undefined 
    })
  }

  const handleDimensionChange = (dimension: string, values: number[]) => {
    const newDimensions = { ...dimensionFilters, [dimension]: values }
    setDimensionFilters(newDimensions)
    
    const filterUpdates: Partial<ProductSearchParams> = {}
    if (dimension === 'width') {
      filterUpdates.width_min = values[0]
      filterUpdates.width_max = values[1]
    } else if (dimension === 'height') {
      filterUpdates.height_min = values[0]
      filterUpdates.height_max = values[1]
    } else if (dimension === 'depth') {
      filterUpdates.depth_min = values[0]
      filterUpdates.depth_max = values[1]
    }
    
    onFiltersChange(filterUpdates)
  }

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values)
    onFiltersChange({
      price_min: values[0],
      price_max: values[1],
    })
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedColors([])
    setSelectedMaterials([])
    setDimensionFilters({ width: [0, 100], height: [0, 100], depth: [0, 30] })
    setPriceRange([0, 5000])
    onFiltersChange({})
  }

  const hasActiveFilters = !!(
    searchQuery || 
    selectedCategories.length || 
    selectedColors.length || 
    selectedMaterials.length ||
    filters.width_min ||
    filters.price_min
  )

  if (!filterOptions) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search cabinets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {hasActiveFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary">
                  Search: {searchQuery}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-2"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {/* Add other active filter badges */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filterOptions.categories?.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={(checked) => 
                  handleCategoryChange(category.id, checked as boolean)
                }
              />
              <label
                htmlFor={`category-${category.id}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {category.name}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={handlePriceChange}
            min={filterOptions.priceRange?.min || 0}
            max={filterOptions.priceRange?.max || 5000}
            step={50}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </CardContent>
      </Card>

      {/* Color Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Finishes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filterOptions.colorOptions?.slice(0, 8).map((color) => (
            <div key={color.id} className="flex items-center space-x-2">
              <Checkbox
                id={`color-${color.id}`}
                checked={selectedColors.includes(color.id)}
                onCheckedChange={(checked) => 
                  handleColorChange(color.id, checked as boolean)
                }
              />
              <label
                htmlFor={`color-${color.id}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {color.display_name}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Material Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Materials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filterOptions.boxMaterials?.map((material) => (
            <div key={material.id} className="flex items-center space-x-2">
              <Checkbox
                id={`material-${material.id}`}
                checked={selectedMaterials.includes(material.id)}
                onCheckedChange={(checked) => 
                  handleMaterialChange(material.id, checked as boolean)
                }
              />
              <label
                htmlFor={`material-${material.id}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {material.name}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}