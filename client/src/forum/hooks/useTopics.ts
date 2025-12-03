/**
 * Forum Topics Hook
 * Manages topics data and operations using SWR
 */

import useSWR from 'swr'
import {
    getTopics,
    getTopicById,
    createTopic,
    type ForumTopic,
    type TopicCreateParams,
    type PaginatedResponse
} from '@/services/forum'
import { swrKeys } from '@/lib/swr-config'
import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'

/**
 * Hook pentru listarea topicurilor din subcategorie - cu SWR
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function useTopics(subcategoryId: string, page = 1, pageSize = 20) {
    const key = subcategoryId && subcategoryId.trim() !== '' 
        ? swrKeys.topics(subcategoryId, page, pageSize)
        : null

    const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ForumTopic & { author_username?: string }>>(
        key,
        async () => {
            const result = await getTopics(subcategoryId, page, pageSize)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        {
            // Revalidate când subcategoryId se schimbă
            revalidateOnFocus: true,
            // SWR v2 păstrează automat datele vechi în timp ce revalidatează
        }
    )

    // Verifică validitatea datelor
    const validData = data && data.data 
        ? data.data.every(topic => topic.subcategory_id === subcategoryId)
            ? data
            : null
        : data

    return {
        topics: validData?.data || [],
        total: validData?.total || 0,
        hasMore: validData?.has_more || false,
        loading: isLoading && !validData, // Loading doar dacă nu avem date
        error: error as Error | null,
        refetch: () => mutate()
    }
}

/**
 * Hook pentru un singur topic - cu SWR
 * @param topicId - UUID sau slug al topicului
 * @param subcategorySlug - Slug-ul subcategoriei (opțional, pentru a evita duplicate)
 */
export function useTopic(topicId: string, subcategorySlug?: string) {
    const key = topicId ? swrKeys.topic(topicId + (subcategorySlug ? `:${subcategorySlug}` : '')) : null

    const { data, error, isLoading, mutate } = useSWR<ForumTopic>(
        key,
        async () => {
            const result = await getTopicById(topicId, subcategorySlug)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        {
            // Dezactivăm revalidateOnFocus pentru a evita erori
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        }
    )

    return { 
        topic: data || null, 
        loading: isLoading && !data, 
        error: error as Error | null, 
        refetch: () => mutate() 
    }
}

/**
 * Hook pentru crearea topicurilor
 */
export function useCreateTopic() {
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const { mutate } = useSWRConfig()

    const create = useCallback(async (params: TopicCreateParams) => {
        setCreating(true)
        setError(null)

        try {
            const { data, error: createError } = await createTopic(params)
            if (createError) {
                throw new Error(createError.message)
            }
            
            // Invalidează cache-ul pentru topics din subcategoria creată
            if (data?.subcategory_id) {
                // Invalidează toate paginile de topics pentru această subcategorie
                mutate(
                    (key) => typeof key === 'string' && key.includes(`topics:${data.subcategory_id}`),
                    undefined,
                    { revalidate: true }
                )
            }
            
            return { success: true, data }
        } catch (err) {
            setError(err as Error)
            return { success: false, error: err as Error }
        } finally {
            setCreating(false)
        }
    }, [mutate])

    return { create, creating, error }
}
