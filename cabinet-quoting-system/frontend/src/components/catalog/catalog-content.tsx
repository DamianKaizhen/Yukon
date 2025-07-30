"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CatalogFilters } from './catalog-filters'
import { CatalogGrid } from './catalog-grid'
import { CatalogHeader } from './catalog-header'
import { productApi } from '@/lib/api'
import type { ConsolidatedSearchParams } from '@/types'

export function CatalogContent() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<ConsolidatedSearchParams>({})

  // Initialize filters from URL parameters
  useEffect(() => {
    const initialFilters: ConsolidatedSearchParams = {
      q: searchParams.get('search') || searchParams.get('q') || undefined,
      category_id: searchParams.get('category') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '100'),
      sort: (searchParams.get('sort') as any) || 'display_name',
      order: (searchParams.get('order') as any) || 'asc',
      base_cabinet_type: searchParams.get('type') || undefined,
    }

    // Handle quick filter parameters
    const finish = searchParams.get('finish')
    if (finish) {
      initialFilters.q = finish
    }

    setFilters(initialFilters)
  }, [searchParams])

  const { data: consolidatedCabinets, isLoading, error } = useQuery({
    queryKey: ['consolidated-cabinets', filters],
    queryFn: () => productApi.getCatalog(filters),
  })

  const { data: filterOptions } = useQuery({
    queryKey: ['product-filters'],
    queryFn: productApi.getFilters,
  })

  const handleFiltersChange = (newFilters: ConsolidatedSearchParams) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleSortChange = (sort: string, order: string) => {
    setFilters(prev => ({ ...prev, sort, order, page: 1 }))
  }

  const cabinetCount = consolidatedCabinets?.length || 0

  return (
    <div className="flex gap-8">
      {/* Filters Sidebar */}
      <div className="w-80 shrink-0">
        <CatalogFilters
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <CatalogHeader
          productCount={cabinetCount}
          isLoading={isLoading}
          currentSort={filters.sort || 'display_name'}
          currentOrder={filters.order || 'asc'}
          onSortChange={handleSortChange}
        />

        <CatalogGrid
          consolidatedCabinets={consolidatedCabinets}
          isLoading={isLoading}
          error={error}
          currentPage={filters.page || 1}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}