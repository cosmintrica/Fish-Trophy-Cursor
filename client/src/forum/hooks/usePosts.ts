/**
 * Forum Posts Hook
 * Manages posts data and operations
 */

import { useState, useEffect, useCallback } from 'react'
import {
    getPosts,
    createPost,
    updatePost,
    deletePost,
    type ForumPost,
    type PostCreateParams,
    type PaginatedResponse
} from '@/services/forum'

/**
 * Hook pentru listarea postărilor dintr-un topic
 */
export function usePosts(topicId: string, page = 1, pageSize = 20) {
    const [data, setData] = useState<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string }> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadPosts = useCallback(async () => {
        if (!topicId) {
            setLoading(false)
            setData(null)
            setError(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: result, error: postsError } = await getPosts(topicId, page, pageSize)
            if (postsError) {
                throw new Error(postsError.message)
            }
            setData(result || null)
        } catch (err) {
            setError(err as Error)
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [topicId, page, pageSize])

    useEffect(() => {
        loadPosts()
    }, [loadPosts])

    return {
        posts: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading,
        error,
        refetch: loadPosts
    }
}

/**
 * Hook pentru crearea postărilor
 */
export function useCreatePost() {
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const create = useCallback(async (params: PostCreateParams) => {
        setCreating(true)
        setError(null)

        try {
            const { data, error: createError } = await createPost(params)
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

/**
 * Hook pentru editarea postărilor
 */
export function useUpdatePost() {
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const update = useCallback(async (postId: string, content: string) => {
        setUpdating(true)
        setError(null)

        try {
            const { data, error: updateError } = await updatePost(postId, content)
            if (updateError) {
                throw new Error(updateError.message)
            }
            return { success: true, data }
        } catch (err) {
            setError(err as Error)
            return { success: false, error: err as Error }
        } finally {
            setUpdating(false)
        }
    }, [])

    return { update, updating, error }
}

/**
 * Hook pentru ștergerea postărilor
 */
export function useDeletePost() {
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const deletePostAction = useCallback(async (postId: string) => {
        setDeleting(true)
        setError(null)

        try {
            const { error: deleteError } = await deletePost(postId)
            if (deleteError) {
                throw new Error(deleteError.message)
            }
            return { success: true }
        } catch (err) {
            setError(err as Error)
            return { success: false, error: err as Error }
        } finally {
            setDeleting(false)
        }
    }, [])

    return { deletePost: deletePostAction, deleting, error }
}
