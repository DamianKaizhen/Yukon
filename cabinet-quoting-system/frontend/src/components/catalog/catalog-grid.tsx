"use client"

import { Button } from '@/components/ui/button'
import { CabinetCard } from '@/components/cabinet-card'
import { ConsolidatedCabinetCard } from '@/components/consolidated-cabinet-card'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import type { Product, ConsolidatedCabinetType } from '@/types'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface CatalogGridProps {
  products?: Product[]
  consolidatedCabinets?: ConsolidatedCabinetType[]
  isLoading: boolean
  error: any
  currentPage: number
  onPageChange: (page: number) => void
}

export function CatalogGrid({
  products,
  consolidatedCabinets,
  isLoading,
  error,
  currentPage,
  onPageChange,
}: CatalogGridProps) {
  if (isLoading) {
    return <LoadingSkeleton count={12} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Products</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          We're having trouble loading the cabinet catalog. Please try again or contact support if the problem persists.
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  // Determine which data to use (consolidated cabinets take precedence)
  const hasData = consolidatedCabinets ? consolidatedCabinets.length > 0 : products && products.length > 0
  const dataCount = consolidatedCabinets ? consolidatedCabinets.length : products?.length || 0

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Cabinets Found</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          We couldn't find any cabinets matching your current filters. Try adjusting your search criteria or clearing filters.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/catalog'}>
          Clear All Filters
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Cabinet Grid */}
      <div className="cabinet-grid">
        {consolidatedCabinets ? (
          // Render consolidated cabinet cards
          consolidatedCabinets.map((cabinet) => (
            <ConsolidatedCabinetCard 
              key={cabinet.base_cabinet_type} 
              cabinet={cabinet}
              showAddToCart={true}
            />
          ))
        ) : (
          // Render legacy product cards
          products?.map((product) => (
            <CabinetCard 
              key={product.id} 
              product={product}
              showAddToCart={true}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {dataCount >= 24 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Simple pagination - could be enhanced with more pages */}
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            
            {currentPage > 3 && (
              <span className="text-muted-foreground">...</span>
            )}
            
            {currentPage > 2 && currentPage !== 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
              >
                {currentPage - 1}
              </Button>
            )}
            
            {currentPage !== 1 && (
              <Button
                variant="default"
                size="sm"
              >
                {currentPage}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
            >
              {currentPage + 1}
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}