/**
 * Forum Posts Service
 * CRUD operations for posts
 */

import { supabase } from '../../lib/supabase'
import type {
    ForumPost,
    PostCreateParams,
    PaginatedResponse,
    ApiResponse
} from './types'

// ============================================
// POSTS CRUD
// ============================================

/**
 * Get posts for a topic (paginated)
 */
export async function getPosts(
    topicId: string,
    page = 1,
    pageSize = 20
): Promise<ApiResponse<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string; author_respect?: number; author_rank?: string }>>> {
    try {
        const offset = (page - 1) * pageSize

        // Check if topicId is UUID or slug - if slug, get UUID first
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);
        let actualTopicId = topicId;

        if (!isUUID) {
            // It's a slug, get the topic ID first
            const { data: topicData } = await supabase
                .from('forum_topics')
                .select('id')
                .ilike('slug', topicId)
                .eq('is_deleted', false)
                .maybeSingle();

            if (!topicData) {
                // Try exact match
                const { data: topicDataExact } = await supabase
                    .from('forum_topics')
                    .select('id')
                    .eq('slug', topicId)
                    .eq('is_deleted', false)
                    .maybeSingle();

                if (topicDataExact) {
                    actualTopicId = topicDataExact.id;
                } else {
                    return { error: { message: 'Topic not found', code: 'NOT_FOUND' } };
                }
            } else {
                actualTopicId = topicData.id;
            }
        }

        const { data, error, count } = await supabase
            .from('forum_posts')
            .select('*', { count: 'exact' })
            .eq('topic_id', actualTopicId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .range(offset, offset + pageSize - 1)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        // Map posts with author info REAL - din profiles și forum_users
        const postsWithAuthor = await Promise.all((data || []).map(async (p) => {
            let username = 'Unknown';
            let avatar = null;
            let respect = 0;
            let rank = 'pescar';
            let editedByUsername: string | undefined = undefined;

            if (p.user_id) {
                // Obține date din profiles (photo_url, display_name)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('display_name, username, email, photo_url')
                    .eq('id', p.user_id)
                    .maybeSingle();

                if (profile) {
                    username = profile.display_name || profile.username || profile.email?.split('@')[0] || 'Unknown';
                    avatar = profile.photo_url || null;
                }

                // Obține date din forum_users (respect, rank)
                const { data: forumUser } = await supabase
                    .from('forum_users')
                    .select('reputation_points, rank')
                    .eq('user_id', p.user_id)
                    .maybeSingle();

                if (forumUser) {
                    respect = forumUser.reputation_points || 0;
                    rank = forumUser.rank || 'pescar';
                }
            }

            // Obține username-ul pentru edited_by dacă există
            if (p.edited_by) {
                const { data: editedByProfile } = await supabase
                    .from('profiles')
                    .select('display_name, username, email')
                    .eq('id', p.edited_by)
                    .maybeSingle();

                if (editedByProfile) {
                    editedByUsername = editedByProfile.display_name || editedByProfile.username || editedByProfile.email?.split('@')[0] || 'Unknown';
                }
            }

            return {
                ...p,
                author_username: username,
                author_avatar: avatar,
                author_respect: respect,
                author_rank: rank,
                post_number: p.post_number || null, // Include post_number din database
                edited_by_username: editedByUsername // Numele utilizatorului care a editat
            };
        }))

        return {
            data: {
                data: postsWithAuthor,
                total: count || 0,
                page,
                page_size: pageSize,
                has_more: offset + pageSize < (count || 0)
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get single post by ID
 */
export async function getPostById(postId: string): Promise<ApiResponse<ForumPost>> {
    try {
        const { data, error } = await supabase
            .from('forum_posts')
            .select('*')
            .eq('id', postId)
            .eq('is_deleted', false)
            .single()

        if (error || !data) {
            return { error: { message: 'Post not found', code: 'NOT_FOUND' } }
        }

        return { data }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Create new post (reply to topic)
 */
export async function createPost(params: PostCreateParams): Promise<ApiResponse<ForumPost>> {
    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        // Check if user is restricted (mute/ban)
        const { data: restrictions } = await supabase
            .from('forum_user_restrictions')
            .select('restriction_type')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .or('expires_at.is.null,expires_at.gt.now()')

        if (restrictions && restrictions.length > 0) {
            return { error: { message: 'You are restricted from posting', code: 'USER_RESTRICTED' } }
        }

        // Check if topic_id is UUID or slug - if slug, get UUID first
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.topic_id);
        let actualTopicId = params.topic_id;

        if (!isUUID) {
            // It's a slug, get the topic ID first
            const { data: topicData } = await supabase
                .from('forum_topics')
                .select('id')
                .ilike('slug', params.topic_id)
                .eq('is_deleted', false)
                .maybeSingle();

            if (!topicData) {
                // Try exact match
                const { data: topicDataExact } = await supabase
                    .from('forum_topics')
                    .select('id')
                    .eq('slug', params.topic_id)
                    .eq('is_deleted', false)
                    .maybeSingle();

                if (topicDataExact) {
                    actualTopicId = topicDataExact.id;
                } else {
                    return { error: { message: 'Topic not found', code: 'NOT_FOUND' } };
                }
            } else {
                actualTopicId = topicData.id;
            }
        }

        // Check if topic is locked
        const { data: topic } = await supabase
            .from('forum_topics')
            .select('is_locked')
            .eq('id', actualTopicId)
            .single()

        if (topic?.is_locked) {
            return { error: { message: 'This topic is locked', code: 'TOPIC_LOCKED' } }
        }

        // Create post
        const { data: post, error: postError } = await supabase
            .from('forum_posts')
            .insert({
                topic_id: actualTopicId,
                user_id: user.id,
                content: params.content,
                reply_to_post_id: params.reply_to_post_id
            })
            .select()
            .single()

        if (postError || !post) {
            return { error: { message: postError?.message || 'Failed to create post', code: 'CREATE_FAILED' } }
        }

        // ✅ Invalidează cache-ul categoriilor pentru a actualiza homepage-ul
        try {
            sessionStorage.removeItem('forum_categories_cache_v2');
        } catch (e) {
            // Ignoră eroarea de sessionStorage
        }

        return { data: post }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Update post (edit content)
 */
export async function updatePost(
    postId: string,
    content: string,
    editReason?: string
): Promise<ApiResponse<ForumPost>> {
    try {
        // Get current user for edited_by
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        const updateData: any = {
            content,
            is_edited: true,
            edited_at: new Date().toISOString(),
            edited_by: user.id
        }

        // Add edit reason if provided (mandatory for admin edits)
        if (editReason) {
            updateData.edit_reason = editReason;
            updateData.edited_by_admin = true; // Dacă există motiv, înseamnă că e editare de admin
        }

        const { data, error } = await supabase
            .from('forum_posts')
            .update(updateData)
            .eq('id', postId)
            .select()
            .single()

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Delete post (soft delete with reason)
 */
export async function deletePost(postId: string, reason?: string): Promise<ApiResponse<void>> {
    try {
        // Get current user for deleted_by
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        const updateData: any = {
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id
        }

        // Add reason if provided (mandatory for admin)
        if (reason) {
            updateData.delete_reason = reason
        }

        const { error } = await supabase
            .from('forum_posts')
            .update(updateData)
            .eq('id', postId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get user's recent posts
 */
export async function getUserPosts(
    userId: string,
    page = 1,
    pageSize = 10
): Promise<ApiResponse<PaginatedResponse<ForumPost & { topic_title?: string }>>> {
    try {
        const offset = (page - 1) * pageSize

        const { data, error, count } = await supabase
            .from('forum_posts')
            .select(`
        *,
        topic:forum_topics!topic_id(title)
      `, { count: 'exact' })
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const postsWithTopic = (data || []).map(p => ({
            ...p,
            topic_title: p.topic?.title
        }))

        return {
            data: {
                data: postsWithTopic,
                total: count || 0,
                page,
                page_size: pageSize,
                has_more: offset + pageSize < (count || 0)
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Quote a post (get formatted quote text)
 */
export function quotePost(username: string, content: string): string {
    return `[quote="${username}"]${content}[/quote]\n\n`
}
