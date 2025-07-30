import { Suspense } from 'react'
import { CatalogContent } from '@/components/catalog/catalog-content'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

export default function CatalogPage() {
  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Cabinet Catalog
        </h1>
        <p className="text-muted-foreground">
          Explore our complete collection of kitchen and bathroom cabinets
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton count={12} />}>
        <CatalogContent />
      </Suspense>
    </div>
  )
}