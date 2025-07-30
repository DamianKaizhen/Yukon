import { Suspense } from 'react'
import { QuoteBuilder } from '@/components/quote-builder/quote-builder'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

export default function QuoteBuilderPage() {
  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Quote Builder
        </h1>
        <p className="text-muted-foreground">
          Quickly build your cabinet quote by entering item codes or browsing our catalog
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton count={4} />}>
        <QuoteBuilder />
      </Suspense>
    </div>
  )
}