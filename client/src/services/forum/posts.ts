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
 * OPTIMIZED: Uses RPC function to reduce 60+ queries to 1
 */
export async function getPosts(
    topicId: string,
    page = 1,
    pageSize = 20
): Promise<ApiResponse<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string; author_respect?: number; author_rank?: string }>>> {
    try {
        // Check if topicId is UUID or slug - if slug, get UUID first
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);
        let actualTopicId = topicId;

        if (!isUUID) {
            // It's a slug, get the topic ID first
            const { data: topicData } = await supabase
                .from('forum_topics')
                .select('id')
                .eq('slug', topicId)
                .eq('is_deleted', false)
                .limit(1)
                .maybeSingle();

            if (!topicData) {
                // Try ilike (case-insensitive)
                const { data: topicDataIlike } = await supabase
                    .from('forum_topics')
                    .select('id')
                    .ilike('slug', topicId)
                    .eq('is_deleted', false)
                    .limit(1)
                    .maybeSingle();

                if (topicDataIlike) {
                    actualTopicId = topicDataIlike.id;
                } else {
                    return { error: { message: 'Topic not found', code: 'NOT_FOUND' } };
                }
            } else {
                actualTopicId = topicData.id;
            }
        }

        // Try optimized RPC first (1 query instead of 60+)
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_posts_with_authors', {
                p_topic_id: actualTopicId,
                p_page: page,
                p_page_size: pageSize
            });

        // If RPC works, use it
        if (!rpcError && rpcData) {
            return {
                data: {
                    data: rpcData.data || [],
                    total: rpcData.total || 0,
                    page: rpcData.page || page,
                    page_size: rpcData.page_size || pageSize,
                    has_more: rpcData.has_more || false
                }
            };
        }

        // Fallback to old method if RPC not available (e.g., migration not run yet)
        console.warn('RPC get_posts_with_authors not available, using fallback method');
        return getPostsFallback(actualTopicId, page, pageSize);

    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Fallback method for getPosts (used when RPC is not available)
 * This is the old N+1 query pattern - less efficient but works without migration
 */
async function getPostsFallback(
    topicId: string,
    page: number,
    pageSize: number
): Promise<ApiResponse<PaginatedResponse<ForumPost & { author_username?: string; author_avatar?: string; author_respect?: number; author_rank?: string }>>> {
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact' })
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1)

    if (error) {
        return { error: { message: error.message, code: error.code } }
    }

    // Map posts with author info - N+1 pattern (slower but works)
    const postsWithAuthor = await Promise.all((data || []).map(async (p) => {
        let username = 'Unknown';
        let avatar = null;
        let respect = 0;
        let rank = 'pescar';
        let editedByUsername: string | undefined = undefined;
        let location: string | undefined = undefined;
        let postCount = 0;
        let reputationPower = 0;

        if (p.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, username, email, photo_url, location')
                .eq('id', p.user_id)
                .maybeSingle();

            if (profile) {
                username = profile.display_name || profile.username || profile.email?.split('@')[0] || 'Unknown';
                avatar = profile.photo_url || null;
                location = (profile as any).location || undefined;
            }

            const { data: forumUser } = await supabase
                .from('forum_users')
                .select('reputation_points, reputation_power, post_count, rank')
                .eq('user_id', p.user_id)
                .maybeSingle();

            if (forumUser) {
                respect = forumUser.reputation_points || 0;
                rank = forumUser.rank || 'pescar';
                postCount = forumUser.post_count || 0;
                reputationPower = forumUser.reputation_power || 0;
            }
        }

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
            author_post_count: postCount,
            author_reputation_power: reputationPower,
            author_location: location,
            post_number: p.post_number || null,
            edited_by_username: editedByUsername
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

        // Check if user is restricted (mute/ban) - exclude shadow_ban
        const { data: restrictions } = await supabase
            .from('forum_user_restrictions')
            .select('restriction_type, reason, expires_at')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .neq('restriction_type', 'shadow_ban') // Exclude shadow ban from notifications
            .or('expires_at.is.null,expires_at.gt.now()')

        if (restrictions && restrictions.length > 0) {
            const restriction = restrictions[0]; // Take first active restriction
            const restrictionType = restriction.restriction_type;
            const reason = restriction.reason || 'Fără motiv specificat';
            const expiresAt = restriction.expires_at;

            // Format restriction message based on type
            let restrictionMessage = '';
            let restrictionTitle = '';

            switch (restrictionType) {
                case 'mute':
                    restrictionTitle = 'Ești mutat';
                    restrictionMessage = `Nu poți posta în forum. Motiv: ${reason}`;
                    break;
                case 'view_ban':
                    restrictionTitle = 'Ești restricționat';
                    restrictionMessage = `Nu poți posta în forum. Motiv: ${reason}`;
                    break;
                case 'temp_ban':
                    restrictionTitle = 'Ești banat temporar';
                    restrictionMessage = `Nu poți posta în forum. Motiv: ${reason}`;
                    break;
                case 'permanent_ban':
                    restrictionTitle = 'Ești banat permanent';
                    restrictionMessage = `Nu poți posta în forum. Motiv: ${reason}`;
                    break;
                default:
                    restrictionTitle = 'Ești restricționat';
                    restrictionMessage = `Nu poți posta în forum. Motiv: ${reason}`;
            }

            if (expiresAt) {
                const expiryDate = new Date(expiresAt);
                const now = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                restrictionMessage += `. Restricția expiră ${daysUntilExpiry > 0 ? `în ${daysUntilExpiry} zile` : 'astăzi'}.`;
            } else if (restrictionType === 'permanent_ban') {
                restrictionMessage += '. Restricția este permanentă.';
            }

            return {
                error: {
                    message: restrictionMessage,
                    title: restrictionTitle,
                    code: 'USER_RESTRICTED',
                    restrictionType: restrictionType,
                    reason: reason,
                    expiresAt: expiresAt
                }
            }
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
