export function RecentPostSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 h-[120px] relative overflow-hidden flex flex-col animate-pulse">
            {/* Header: Avatar + User + Date */}
            <div className="flex gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-16 bg-gray-100 dark:bg-slate-700/50 rounded" />
                    </div>
                    <div className="h-2 w-32 bg-gray-100 dark:bg-slate-700/50 rounded" />
                </div>
            </div>

            {/* Content lines */}
            <div className="space-y-2 flex-1">
                <div className="h-3 w-full bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-2/3 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
        </div>
    );
}

export function RecentPostListSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <RecentPostSkeleton key={i} />
            ))}
        </div>
    );
}
