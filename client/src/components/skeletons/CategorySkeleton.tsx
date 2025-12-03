/**
 * Category Skeleton Component
 * Loading placeholder pentru categorii
 */

export function CategorySkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-4 mb-3">
      <div className="flex items-center gap-4">
        {/* Icon skeleton */}
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
        
        <div className="flex-1">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
          
          {/* Description skeleton */}
          <div className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="text-right flex-shrink-0">
          <div className="h-4 bg-gray-200 rounded w-16 mb-1" />
          <div className="h-3 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  )
}

/**
 * Category List Skeleton
 * Multiple category skeletons
 */
export function CategoryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <CategorySkeleton key={i} />
      ))}
    </div>
  )
}

