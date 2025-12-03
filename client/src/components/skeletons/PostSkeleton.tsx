/**
 * Post Skeleton Component
 * Loading placeholder pentru postări
 */

export function PostSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex gap-4">
        {/* Sidebar skeleton */}
        <div className="w-24 flex-shrink-0 hidden md:block">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full mb-1" />
          <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto" />
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1">
          {/* Header skeleton */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full md:hidden" />
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
          
          {/* Content lines skeleton */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
          
          {/* Actions skeleton */}
          <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Post List Skeleton
 * Multiple post skeletons
 */
export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}

