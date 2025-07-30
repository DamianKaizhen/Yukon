import { Suspense } from 'react'
import { FeaturedCabinets } from '@/components/featured-cabinets'
import { Hero } from '@/components/hero'
import { QuickFilters } from '@/components/quick-filters'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

export default function HomePage() {
  return (
    <main className="flex flex-col gap-8">
      <Hero />
      
      <section className="px-6 max-w-7xl mx-auto w-full">
        <QuickFilters />
      </section>

      <section className="px-6 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Featured Cabinets
          </h2>
          <p className="text-muted-foreground">
            Discover our most popular cabinet styles and configurations
          </p>
        </div>
        
        <Suspense fallback={<LoadingSkeleton count={6} />}>
          <FeaturedCabinets />
        </Suspense>
      </section>
    </main>
  )
}