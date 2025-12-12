export function MemberSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3 flex items-center gap-3 animate-pulse">
            {/* Column 1: Avatar + Name + Rank */}
            <div className="flex gap-3 items-center flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-1.5" />
                    <div className="h-3 w-20 bg-gray-100 dark:bg-slate-700/50 rounded" />
                </div>
            </div>

            {/* Column 2-4: Stats (Hidden on Mobile) */}
            <div className="hidden md:block w-1/4 h-4 bg-gray-200 dark:bg-slate-700 rounded mx-2 text-center" />
            <div className="hidden md:block w-1/4 h-4 bg-gray-200 dark:bg-slate-700 rounded mx-2 text-center" />
            <div className="hidden md:block w-1/4 h-4 bg-gray-200 dark:bg-slate-700 rounded mx-2 text-center" />

            {/* Column 5: Last Seen */}
            <div className="flex justify-end w-[200px]">
                <div className="h-3 w-24 bg-gray-100 dark:bg-slate-700/50 rounded" />
            </div>
        </div>
    );
}

export function MemberListSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Header Skeleton */}
            <div className="hidden md:grid grid-cols-[minmax(250px,2fr)_1fr_1fr_1fr_200px] p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded ml-auto" />
            </div>
            {Array.from({ length: count }).map((_, i) => (
                <MemberSkeleton key={i} />
            ))}
        </div>
    );
}
