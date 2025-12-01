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
): Promise<ApiResponse<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string }>>> {
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
            .select(`
        *,
        author:forum_users!user_id(username, avatar_url, rank, reputation_power)
      `, { count: 'exact' })
            .eq('topic_id', actualTopicId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .range(offset, offset + pageSize - 1)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        // Map posts with author info, with fallback to profiles
        const postsWithAuthor = await Promise.all((data || []).map(async (p) => {
            let username = p.author?.username;
            let avatar = p.author?.avatar_url;
            
            // Fallback: dacă nu găsește username din forum_users, încearcă din profiles (folosește display_name pentru afișare)
            if (!username && p.user_id) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('display_name, username, email')
                    .eq('id', p.user_id)
                    .maybeSingle();
                
                if (profile?.display_name) {
                    username = profile.display_name;
                } else if (profile?.username) {
                    username = profile.username;
                } else if (profile?.email) {
                    username = profile.email.split('@')[0];
                } else {
                    username = 'Unknown';
                }
            } else if (!username) {
                username = 'Unknown';
            }
            
            return {
                ...p,
                author_username: username,
                author_avatar: avatar || null
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
    content: string
): Promise<ApiResponse<ForumPost>> {
    try {
        const { data, error } = await supabase
            .from('forum_posts')
            .update({
                content,
                edit_count: supabase.rpc('increment', { row_id: postId }),
                last_edited_at: new Date().toISOString()
            })
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
 * Delete post (soft delete)
 */
export async function deletePost(postId: string): Promise<ApiResponse<void>> {
    try {
        const { error } = await supabase
            .from('forum_posts')
            .update({ is_deleted: true })
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
