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
// Cache local pentru categorii (persistent între refresh-uri folosind sessionStorage)
const CACHE_DURATION = 2 * 60 * 1000; // 2 minute (mai scurt pentru statistici fresh)
const CACHE_KEY = 'forum_categories_cache_v2'; // Versiune nouă pentru a invalida cache-ul vechi

function getCachedCategories(): CategoryWithChildren[] | null {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        // Ignoră erorile de parsing
    }
    return null;
}

function setCachedCategories(data: CategoryWithChildren[]) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        // Ignoră erorile de storage
    }
}

export function useCategories() {
    // Încarcă instant din cache dacă există
    const [categories, setCategories] = useState<CategoryWithChildren[]>(() => {
        const cached = getCachedCategories();
        return cached || [];
    });
    const [error, setError] = useState<Error | null>(null)

    const loadData = useCallback(async () => {
        setError(null)

        try {
            const { data, error: categoriesError } = await getCategoriesWithHierarchy()
            if (categoriesError) {
                throw new Error(categoriesError.message)
            }

            const newData = data || [];
            setCategories(newData);
            // Actualizează cache-ul
            setCachedCategories(newData);
        } catch (err) {
            setError(err as Error)
            // Dacă e eroare dar avem cache, păstrăm cache-ul
            const cached = getCachedCategories();
            if (cached) {
                setCategories(cached);
            }
        }
    }, [])

    useEffect(() => {
        // Încarcă doar dacă nu avem cache valid
        const cached = getCachedCategories();
        if (!cached) {
            loadData();
        }
    }, [loadData])

    return {
        categories,
        loading: false, // Nu mai folosim loading
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
