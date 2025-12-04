/**
 * Forum Posts Hook
 * Manages posts data and operations using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getPosts,
    createPost,
    updatePost,
    deletePost,
    type ForumPost,
    type PostCreateParams,
    type PaginatedResponse
} from '../../services/forum'
import { queryKeys } from '../../lib/query-client'

/**
 * Hook pentru listarea postărilor dintr-un topic - cu React Query
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function usePosts(topicId: string | null | undefined, page = 1, pageSize = 20) {
    // Nu încărca postările dacă nu avem topicId
    const queryKey = topicId ? queryKeys.posts(topicId, page, pageSize) : null

    const { data, error, isLoading, refetch } = useQuery<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string }>>({
        queryKey: queryKey || ['posts', 'disabled'],
        queryFn: async () => {
            if (!topicId) {
                throw new Error('Topic ID is required')
            }
            const result = await getPosts(topicId, page, pageSize)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        enabled: !!queryKey, // Nu rulează query-ul dacă nu avem topicId
        staleTime: 1 * 60 * 1000, // 1 minut (postările se schimbă mai des)
        gcTime: 3 * 60 * 1000, // 3 minute
        refetchOnWindowFocus: false, // Dezactivăm pentru a evita erori
    })

    return {
        posts: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading: isLoading && !data, // Loading doar dacă nu avem date
        error: error as Error | null,
        refetch: () => refetch()
    }
}

/**
 * Hook pentru crearea postărilor - cu React Query Mutations
 */
export function useCreatePost() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async (params: PostCreateParams) => {
            const result = await createPost(params)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result
        },
        onSuccess: (result) => {
            // Invalidează cache-ul pentru posts din topic-ul creat
            if (result.data?.topic_id) {
                queryClient.invalidateQueries({ 
                    queryKey: ['posts', result.data.topic_id] 
                })
            }
        },
    })

    const create = async (params: PostCreateParams) => {
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

/**
 * Hook pentru editarea postărilor - cu React Query Mutations
 */
export function useUpdatePost() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async ({ postId, content, editReason }: { postId: string; content: string; editReason?: string }) => {
            const result = await updatePost(postId, content, editReason)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result
        },
        onSuccess: (result) => {
            // Invalidează cache-ul pentru posts din topic-ul editat
            if (result.data?.topic_id) {
                queryClient.invalidateQueries({ 
                    queryKey: ['posts', result.data.topic_id] 
                })
            }
        },
    })

    const update = async (postId: string, content: string, editReason?: string) => {
        try {
            const result = await mutation.mutateAsync({ postId, content, editReason })
            return { success: true, data: result.data, error: null }
        } catch (error) {
            return { success: false, data: null, error: error as Error }
        }
    }

    return { 
        update, 
        updating: mutation.isPending, 
        error: mutation.error as Error | null 
    }
}

/**
 * Hook pentru ștergerea postărilor - cu React Query Mutations
 */
export function useDeletePost() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async ({ postId, reason }: { postId: string; reason?: string }) => {
            const result = await deletePost(postId, reason)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result
        },
        onSuccess: () => {
            // Invalidează cache-ul pentru toate posts (nu știm topic_id după ștergere)
            queryClient.invalidateQueries({ 
                queryKey: ['posts'] 
            })
        },
    })

    const deletePostAction = async (postId: string, reason?: string) => {
        try {
            await mutation.mutateAsync({ postId, reason })
            return { success: true, error: null }
        } catch (error) {
            return { success: false, error: error as Error }
        }
    }

    return { 
        deletePost: deletePostAction, 
        deleting: mutation.isPending, 
        error: mutation.error as Error | null 
    }
}
