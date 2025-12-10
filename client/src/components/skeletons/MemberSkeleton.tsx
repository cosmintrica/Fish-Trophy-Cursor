export function MemberSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 animate-pulse">
            {/* Header */}
            <div className="flex gap-3 items-center mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700" />
                <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-24 bg-gray-100 dark:bg-slate-700/50 rounded" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 dark:bg-slate-900/50 rounded mb-3">
                <div className="flex flex-col items-center gap-1">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-6 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-6 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-6 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
            </div>

            {/* Last seen */}
            <div className="h-3 w-20 bg-gray-100 dark:bg-slate-700/50 rounded mt-auto" />
        </div>
    );
}

export function MemberListSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <MemberSkeleton key={i} />
            ))}
        </div>
    );
}
