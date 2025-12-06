/**
 * Forum Categories Service
 * Handles CRUD operations for categories, subforums, and subcategories
 */

import { supabase } from '../../lib/supabase'
import type {
    ForumCategory,
    ForumSubforum,
    ForumSubcategory,
    CategoryCreateParams,
    CategoryUpdateParams,
    CategoryWithChildren,
    ApiResponse
} from './types'

// ============================================
// CATEGORIES
// ============================================

/**
 * Get all categories with their subforums and subcategories
 * OPTIMIZED: Uses single RPC call instead of 50+ sequential queries
 */
export async function getCategoriesWithHierarchy(): Promise<ApiResponse<CategoryWithChildren[]>> {
    try {
        // Try optimized RPC first (single query)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_categories_with_stats')

        if (!rpcError && rpcData) {
            return { data: rpcData as CategoryWithChildren[] }
        }

        return getCategoriesWithHierarchyFallback()
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Fallback method - original implementation with sequential queries
 * Will be removed once RPC is deployed
 */
async function getCategoriesWithHierarchyFallback(): Promise<ApiResponse<CategoryWithChildren[]>> {
    try {
        const { data: categories, error: catError } = await supabase
            .from('forum_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (catError) {
            return { error: { message: catError.message, code: catError.code } }
        }

        // Get subforums and subcategories
        const categoriesWithChildren: CategoryWithChildren[] = await Promise.all(
            (categories || []).map(async (category) => {
                // Get subcategories (direct children) - include slug și calculează statistici
                const { data: subcategoriesRaw } = await supabase
                    .from('forum_subcategories')
                    .select('id, name, description, icon, sort_order, slug')
                    .eq('category_id', category.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })

                // Calculează statistici pentru fiecare subcategorie
                const subcategories = await Promise.all(
                    (subcategoriesRaw || []).map(async (subcat) => {
                        // Get subforums for this subcategory (NEW STRUCTURE: subforums are under subcategories)
                        const { data: subforums } = await supabase
                            .from('forum_subforums')
                            .select('*')
                            .eq('subcategory_id', subcat.id)
                            .eq('is_active', true)
                            .order('sort_order', { ascending: true })
                        // Count topics
                        const { count: topicCount } = await supabase
                            .from('forum_topics')
                            .select('*', { count: 'exact', head: true })
                            .eq('subcategory_id', subcat.id)
                            .eq('is_deleted', false);

                        // Count posts
                        let postCount = 0;
                        if (topicCount && topicCount > 0) {
                            const { data: topicIds } = await supabase
                                .from('forum_topics')
                                .select('id')
                                .eq('subcategory_id', subcat.id)
                                .eq('is_deleted', false);

                            if (topicIds && topicIds.length > 0) {
                                const { count: postsCount } = await supabase
                                    .from('forum_posts')
                                    .select('*', { count: 'exact', head: true })
                                    .in('topic_id', topicIds.map(t => t.id))
                                    .eq('is_deleted', false);
                                postCount = postsCount || 0;
                            }
                        }

                        // Get last post
                        let lastPost = null;
                        if (topicCount && topicCount > 0) {
                            const { data: latestPost } = await supabase
                                .from('forum_posts')
                                .select(`
                                    id,
                                    created_at,
                                    topic_id,
                                    user_id,
                                    post_number,
                                    forum_topics!inner(title, subcategory_id, slug)
                                `)
                                .eq('forum_topics.subcategory_id', subcat.id)
                                .eq('is_deleted', false)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                            if (latestPost && latestPost.user_id) {
                                // Get author info din profiles
                                const { data: profile } = await supabase
                                    .from('profiles')
                                    .select('display_name, username')
                                    .eq('id', latestPost.user_id)
                                    .maybeSingle();

                                const topicData = latestPost.forum_topics as any;
                                const topicTitle = topicData?.title || 'Unknown';
                                const topicSlug = topicData?.slug || null;
                                const authorName = profile?.display_name || profile?.username || 'Unknown';

                                // Format time - smart: dacă e azi → doar ora
                                const postDate = new Date(latestPost.created_at);
                                const now = new Date();
                                const isToday = postDate.getDate() === now.getDate() &&
                                    postDate.getMonth() === now.getMonth() &&
                                    postDate.getFullYear() === now.getFullYear();

                                const hours = postDate.getHours().toString().padStart(2, '0');
                                const minutes = postDate.getMinutes().toString().padStart(2, '0');
                                const day = postDate.getDate().toString().padStart(2, '0');
                                const month = (postDate.getMonth() + 1).toString().padStart(2, '0');
                                const year = postDate.getFullYear();

                                // Get subforum slug if topic is in a subforum
                                let subforumSlug = null;
                                if (topicData?.subforum_id) {
                                    const { data: subforum } = await supabase
                                        .from('forum_subforums')
                                        .select('slug')
                                        .eq('id', topicData.subforum_id)
                                        .maybeSingle();
                                    subforumSlug = subforum?.slug || null;
                                }

                                lastPost = {
                                    topicId: latestPost.topic_id,
                                    topicTitle,
                                    topicSlug,
                                    author: authorName,
                                    time: isToday ? `${hours}:${minutes}` : `${day}.${month}.${year} ${hours}:${minutes}`,
                                    date: isToday ? null : `${day}.${month}.${year}`,
                                    timeOnly: `${hours}:${minutes}`,
                                    postNumber: latestPost.post_number || null,
                                    categorySlug: category.slug || null,
                                    subcategorySlug: subcat.slug || null,
                                    subforumSlug: subforumSlug
                                };
                            }
                        }


                        return {
                            ...subcat,
                            topicCount: topicCount || 0,
                            postCount: postCount || 0,
                            lastPost,
                            subforums: subforums || [] // Add subforums to subcategory (NEW STRUCTURE)
                        };
                    })
                )

                // Calculate total topics and posts for this category
                const totalTopics = subcategories.reduce((sum, sc) => sum + (sc.topicCount || 0), 0)
                const totalPosts = subcategories.reduce((sum, sc) => sum + (sc.postCount || 0), 0)

                return {
                    ...category,
                    subforums: [], // Empty array - subforums are now under subcategories, not categories
                    subcategories: subcategories || [],
                    totalTopics,
                    totalPosts,
                    lastPost: null
                }
            })
        )

        return { data: categoriesWithChildren }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get single category with children
 */
export async function getCategoryById(categoryId: string): Promise<ApiResponse<CategoryWithChildren>> {
    try {
        const { data: category, error: catError } = await supabase
            .from('forum_categories')
            .select('*')
            .eq('id', categoryId)
            .single()

        if (catError || !category) {
            return { error: { message: 'Category not found', code: 'NOT_FOUND' } }
        }

        const { data: subforums } = await supabase
            .from('forum_subforums')
            .select('*')
            .eq('category_id', categoryId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        const { data: subcategories } = await supabase
            .from('forum_subcategories')
            .select('*')
            .eq('category_id', categoryId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        return {
            data: {
                ...category,
                subforums: subforums || [],
                subcategories: subcategories || []
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Create new category (admin only)
 */
export async function createCategory(params: CategoryCreateParams): Promise<ApiResponse<ForumCategory>> {
    try {
        const { data, error } = await supabase
            .from('forum_categories')
            .insert({
                name: params.name,
                description: params.description,
                icon: params.icon,
                sort_order: params.sort_order ?? 0,
                is_active: true
            })
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
 * Update category (admin only)
 */
export async function updateCategory(
    categoryId: string,
    params: CategoryUpdateParams
): Promise<ApiResponse<ForumCategory>> {
    try {
        const { data, error } = await supabase
            .from('forum_categories')
            .update(params)
            .eq('id', categoryId)
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
 * Delete category (soft delete - set is_active = false)
 */
export async function deleteCategory(categoryId: string): Promise<ApiResponse<void>> {
    try {
        const { error } = await supabase
            .from('forum_categories')
            .update({ is_active: false })
            .eq('id', categoryId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Reorder categories
 */
export async function reorderCategories(
    order: { id: string; sort_order: number }[]
): Promise<ApiResponse<void>> {
    try {
        // Update each category's sort_order
        const updates = order.map(item =>
            supabase
                .from('forum_categories')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        )

        await Promise.all(updates)

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

// ============================================
// SUBFORUMS
// ============================================

/**
 * Create subforum (admin only)
 */
export async function createSubforum(params: {
    subcategory_id: string  // Changed from category_id to subcategory_id (NEW STRUCTURE)
    name: string
    description?: string
    icon?: string
    sort_order?: number
}): Promise<ApiResponse<ForumSubforum>> {
    try {
        // Get category_id from subcategory for reference
        const { data: subcategory } = await supabase
            .from('forum_subcategories')
            .select('category_id')
            .eq('id', params.subcategory_id)
            .single()

        const { data, error } = await supabase
            .from('forum_subforums')
            .insert({
                subcategory_id: params.subcategory_id,
                category_id: subcategory?.category_id || null,  // Optional reference
                name: params.name,
                description: params.description,
                icon: params.icon,
                sort_order: params.sort_order ?? 0,
                is_active: true
            })
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
 * Update subforum (admin only)
 */
export async function updateSubforum(
    subforumId: string,
    params: {
        name?: string
        description?: string
        icon?: string
        sort_order?: number
        is_active?: boolean
        subcategory_id?: string
    }
): Promise<ApiResponse<ForumSubforum>> {
    try {
        const { data, error } = await supabase
            .from('forum_subforums')
            .update(params)
            .eq('id', subforumId)
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
 * Delete subforum (soft delete - set is_active = false)
 */
export async function deleteSubforum(subforumId: string): Promise<ApiResponse<void>> {
    try {
        const { error } = await supabase
            .from('forum_subforums')
            .update({ is_active: false })
            .eq('id', subforumId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

// ============================================
// SUBCATEGORIES
// ============================================

/**
 * Get subcategories for a category or subforum
 */
export async function getSubcategories(
    parentId: string,
    parentType: 'category' | 'subforum'
): Promise<ApiResponse<ForumSubcategory[]>> {
    try {
        const query = supabase
            .from('forum_subcategories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (parentType === 'category') {
            query.eq('category_id', parentId)
        } else {
            query.eq('subforum_id', parentId)
        }

        const { data, error } = await query

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: data || [] }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Update subcategory (admin only)
 */
export async function updateSubcategory(
    subcategoryId: string,
    params: {
        name?: string
        description?: string
        icon?: string
        moderator_only?: boolean
        sort_order?: number
        is_active?: boolean
    }
): Promise<ApiResponse<ForumSubcategory>> {
    try {
        const { data, error } = await supabase
            .from('forum_subcategories')
            .update(params)
            .eq('id', subcategoryId)
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
 * Delete subcategory (soft delete - set is_active = false)
 */
export async function deleteSubcategory(subcategoryId: string): Promise<ApiResponse<void>> {
    try {
        const { error } = await supabase
            .from('forum_subcategories')
            .update({ is_active: false })
            .eq('id', subcategoryId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Create subcategory (admin only)
 */
export async function createSubcategory(params: {
    category_id?: string
    subforum_id?: string
    name: string
    description?: string
    icon?: string
    moderator_only?: boolean
    sort_order?: number
}): Promise<ApiResponse<ForumSubcategory>> {
    try {
        // Validate: must have category_id OR subforum_id
        if (!params.category_id && !params.subforum_id) {
            return { error: { message: 'Must specify category_id or subforum_id', code: 'INVALID_PARAMS' } }
        }

        const { data, error } = await supabase
            .from('forum_subcategories')
            .insert({
                category_id: params.category_id ?? null,
                subforum_id: params.subforum_id ?? null,
                name: params.name,
                description: params.description,
                icon: params.icon,
                moderator_only: params.moderator_only ?? false,
                sort_order: params.sort_order ?? 0,
                is_active: true
            })
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
