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
 * Hook pentru listarea topicurilor din subcategorie sau subforum - cu React Query
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function useTopics(subcategoryId?: string, page = 1, pageSize = 20, subforumId?: string) {
    const queryKey = (subcategoryId && subcategoryId.trim() !== '') || (subforumId && subforumId.trim() !== '')
        ? queryKeys.topics(subcategoryId || subforumId || '', page, pageSize, subforumId ? 'subforum' : 'subcategory')
        : null

    const { data, error, isLoading, refetch } = useQuery<PaginatedResponse<ForumTopic & { author_username?: string }>>({
        queryKey: queryKey || ['topics', 'disabled'],
        queryFn: async () => {
            if (!subcategoryId && !subforumId) {
                throw new Error('Subcategory ID or Subforum ID is required')
            }
            const result = await getTopics(subcategoryId, page, pageSize, subforumId)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        enabled: !!queryKey,
        staleTime: 5 * 60 * 1000, // 5 minute - cache mai lung pentru performanță
        gcTime: 10 * 60 * 1000, // 10 minute - cache mai lung
        refetchOnMount: false, // Nu refetch - folosește cache
        refetchOnWindowFocus: false,
    })

    const isInitialLoading = isLoading && !data

    return {
        topics: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading: isInitialLoading,
        isLoading: isInitialLoading,
        error: error as Error | null,
        refetch: () => refetch()
    }
}

/**
 * Hook pentru un singur topic - cu React Query
 * @param topicId - UUID sau slug al topicului
 * @param subcategorySlug - Slug-ul subcategoriei (opțional, pentru a evita duplicate)
 */
export function useTopic(
    topicId: string, 
    subcategorySlug?: string, 
    subforumSlug?: string,
    subcategoryId?: string,
    subforumId?: string
) {
    const queryKey = topicId ? queryKeys.topic(topicId, subcategorySlug) : null

    const { data, error, isLoading, refetch } = useQuery<ForumTopic>({
        queryKey: queryKey || ['topic', 'disabled'],
        queryFn: async () => {
            if (!topicId) {
                throw new Error('Topic ID is required')
            }
            const result = await getTopicById(topicId, subcategorySlug, subforumSlug, subcategoryId, subforumId)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        enabled: !!queryKey, // Nu rulează query-ul dacă nu avem topicId
        staleTime: 5 * 60 * 1000, // 5 minute - cache mai lung pentru performanță
        gcTime: 10 * 60 * 1000, // 10 minute - cache mai lung
        refetchOnMount: false,
        refetchOnWindowFocus: false,
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
