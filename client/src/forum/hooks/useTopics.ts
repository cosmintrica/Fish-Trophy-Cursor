/**
 * Forum Topics Hook
 * Manages topics data and operations using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getTopics,
    getTopicById,
    createTopic,
    type ForumTopic,
    type TopicCreateParams,
    type PaginatedResponse
} from '../../services/forum'
import { queryKeys } from '../../lib/query-client'

/**
 * Hook pentru listarea topicurilor din subcategorie - cu React Query
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function useTopics(subcategoryId: string, page = 1, pageSize = 20) {
    const queryKey = subcategoryId && subcategoryId.trim() !== '' 
        ? queryKeys.topics(subcategoryId, page, pageSize)
        : null

    const { data, error, isLoading, refetch } = useQuery<PaginatedResponse<ForumTopic & { author_username?: string }>>({
        queryKey: queryKey || ['topics', 'disabled'],
        queryFn: async () => {
            if (!subcategoryId || subcategoryId.trim() === '') {
                throw new Error('Subcategory ID is required')
            }
            const result = await getTopics(subcategoryId, page, pageSize)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        enabled: !!queryKey, // Nu rulează query-ul dacă nu avem subcategoryId
        staleTime: 5 * 60 * 1000, // 5 minute - datele rămân fresh mai mult timp
        gcTime: 10 * 60 * 1000, // 10 minute - cache-ul rămâne mai mult timp
        refetchOnMount: false, // NU refetch când componenta se montează - folosește cache
        refetchOnWindowFocus: false, // Nu refetch când se revine la fereastră
    })

    // Verifică validitatea datelor
    const validData = data && data.data 
        ? data.data.every(topic => topic.subcategory_id === subcategoryId)
            ? data
            : null
        : data

    // Loading doar dacă nu avem date în cache și se încarcă pentru prima dată
    const hasCachedData = !!validData
    const isInitialLoading = isLoading && !hasCachedData

    return {
        topics: validData?.data || [],
        total: validData?.total || 0,
        hasMore: validData?.has_more || false,
        loading: isInitialLoading, // Loading doar la prima încărcare
        isLoading: isInitialLoading, // Exportăm și isLoading direct pentru verificări mai precise
        error: error as Error | null,
        refetch: () => refetch()
    }
}

/**
 * Hook pentru un singur topic - cu React Query
 * @param topicId - UUID sau slug al topicului
 * @param subcategorySlug - Slug-ul subcategoriei (opțional, pentru a evita duplicate)
 */
export function useTopic(topicId: string, subcategorySlug?: string) {
    const queryKey = topicId ? queryKeys.topic(topicId, subcategorySlug) : null

    const { data, error, isLoading, refetch } = useQuery<ForumTopic>({
        queryKey: queryKey || ['topic', 'disabled'],
        queryFn: async () => {
            if (!topicId) {
                throw new Error('Topic ID is required')
            }
            const result = await getTopicById(topicId, subcategorySlug)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        enabled: !!queryKey, // Nu rulează query-ul dacă nu avem topicId
        staleTime: 2 * 60 * 1000, // 2 minute
        gcTime: 5 * 60 * 1000, // 5 minute
        refetchOnWindowFocus: false, // Dezactivăm pentru a evita erori
    })

    return { 
        topic: data || null, 
        loading: isLoading && !data, 
        error: error as Error | null, 
        refetch: () => refetch() 
    }
}

/**
 * Hook pentru crearea topicurilor - cu React Query Mutations
 */
export function useCreateTopic() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async (params: TopicCreateParams) => {
            const result = await createTopic(params)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result
        },
        onSuccess: (result) => {
            // Invalidează cache-ul pentru topics din subcategoria creată
            if (result.data?.subcategory_id) {
                // Invalidează toate paginile de topics pentru această subcategorie
                queryClient.invalidateQueries({ 
                    queryKey: ['topics', result.data.subcategory_id] 
                })
            }
        },
    })

    const create = async (params: TopicCreateParams) => {
        try {
            const result = await mutation.mutateAsync(params)
            return { success: true, data: result.data, error: null }
        } catch (error) {
            return { success: false, data: null, error: error as Error }
        }
    }

    return { 
        create, 
        creating: mutation.isPending, 
        error: mutation.error as Error | null 
    }
}
