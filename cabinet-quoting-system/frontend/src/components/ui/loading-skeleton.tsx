import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
  return (
    <div className="cabinet-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-lg border bg-muted p-6 space-y-4",
            className
          )}
        >
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
          <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
          <div className="h-3 bg-muted-foreground/20 rounded w-2/3" />
          <div className="h-8 bg-muted-foreground/20 rounded w-full" />
        </div>
      ))}
    </div>
  )
}