/**
 * Forum Topics Hook
 * Manages topics data and operations
 */

import { useState, useEffect, useCallback } from 'react'
import {
    getTopics,
    getTopicById,
    createTopic,
    type ForumTopic,
    type TopicCreateParams,
    type PaginatedResponse
} from '@/services/forum'

// Cache local pentru topicuri (per subcategoryId)
const topicsCache: Map<string, { data: PaginatedResponse<ForumTopic & { author_username?: string }> | null; timestamp: number }> = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minute

/**
 * Hook pentru listarea topicurilor din subcategorie - cu cache instant
 */
export function useTopics(subcategoryId: string, page = 1, pageSize = 20) {
    const cacheKey = `${subcategoryId}-${page}-${pageSize}`;
    
    // Încarcă instant din cache dacă există
    const [data, setData] = useState<PaginatedResponse<ForumTopic & { author_username?: string }> | null>(() => {
        const cached = topicsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        return null;
    });
    const [error, setError] = useState<Error | null>(null)

    const loadTopics = useCallback(async () => {
        // Dacă nu avem subcategoryId, returnăm imediat
        if (!subcategoryId || subcategoryId.trim() === '') {
            setData(null)
            setError(null)
            return
        }

        setError(null)

        try {
            const { data: result, error: topicsError } = await getTopics(subcategoryId, page, pageSize)
            if (topicsError) {
                throw new Error(topicsError.message)
            }
            
            // Verifică validitatea datelor înainte de a le seta
            if (result && result.data) {
                // Verifică dacă toate topicurile sunt pentru subcategoryId corect
                const allValid = result.data.every(topic => topic.subcategory_id === subcategoryId);
                if (allValid) {
                    setData(result);
                    // Actualizează cache-ul doar dacă datele sunt valide
                    topicsCache.set(cacheKey, { data: result, timestamp: Date.now() });
                } else {
                    // Date invalide, nu le folosim și ștergem cache-ul
                    topicsCache.delete(cacheKey);
                    setData(null);
                }
            } else {
                setData(null);
                topicsCache.set(cacheKey, { data: null, timestamp: Date.now() });
            }
        } catch (err) {
            setError(err as Error)
            // Dacă e eroare dar avem cache valid, păstrăm cache-ul
            const cached = topicsCache.get(cacheKey);
            if (cached && cached.data && cached.data.data) {
                // Verifică dacă cache-ul e pentru subcategoryId corect
                const firstTopic = cached.data.data[0];
                if (firstTopic && firstTopic.subcategory_id === subcategoryId) {
                    setData(cached.data);
                } else {
                    // Cache invalid, șterge-l
                    topicsCache.delete(cacheKey);
                    setData(null);
                }
            } else {
                setData(null);
            }
        }
    }, [subcategoryId, page, pageSize, cacheKey])

    useEffect(() => {
        // IMPORTANT: Verifică dacă subcategoryId este valid înainte de a folosi cache
        if (!subcategoryId || subcategoryId.trim() === '') {
            setData(null);
            return;
        }
        
        // ALWAYS load fresh data când subcategoryId se schimbă - nu folosi cache-ul la navigare
        // Invalidează cache-urile vechi pentru alte subcategorii
        for (const [key, value] of topicsCache.entries()) {
            if (!key.startsWith(subcategoryId) && value.data) {
                // Verifică dacă e pentru alt subcategoryId
                const firstTopic = value.data.data?.[0];
                if (firstTopic && firstTopic.subcategory_id !== subcategoryId) {
                    topicsCache.delete(key);
                }
            }
        }
        
        // Încarcă fresh data (cache-ul se va actualiza automat în loadTopics)
        const cached = topicsCache.get(cacheKey);
        if (!cached || Date.now() - cached.timestamp >= CACHE_DURATION) {
            // Cache expirat sau inexistent - încarcă fresh
            loadTopics();
        } else if (cached && cached.data) {
            // Verifică dacă cache-ul e pentru același subcategoryId
            const firstTopic = cached.data.data?.[0];
            if (firstTopic && firstTopic.subcategory_id === subcategoryId) {
                // Cache valid - folosește-l
                setData(cached.data);
            } else {
                // Cache invalid - încarcă fresh
                topicsCache.delete(cacheKey);
                loadTopics();
            }
        } else {
            // Cache fără date - încarcă fresh
            loadTopics();
        }
    }, [subcategoryId, page, pageSize, cacheKey, loadTopics]);

    return {
        topics: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading: false, // Nu mai folosim loading
        error,
        refetch: loadTopics
    }
}

// Cache local pentru topic individual
const topicCache: Map<string, { data: ForumTopic | null; timestamp: number }> = new Map();
const TOPIC_CACHE_DURATION = 5 * 60 * 1000; // 5 minute

/**
 * Hook pentru un singur topic - cu cache instant
 */
export function useTopic(topicId: string) {
    // Încarcă instant din cache dacă există
    const [topic, setTopic] = useState<ForumTopic | null>(() => {
        if (!topicId) return null;
        const cached = topicCache.get(topicId);
        if (cached && Date.now() - cached.timestamp < TOPIC_CACHE_DURATION) {
            return cached.data;
        }
        return null;
    });
    const [error, setError] = useState<Error | null>(null)

    const loadTopic = useCallback(async () => {
        if (!topicId) {
            setTopic(null)
            setError(null)
            return
        }

        setError(null)

        try {
            const { data, error: topicError } = await getTopicById(topicId)
            if (topicError) {
                throw new Error(topicError.message)
            }
            setTopic(data || null);
            // Actualizează cache-ul
            if (data) {
                topicCache.set(topicId, { data, timestamp: Date.now() });
            }
        } catch (err) {
            setError(err as Error)
            // Dacă e eroare dar avem cache, păstrăm cache-ul
            const cached = topicCache.get(topicId);
            if (cached && cached.data) {
                setTopic(cached.data);
            } else {
                setTopic(null);
            }
        }
    }, [topicId])

    useEffect(() => {
        // Încarcă doar dacă nu avem cache valid
        const cached = topicCache.get(topicId);
        if (!cached || Date.now() - cached.timestamp >= TOPIC_CACHE_DURATION) {
            loadTopic();
        }
    }, [loadTopic, topicId])

    return { topic, loading: false, error, refetch: loadTopic }
}

/**
 * Hook pentru crearea topicurilor
 */
export function useCreateTopic() {
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const create = useCallback(async (params: TopicCreateParams) => {
        setCreating(true)
        setError(null)

        try {
            const { data, error: createError } = await createTopic(params)
            if (createError) {
                throw new Error(createError.message)
            }
            return { success: true, data }
        } catch (err) {
            setError(err as Error)
            return { success: false, error: err as Error }
        } finally {
            setCreating(false)
        }
    }, [])

    return { create, creating, error }
}
