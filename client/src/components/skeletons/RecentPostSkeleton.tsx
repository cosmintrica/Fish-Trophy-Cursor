export function RecentPostSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3 flex items-center gap-3 animate-pulse">
            {/* Column 1: Icon + Title + Category */}
            <div className="flex gap-3 items-center flex-1 min-w-0">
                <div className="w-5 h-5 rounded bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1">
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded mb-1.5" />
                    <div className="h-3 w-1/3 bg-gray-100 dark:bg-slate-700/50 rounded" />
                </div>
            </div>

            {/* Column 2: Stats (Hidden on Mobile) */}
            <div className="hidden md:flex flex-col gap-1 items-center w-[150px]">
                <div className="h-3 w-12 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-10 bg-gray-100 dark:bg-slate-700/50 rounded" />
            </div>

            {/* Column 3: Last Post Info */}
            <div className="flex items-center justify-end gap-3 w-[200px]">
                <div className="flex flex-col items-end flex-1">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded mb-1" />
                    <div className="h-3 w-16 bg-gray-100 dark:bg-slate-700/50 rounded" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
            </div>
        </div>
    );
}

export function RecentPostListSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Header Skeleton */}
            <div className="hidden md:grid grid-cols-[minmax(300px,2fr)_150px_200px] p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded ml-auto" />
            </div>
            {Array.from({ length: count }).map((_, i) => (
                <RecentPostSkeleton key={i} />
            ))}
        </div>
    );
}
