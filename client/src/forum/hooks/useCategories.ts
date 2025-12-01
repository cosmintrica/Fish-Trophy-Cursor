/**
 * Forum Categories Hook
 * React hook for loading forum categories hierarchy
 */

import { useState, useEffect, useCallback } from 'react'
import {
    getCategoriesWithHierarchy,
    getSubcategories,
    type CategoryWithChildren,
    type ForumSubcategory
} from '@/services/forum'

/**
 * Hook pentru încărcarea categoriilor cu ierarhie completă
 */
export function useCategories() {
    const [categories, setCategories] = useState<CategoryWithChildren[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const { data, error: categoriesError } = await getCategoriesWithHierarchy()
            if (categoriesError) {
                throw new Error(categoriesError.message)
            }

            setCategories(data || [])
        } catch (err) {
            setError(err as Error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    return {
        categories,
        loading,
        error,
        refetch: loadData
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
