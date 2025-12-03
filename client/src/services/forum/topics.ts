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
 */
export async function getTopics(
    subcategoryId: string,
    page = 1,
    pageSize = 20
): Promise<ApiResponse<PaginatedResponse<ForumTopic & { author_username?: string }>>> {
    try {
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

        // Obține display_name din profiles pentru afișare (nu username)
        let usersMap = new Map<string, string>();
        if (userIds.length > 0) {
            // Obține direct display_name din profiles (pentru afișare)
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, display_name, username, email')
                .in('id', userIds);

            if (profilesError) {
                console.error('Error fetching profiles for topics:', profilesError);
            } else if (profilesData) {
                // Folosește display_name pentru afișare, cu fallback la username sau email
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
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get single topic by ID
 */
export async function getTopicById(topicId: string): Promise<ApiResponse<ForumTopic & { subcategory_slug?: string }>> {
    try {
        // Încearcă mai întâi ca UUID, apoi ca slug
        let query = supabase
            .from('forum_topics')
            .select(`
                *,
                subcategory:forum_subcategories!subcategory_id(slug)
            `)
            .eq('is_deleted', false);

        // Verifică dacă topicId este UUID sau slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);

        let data, error;

        if (isUUID) {
            // Caută direct după UUID
            const result = await query.eq('id', topicId).maybeSingle();
            data = result.data;
            error = result.error;
        } else {
            // Caută după slug - încearcă mai întâi exact match, apoi ilike
            let result = await query.eq('slug', topicId).maybeSingle();

            if (!result.data && !result.error) {
                // Dacă nu găsește cu exact match, încearcă ilike (case-insensitive)
                result = await query.ilike('slug', topicId).maybeSingle();
            }

            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Error fetching topic:', error);
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

        // Adaugă slug-ul subcategoriei și datele autorului la rezultat
        const result = {
            ...data,
            subcategory_slug: (data.subcategory as any)?.slug,
            author_username: 'Unknown',
            author_avatar: null
        };

        // Obține username-ul autorului din profiles (folosește display_name pentru afișare)
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
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
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
