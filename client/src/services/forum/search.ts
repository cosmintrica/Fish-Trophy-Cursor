/**
 * Forum Search Service
 * Full-text search with PostgreSQL tsvector
 */

import { supabase } from '../../lib/supabase'
import type {
    SearchParams,
    SearchResult,
    PaginatedResponse,
    ApiResponse
} from './types'

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Search forum content (topics, posts, users)
 */
export async function searchForum(
    params: SearchParams
): Promise<ApiResponse<PaginatedResponse<SearchResult>>> {
    try {
        const limit = params.limit || 20
        const offset = params.offset || 0

        // Build search query based on content type
        const contentType = params.content_type || 'all'
        const results: SearchResult[] = []

        // Search posts (if 'posts' or 'all')
        if (contentType === 'posts' || contentType === 'all') {
            const { data: posts } = await supabase
                .rpc('search_posts', {
                    search_query: params.query,
                    result_limit: limit
                })

            if (posts) {
                results.push(...posts.map(p => ({
                    id: p.post_id,
                    type: 'post' as const,
                    content: p.content,
                    username: p.username,
                    created_at: p.created_at,
                    rank: p.rank,
                    excerpt: highlightExcerpt(p.content, params.query)
                })))
            }
        }

        // Search topics (if 'topics' or 'all')
        if (contentType === 'topics' || contentType === 'all') {
            let query = supabase
                .from('forum_topics')
                .select(`
          id,
          title,
          created_at,
          user:forum_users!user_id(username)
        `)
                .eq('is_deleted', false)
                .ilike('title', `%${params.query}%`)

            // Apply filters
            if (params.category_id) {
                const { data: subcats } = await supabase
                    .from('forum_subcategories')
                    .select('id')
                    .eq('category_id', params.category_id)

                const subcatIds = (subcats || []).map(s => s.id)
                if (subcatIds.length > 0) {
                    query = query.in('subcategory_id', subcatIds)
                }
            }

            if (params.subcategory_id) {
                query = query.eq('subcategory_id', params.subcategory_id)
            }

            if (params.author) {
                const { data: authorUser } = await supabase
                    .from('forum_users')
                    .select('user_id')
                    .eq('username', params.author)
                    .single()

                if (authorUser) {
                    query = query.eq('user_id', authorUser.user_id)
                }
            }

            if (params.date_from) {
                query = query.gte('created_at', params.date_from)
            }

            if (params.date_to) {
                query = query.lte('created_at', params.date_to)
            }

            query = query.limit(limit)

            const { data: topics } = await query

            if (topics) {
                results.push(...topics.map(t => ({
                    id: t.id,
                    type: 'topic' as const,
                    title: t.title,
                    username: t.user?.username,
                    created_at: t.created_at,
                    excerpt: t.title
                })))
            }
        }

        // Search users (if 'users' or 'all')
        if (contentType === 'users' || contentType === 'all') {
            const { data: users } = await supabase
                .from('forum_users')
                .select('id, username, reputation_points, rank, created_at')
                .ilike('username', `%${params.query}%`)
                .limit(limit)

            if (users) {
                results.push(...users.map(u => ({
                    id: u.id,
                    type: 'user' as const,
                    username: u.username,
                    created_at: u.created_at,
                    excerpt: `${u.rank} · ${u.reputation_points} puncte reputație`
                })))
            }
        }

        // Sort results
        const sortBy = params.sort_by || 'relevance'
        const sortedResults = sortResults(results, sortBy)

        return {
            data: {
                data: sortedResults.slice(offset, offset + limit),
                total: sortedResults.length,
                page: Math.floor(offset / limit) + 1,
                page_size: limit,
                has_more: offset + limit < sortedResults.length
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Sort search results
 */
function sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
        case 'date':
            return results.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
        case 'reputation':
            // This would need additional data
            return results
        case 'relevance':
        default:
            return results.sort((a, b) => (b.rank || 0) - (a.rank || 0))
    }
}

/**
 * Highlight search query in excerpt
 */
function highlightExcerpt(content: string, query: string, maxLength = 200): string {
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerContent.indexOf(lowerQuery)

    if (index === -1) {
        return content.substring(0, maxLength) + '...'
    }

    const start = Math.max(0, index - 50)
    const end = Math.min(content.length, index + query.length + 150)

    let excerpt = content.substring(start, end)
    if (start > 0) excerpt = '...' + excerpt
    if (end < content.length) excerpt = excerpt + '...'

    // Highlight query (basic, will be styled in UI)
    const regex = new RegExp(`(${query})`, 'gi')
    excerpt = excerpt.replace(regex, '<mark>$1</mark>')

    return excerpt
}

/**
 * Get trending topics (most active in last 7 days)
 */
export async function getTrendingTopics(limit = 10): Promise<ApiResponse<SearchResult[]>> {
    try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
            .from('forum_topics')
            .select(`
        id,
        title,
        created_at,
        reply_count,
        view_count,
        user:forum_users!user_id(username)
      `)
            .eq('is_deleted', false)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('reply_count', { ascending: false })
            .limit(limit)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const results: SearchResult[] = (data || []).map(t => ({
            id: t.id,
            type: 'topic',
            title: t.title,
            username: t.user?.username,
            created_at: t.created_at,
            excerpt: `${t.reply_count} răspunsuri · ${t.view_count} vizualizări`
        }))

        return { data: results }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(query: string, limit = 5): Promise<ApiResponse<string[]>> {
    try {
        // Get top topics matching query
        const { data } = await supabase
            .from('forum_topics')
            .select('title')
            .ilike('title', `%${query}%`)
            .eq('is_deleted', false)
            .limit(limit)

        const suggestions = (data || []).map(t => t.title)

        return { data: suggestions }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}
