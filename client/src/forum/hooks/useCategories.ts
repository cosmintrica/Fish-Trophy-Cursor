/**
 * Forum Categories Hook
 * React hook for loading forum categories hierarchy using SWR
 */

import useSWR from 'swr'
import {
    getCategoriesWithHierarchy,
    getSubcategories,
    type CategoryWithChildren,
    type ForumSubcategory
} from '@/services/forum'
import { swrKeys } from '@/lib/swr-config'
import { useState, useCallback, useEffect } from 'react'

/**
 * Hook pentru încărcarea categoriilor cu ierarhie completă - cu SWR
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function useCategories() {
    const { data, error, isLoading, mutate } = useSWR<CategoryWithChildren[]>(
        swrKeys.categories(),
        async () => {
            const result = await getCategoriesWithHierarchy()
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data || []
        },
        {
            revalidateOnFocus: false, // Categoriile nu se schimbă des
            revalidateOnReconnect: true,
            // Cache mai lung pentru categorii (se schimbă rar)
            dedupingInterval: 5 * 60 * 1000, // 5 minute
        }
    )

    return {
        categories: data || [],
        loading: isLoading && !data, // Loading doar dacă nu avem date
        error: error as Error | null,
        refetch: () => mutate()
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
