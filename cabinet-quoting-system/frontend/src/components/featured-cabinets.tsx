"use client"

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { productApi } from '@/lib/api'
import { CabinetCard } from '@/components/cabinet-card'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function FeaturedCabinets() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productApi.getPopularProducts(6),
  })

  if (isLoading) {
    return <LoadingSkeleton count={6} />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Unable to load featured cabinets at this time.
        </p>
        <Button asChild>
          <Link href="/catalog">Browse All Cabinets</Link>
        </Button>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No featured cabinets available right now.
        </p>
        <Button asChild>
          <Link href="/catalog">Browse All Cabinets</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="cabinet-grid">
        {products.map((product) => (
          <CabinetCard key={product.id} product={product} />
        ))}
      </div>
      
      <div className="text-center mt-12">
        <Button size="lg" asChild>
          <Link href="/catalog">
            View All Cabinets
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </>
  )
}