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

/**
 * Hook pentru listarea topicurilor din subcategorie
 */
export function useTopics(subcategoryId: string, page = 1, pageSize = 20) {
    const [data, setData] = useState<PaginatedResponse<ForumTopic & { author_username?: string }> | null>(null)
    // Nu începe cu loading: true dacă nu avem subcategoryId
    const [loading, setLoading] = useState(!!subcategoryId && subcategoryId.trim() !== '')
    const [error, setError] = useState<Error | null>(null)

    const loadTopics = useCallback(async () => {
        // Dacă nu avem subcategoryId, setăm loading la false imediat
        if (!subcategoryId || subcategoryId.trim() === '') {
            setLoading(false)
            setData(null)
            setError(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: result, error: topicsError } = await getTopics(subcategoryId, page, pageSize)
            if (topicsError) {
                throw new Error(topicsError.message)
            }
            setData(result || null)
        } catch (err) {
            setError(err as Error)
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [subcategoryId, page, pageSize])

    useEffect(() => {
        loadTopics()
    }, [loadTopics])

    return {
        topics: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading,
        error,
        refetch: loadTopics
    }
}

/**
 * Hook pentru un singur topic
 */
export function useTopic(topicId: string) {
    const [topic, setTopic] = useState<ForumTopic | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadTopic = useCallback(async () => {
        if (!topicId) {
            setLoading(false)
            setTopic(null)
            setError(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: topicError } = await getTopicById(topicId)
            if (topicError) {
                throw new Error(topicError.message)
            }
            setTopic(data || null)
        } catch (err) {
            setError(err as Error)
            setTopic(null)
        } finally {
            setLoading(false)
        }
    }, [topicId])

    useEffect(() => {
        loadTopic()
    }, [loadTopic])

    return { topic, loading, error, refetch: loadTopic }
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
