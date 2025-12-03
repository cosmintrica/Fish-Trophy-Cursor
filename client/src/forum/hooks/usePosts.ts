/**
 * Forum Posts Hook
 * Manages posts data and operations using SWR
 */

import useSWR from 'swr'
import {
    getPosts,
    createPost,
    updatePost,
    deletePost,
    type ForumPost,
    type PostCreateParams,
    type PaginatedResponse
} from '@/services/forum'
import { swrKeys } from '@/lib/swr-config'
import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'

/**
 * Hook pentru listarea postărilor dintr-un topic - cu SWR
 * Returnează instant date din cache, apoi revalidatează în background
 */
export function usePosts(topicId: string | null | undefined, page = 1, pageSize = 20) {
    // Nu încărca postările dacă nu avem topicId
    const key = topicId ? swrKeys.posts(topicId, page, pageSize) : null

    const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string }>>(
        key,
        async () => {
            const result = await getPosts(topicId, page, pageSize)
            if (result.error) {
                throw new Error(result.error.message)
            }
            return result.data!
        },
        {
            // Dezactivăm revalidateOnFocus pentru a evita erori
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            // Postările se schimbă mai des, deci revalidate mai frecvent
            dedupingInterval: 1000,
        }
    )

    return {
        posts: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading: isLoading && !data, // Loading doar dacă nu avem date
        error: error as Error | null,
        refetch: () => mutate()
    }
}

/**
 * Hook pentru crearea postărilor
 */
export function useCreatePost() {
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const { mutate } = useSWRConfig()

    const create = useCallback(async (params: PostCreateParams) => {
        setCreating(true)
        setError(null)

        try {
            const { data, error: createError } = await createPost(params)
            if (createError) {
                throw new Error(createError.message)
            }
            
            // Invalidează cache-ul pentru posts din topic-ul creat
            if (data?.topic_id) {
                mutate(
                    (key) => typeof key === 'string' && key.includes(`posts:${data.topic_id}`),
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

/**
 * Hook pentru editarea postărilor
 */
export function useUpdatePost() {
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const { mutate } = useSWRConfig()

    const update = useCallback(async (postId: string, content: string, editReason?: string) => {
        setUpdating(true)
        setError(null)

        try {
            const { data, error: updateError } = await updatePost(postId, content, editReason)
            if (updateError) {
                throw new Error(updateError.message)
            }
            
            // Invalidează cache-ul pentru posts din topic-ul editat
            if (data?.topic_id) {
                mutate(
                    (key) => typeof key === 'string' && key.includes(`posts:${data.topic_id}`),
                    undefined,
                    { revalidate: true }
                )
            }
            
            return { success: true, data }
        } catch (err) {
            setError(err as Error)
            return { success: false, error: err as Error }
        } finally {
            setUpdating(false)
        }
    }, [mutate])

    return { update, updating, error }
}

/**
 * Hook pentru ștergerea postărilor
 */
export function useDeletePost() {
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const { mutate } = useSWRConfig()

    const deletePostAction = useCallback(async (postId: string, reason?: string) => {
        setDeleting(true)
        setError(null)

        try {
            const { error: deleteError } = await deletePost(postId, reason)
            if (deleteError) {
                throw new Error(deleteError.message)
            }
            
            // Invalidează cache-ul pentru toate posts (nu știm topic_id după ștergere)
            mutate(
                (key) => typeof key === 'string' && key.startsWith('swr:posts:'),
                undefined,
                { revalidate: true }
            )
            
            return { success: true }
        } catch (err) {
            setError(err as Error)
            return { success: false, error: err as Error }
        } finally {
            setDeleting(false)
        }
    }, [mutate])

    return { deletePost: deletePostAction, deleting, error }
}
