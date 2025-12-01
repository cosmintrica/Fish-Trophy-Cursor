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
 */
export async function getCategoriesWithHierarchy(): Promise<ApiResponse<CategoryWithChildren[]>> {
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
                // Get subforums
                const { data: subforums } = await supabase
                    .from('forum_subforums')
                    .select('*')
                    .eq('category_id', category.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })

                // Get subcategories (direct children) - include slug
                const { data: subcategories } = await supabase
                    .from('forum_subcategories')
                    .select('id, name, description, icon, sort_order, slug')
                    .eq('category_id', category.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })

                // Calculate total topics and posts for this category
                // Get all subcategory IDs (including from subforums)
                const subcategoryIds: string[] = []
                
                // Add direct subcategories
                if (subcategories) {
                    subcategoryIds.push(...subcategories.map(sc => sc.id))
                }
                
                // Add subcategories from subforums
                if (subforums) {
                    for (const subforum of subforums) {
                        const { data: subforumSubcategories } = await supabase
                            .from('forum_subcategories')
                            .select('id, slug')
                            .eq('subforum_id', subforum.id)
                            .eq('is_active', true)
                        
                        if (subforumSubcategories) {
                            subcategoryIds.push(...subforumSubcategories.map(sc => sc.id))
                        }
                    }
                }

                // Count topics and posts
                let totalTopics = 0
                let totalPosts = 0

                if (subcategoryIds.length > 0) {
                    // Count topics
                    const { count: topicsCount } = await supabase
                        .from('forum_topics')
                        .select('*', { count: 'exact', head: true })
                        .in('subcategory_id', subcategoryIds)
                        .eq('is_deleted', false)

                    totalTopics = topicsCount || 0

                    // Count posts - get all topic IDs first, then count posts
                    if (totalTopics > 0) {
                        const { data: topicIds } = await supabase
                            .from('forum_topics')
                            .select('id')
                            .in('subcategory_id', subcategoryIds)
                            .eq('is_deleted', false)

                        if (topicIds && topicIds.length > 0) {
                            const topicIdArray = topicIds.map(t => t.id)
                            const { count: postsCount } = await supabase
                                .from('forum_posts')
                                .select('*', { count: 'exact', head: true })
                                .in('topic_id', topicIdArray)
                                .eq('is_deleted', false)

                            totalPosts = postsCount || 0
                        }
                    }
                }

                return {
                    ...category,
                    subforums: subforums || [],
                    subcategories: subcategories || [],
                    totalTopics: totalTopics,
                    totalPosts: totalPosts
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
    category_id: string
    name: string
    description?: string
    icon?: string
    sort_order?: number
}): Promise<ApiResponse<ForumSubforum>> {
    try {
        const { data, error } = await supabase
            .from('forum_subforums')
            .insert({
                category_id: params.category_id,
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
