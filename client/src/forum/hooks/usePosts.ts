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

// Cache local pentru postări (per topicId)
const postsCache: Map<string, { data: PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string }> | null; timestamp: number }> = new Map();
const POSTS_CACHE_DURATION = 1 * 60 * 1000; // 1 minut (postările se schimbă mai des)

/**
 * Hook pentru listarea postărilor dintr-un topic - cu cache instant
 */
export function usePosts(topicId: string, page = 1, pageSize = 20) {
    const cacheKey = `${topicId}-${page}-${pageSize}`;
    
    // Încarcă instant din cache dacă există
    const [data, setData] = useState<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string }> | null>(() => {
        if (!topicId) return null;
        const cached = postsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < POSTS_CACHE_DURATION) {
            return cached.data;
        }
        return null;
    });
    const [error, setError] = useState<Error | null>(null)

    const loadPosts = useCallback(async () => {
        if (!topicId) {
            setData(null)
            setError(null)
            return
        }

        setError(null)

        try {
            const { data: result, error: postsError } = await getPosts(topicId, page, pageSize)
            if (postsError) {
                throw new Error(postsError.message)
            }
            setData(result || null);
            // Actualizează cache-ul
            postsCache.set(cacheKey, { data: result || null, timestamp: Date.now() });
        } catch (err) {
            setError(err as Error)
            // Dacă e eroare dar avem cache, păstrăm cache-ul
            const cached = postsCache.get(cacheKey);
            if (cached && cached.data) {
                setData(cached.data);
            } else {
                setData(null);
            }
        }
    }, [topicId, page, pageSize, cacheKey])

    useEffect(() => {
        // Încarcă doar dacă nu avem cache valid
        const cached = postsCache.get(cacheKey);
        if (!cached || Date.now() - cached.timestamp >= POSTS_CACHE_DURATION) {
            loadPosts();
        }
    }, [loadPosts, cacheKey])

    return {
        posts: data?.data || [],
        total: data?.total || 0,
        hasMore: data?.has_more || false,
        loading: false, // Nu mai folosim loading
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

    const update = useCallback(async (postId: string, content: string, editReason?: string) => {
        setUpdating(true)
        setError(null)

        try {
            const { data, error: updateError } = await updatePost(postId, content, editReason)
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

    const deletePostAction = useCallback(async (postId: string, reason?: string) => {
        setDeleting(true)
        setError(null)

        try {
            const { error: deleteError } = await deletePost(postId, reason)
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
