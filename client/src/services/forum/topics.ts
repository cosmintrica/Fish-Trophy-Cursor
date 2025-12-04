/**
 * Forum Topics Service
 * CRUD operations for topics
 */

import { supabase } from '../../lib/supabase'
import type {
    ForumTopic,
    TopicCreateParams,
    TopicType,
    PaginatedResponse,
    ApiResponse
} from './types'

// ============================================
// TOPICS CRUD
// ============================================

/**
 * Get topics for a subcategory (paginated)
 * OPTIMIZED: Uses RPC function to get topics with authors in 1 query
 */
export async function getTopics(
    subcategoryId: string,
    page = 1,
    pageSize = 20
): Promise<ApiResponse<PaginatedResponse<ForumTopic & { author_username?: string; author_avatar?: string; last_post_author?: string; slug?: string }>>> {
    try {
        // Try optimized RPC first (1 query instead of 2)
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_topics_with_authors', {
                p_subcategory_id: subcategoryId,
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

        // Fallback to old method if RPC not available
        console.warn('RPC get_topics_with_authors not available, using fallback method');
        return getTopicsFallback(subcategoryId, page, pageSize);

    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Fallback method for getTopics (original N+1 pattern)
 */
async function getTopicsFallback(
    subcategoryId: string,
    page: number,
    pageSize: number
): Promise<ApiResponse<PaginatedResponse<ForumTopic & { author_username?: string }>>> {
    const offset = (page - 1) * pageSize

    const { data, error, count } = await supabase
        .from('forum_topics')
        .select('*', { count: 'exact' })
        .eq('subcategory_id', subcategoryId)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('last_post_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + pageSize - 1)

    if (error) {
        return { error: { message: error.message, code: error.code } }
    }

    // Obține username-urile din forum_users pentru fiecare topic
    const userIds = [...new Set((data || []).map(t => t.user_id).filter(Boolean))]

    // Obține display_name din profiles pentru afișare
    let usersMap = new Map<string, string>();
    if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name, username, email')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching profiles for topics:', profilesError);
        } else if (profilesData) {
            profilesData.forEach(profile => {
                const displayName = profile.display_name || profile.username || profile.email?.split('@')[0] || 'Unknown';
                usersMap.set(profile.id, displayName);
            });
        }
    }

    const topicsWithAuthor = (data || []).map(t => {
        const displayName = usersMap.get(t.user_id) || 'Unknown';
        return {
            ...t,
            author_username: displayName
        };
    })

    return {
        data: {
            data: topicsWithAuthor,
            total: count || 0,
            page,
            page_size: pageSize,
            has_more: offset + pageSize < (count || 0)
        }
    }
}


/**
 * Get single topic by ID or slug
 * OPTIMIZED: Uses RPC function to get topic + hierarchy in 1 query
 * @param topicId - UUID sau slug al topicului
 * @param subcategorySlug - Slug-ul subcategoriei (opțional, pentru a evita duplicate)
 */
export async function getTopicById(topicId: string, subcategorySlug?: string): Promise<ApiResponse<ForumTopic & {
    subcategory_slug?: string;
    subcategory_name?: string;
    category_slug?: string;
    category_name?: string;
    category_id?: string;
}>> {
    try {
        // Try optimized RPC first (1 query instead of 4-5)
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_topic_with_hierarchy', {
                p_topic_slug: topicId,
                p_subcategory_slug: subcategorySlug || null
            });

        // If RPC works and returns valid data, use it
        if (!rpcError && rpcData && rpcData.topic && !rpcData.error) {
            const topic = rpcData.topic;
            const subcategory = rpcData.subcategory;
            const category = rpcData.category;

            return {
                data: {
                    ...topic,
                    subcategory_slug: subcategory?.slug,
                    subcategory_name: subcategory?.name,
                    category_slug: category?.slug,
                    category_name: category?.name,
                    category_id: category?.id
                }
            };
        }

        // Fallback to old method if RPC not available
        console.warn('RPC get_topic_with_hierarchy not available, using fallback');
        return getTopicByIdFallback(topicId, subcategorySlug);

    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Fallback method for getTopicById (used when RPC is not available)
 */
async function getTopicByIdFallback(topicId: string, subcategorySlug?: string): Promise<ApiResponse<ForumTopic & { subcategory_slug?: string }>> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);

    let data, error;

    if (isUUID) {
        const result = await supabase
            .from('forum_topics')
            .select('*')
            .eq('id', topicId)
            .eq('is_deleted', false)
            .maybeSingle();
        data = result.data;
        error = result.error;
    } else {
        let subcategoryId: string | null = null;

        if (subcategorySlug) {
            const { data: subcategory } = await supabase
                .from('forum_subcategories')
                .select('id')
                .eq('slug', subcategorySlug)
                .eq('is_active', true)
                .maybeSingle();

            if (subcategory) {
                subcategoryId = subcategory.id;
            }
        }

        let query = supabase
            .from('forum_topics')
            .select(`*, subcategory:forum_subcategories!subcategory_id(slug)`)
            .eq('slug', topicId)
            .eq('is_deleted', false);

        if (subcategoryId) {
            query = query.eq('subcategory_id', subcategoryId);
        }

        const result = await query.limit(1).maybeSingle();
        data = result.data;
        error = result.error;
    }

    if (error) {
        return { error: { message: error.message || 'Topic not found', code: error.code || 'NOT_FOUND' } }
    }

    if (!data) {
        return { error: { message: 'Topic not found', code: 'NOT_FOUND' } }
    }

    // Increment view count
    await supabase
        .from('forum_topics')
        .update({ view_count: data.view_count + 1 })
        .eq('id', data.id)

    // Get author username
    const result = {
        ...data,
        subcategory_slug: (data.subcategory as any)?.slug,
        author_username: 'Unknown',
        author_avatar: null
    };

    if (data.user_id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, email')
            .eq('id', data.user_id)
            .maybeSingle();

        if (profile?.display_name) {
            result.author_username = profile.display_name;
        } else if (profile?.username) {
            result.author_username = profile.username;
        } else if (profile?.email) {
            result.author_username = profile.email.split('@')[0];
        }
    }

    return { data: result }
}

/**
 * Create new topic (with first post)
 */
export async function createTopic(params: TopicCreateParams): Promise<ApiResponse<ForumTopic>> {
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
                    restrictionMessage = `Nu poți crea topicuri în forum. Motiv: ${reason}`;
                    break;
                case 'view_ban':
                    restrictionTitle = 'Ești restricționat';
                    restrictionMessage = `Nu poți crea topicuri în forum. Motiv: ${reason}`;
                    break;
                case 'temp_ban':
                    restrictionTitle = 'Ești banat temporar';
                    restrictionMessage = `Nu poți crea topicuri în forum. Motiv: ${reason}`;
                    break;
                case 'permanent_ban':
                    restrictionTitle = 'Ești banat permanent';
                    restrictionMessage = `Nu poți crea topicuri în forum. Motiv: ${reason}`;
                    break;
                default:
                    restrictionTitle = 'Ești restricționat';
                    restrictionMessage = `Nu poți crea topicuri în forum. Motiv: ${reason}`;
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

        // Create topic
        const { data: topic, error: topicError } = await supabase
            .from('forum_topics')
            .insert({
                subcategory_id: params.subcategory_id,
                user_id: user.id,
                title: params.title,
                topic_type: params.topic_type || 'normal'
            })
            .select()
            .single()

        if (topicError || !topic) {
            return { error: { message: topicError?.message || 'Failed to create topic', code: 'CREATE_FAILED' } }
        }

        // Create first post (is_first_post = true)
        const { error: postError } = await supabase
            .from('forum_posts')
            .insert({
                topic_id: topic.id,
                user_id: user.id,
                content: params.content,
                is_first_post: true // Primul post al topicului
            })

        if (postError) {
            // Rollback topic creation
            await supabase.from('forum_topics').delete().eq('id', topic.id)
            return { error: { message: 'Failed to create initial post', code: 'POST_CREATE_FAILED' } }
        }

        // ✅ Invalidează cache-ul categoriilor pentru a actualiza homepage-ul
        try {
            sessionStorage.removeItem('forum_categories_cache_v2');
        } catch (e) {
            // Ignoră eroarea de sessionStorage
        }

        return { data: topic }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Update topic (edit title, change type)
 */
export async function updateTopic(
    topicId: string,
    updates: { title?: string; topic_type?: TopicType }
): Promise<ApiResponse<ForumTopic>> {
    try {
        const { data, error } = await supabase
            .from('forum_topics')
            .update(updates)
            .eq('id', topicId)
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
 * Pin/unpin topic (moderator/admin only)
 */
export async function toggleTopicPin(topicId: string, isPinned: boolean): Promise<ApiResponse<ForumTopic>> {
    try {
        const { data, error } = await supabase
            .from('forum_topics')
            .update({ is_pinned: isPinned })
            .eq('id', topicId)
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
 * Lock/unlock topic (moderator/admin only)
 */
export async function toggleTopicLock(topicId: string, isLocked: boolean): Promise<ApiResponse<ForumTopic>> {
    try {
        const { data, error } = await supabase
            .from('forum_topics')
            .update({ is_locked: isLocked })
            .eq('id', topicId)
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
 * Delete topic (soft delete)
 */
export async function deleteTopic(topicId: string): Promise<ApiResponse<void>> {
    try {
        const { error } = await supabase
            .from('forum_topics')
            .update({ is_deleted: true })
            .eq('id', topicId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}
