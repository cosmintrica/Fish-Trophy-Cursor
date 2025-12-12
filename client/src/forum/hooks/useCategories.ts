/**
 * Forum Categories Hook
 * React hook for loading forum categories hierarchy using React Query
 */

import { useQuery } from '@tanstack/react-query'
import {
    getCategoriesWithHierarchy,
    getSubcategories,
    type CategoryWithChildren,
    type ForumSubcategory
} from '../../services/forum'
import { queryKeys } from '../../lib/query-client'
import { useState, useCallback, useEffect } from 'react'

/**
 * Hook pentru încărcarea categoriilor cu ierarhie completă - cu React Query
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function useCategories() {
    const { data, error, isLoading, refetch } = useQuery<CategoryWithChildren[]>({
        queryKey: queryKeys.categories(),
        queryFn: async () => {
            console.log('🔄 [useCategories] Fetching categories hierarchy...');
            const result = await getCategoriesWithHierarchy()
            if (result.error) {
                console.error('❌ [useCategories] Error fetching:', result.error);
                throw new Error(result.error.message)
            }
            console.log('✅ [useCategories] Fetched ' + (result.data?.length || 0) + ' categories');
            if (result.data && result.data.length > 0) {
                const firstCat = result.data[0];
                const firstSub = firstCat.subcategories?.[0];
                console.log('🧐 [useCategories] First subcategory last post:', firstSub?.lastPost);
            }
            return result.data || []
        },
        staleTime: 5 * 60 * 1000, // 5 minute
        gcTime: 10 * 60 * 1000, // 10 minute
        refetchOnMount: false, // Categoriile se schimbă rar
        refetchOnWindowFocus: false,
    })

    return {
        categories: data || [],
        loading: isLoading && !data, // Loading doar dacă nu avem date
        error: error as Error | null,
        refetch: () => refetch()
    }
}

/**
 * Hook pentru subcategoriile unei categorii
 */
export function useSubcategories(categoryId?: string) {
    const [subcategories, setSubcategories] = useState<ForumSubcategory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadData = useCallback(async () => {
        if (!categoryId) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: subsError } = await getSubcategories(categoryId, 'category')
            if (subsError) {
                throw new Error(subsError.message)
            }

            setSubcategories(data || [])
        } catch (err) {
            setError(err as Error)
        } finally {
            setLoading(false)
        }
    }, [categoryId])

    useEffect(() => {
        loadData()
    }, [loadData])

    return { subcategories, loading, error, refetch: loadData }
}
