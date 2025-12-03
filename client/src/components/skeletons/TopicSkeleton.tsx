/**
 * Topic Skeleton Component
 * Loading placeholder pentru topicuri
 */

export function TopicSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-4 mb-3">
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          
          {/* Meta info skeleton */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Topic List Skeleton
 * Multiple topic skeletons
 */
export function TopicListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <TopicSkeleton key={i} />
      ))}
    </div>
  )
}

