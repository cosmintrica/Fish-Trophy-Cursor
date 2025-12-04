/**
 * Forum Moderation Service
 * Ban/mute users, handle reports, moderation actions
 */

import { supabase } from '../../lib/supabase'
import type {
    ForumUserRestriction,
    ForumReport,
    RestrictionType,
    ReportStatus,
    ApiResponse,
    PaginatedResponse
} from './types'

// ============================================
// USER RESTRICTIONS (BAN/MUTE)
// ============================================

/**
 * Restrict a user (ban/mute)
 */
export async function restrictUser(
    userId: string,
    restrictionType: RestrictionType,
    reason: string,
    expiresAt?: string,
    issuedBy?: string
): Promise<ApiResponse<ForumUserRestriction>> {
    try {
        const { data, error } = await supabase
            .from('forum_user_restrictions')
            .insert({
                user_id: userId,
                restriction_type: restrictionType,
                reason,
                expires_at: expiresAt,
                issued_by: issuedBy
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
 * Remove restriction (unban/unmute)
 */
export async function removeRestriction(restrictionId: string): Promise<ApiResponse<void>> {
    try {
        const { error } = await supabase
            .from('forum_user_restrictions')
            .update({ is_active: false })
            .eq('id', restrictionId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get active restrictions for a user
 */
export async function getUserRestrictions(userId: string): Promise<ApiResponse<ForumUserRestriction[]>> {
    try {
        const { data, error } = await supabase
            .from('forum_user_restrictions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .or('expires_at.is.null,expires_at.gt.now()')

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: data || [] }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get all restrictions (active + history) for a user
 */
export async function getAllUserRestrictions(userId: string): Promise<ApiResponse<ForumUserRestriction[]>> {
    try {
        const { data, error } = await supabase
            .from('forum_user_restrictions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        return { data: data || [] }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Check if user has active restriction of specific type
 */
export async function hasActiveRestriction(
    userId: string,
    restrictionType: RestrictionType
): Promise<boolean> {
    try {
        const { data } = await supabase
            .from('forum_user_restrictions')
            .select('id')
            .eq('user_id', userId)
            .eq('restriction_type', restrictionType)
            .eq('is_active', true)
            .or('expires_at.is.null,expires_at.gt.now()')
            .limit(1)

        return (data?.length || 0) > 0
    } catch (error) {
        return false
    }
}

// ============================================
// REPORTS
// ============================================

/**
 * Create a report (for posts, users, etc.)
 */
export async function createReport(
    reportedUserId: string,
    reportType: 'spam' | 'inappropriate' | 'harassment' | 'other',
    description: string,
    postId?: string
): Promise<ApiResponse<ForumReport>> {
    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        const { data, error } = await supabase
            .from('forum_reports')
            .insert({
                reported_user_id: reportedUserId,
                reported_by: user.id,
                report_type: reportType,
                description,
                post_id: postId
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
 * Get all reports (moderator/admin)
 */
export async function getReports(
    status?: ReportStatus,
    page = 1,
    pageSize = 20
): Promise<ApiResponse<PaginatedResponse<ForumReport & { reporter_username?: string; reported_username?: string }>>> {
    try {
        const offset = (page - 1) * pageSize

        let query = supabase
            .from('forum_reports')
            .select(`
        *,
        reporter:forum_users!reported_by(username),
        reported:forum_users!reported_user_id(username)
      `, { count: 'exact' })

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const reportsWithUsernames = (data || []).map(r => ({
            ...r,
            reporter_username: r.reporter?.username,
            reported_username: r.reported?.username
        }))

        return {
            data: {
                data: reportsWithUsernames,
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
 * Update report status (moderator action)
 */
export async function updateReportStatus(
    reportId: string,
    status: ReportStatus,
    moderatorNotes?: string
): Promise<ApiResponse<ForumReport>> {
    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        const { data, error } = await supabase
            .from('forum_reports')
            .update({
                status,
                moderator_notes: moderatorNotes,
                resolved_by: status !== 'pending' ? user.id : null,
                resolved_at: status !== 'pending' ? new Date().toISOString() : null
            })
            .eq('id', reportId)
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
// MODERATION ACTIONS
// ============================================

/**
 * Delete post and optionally warn/ban user (moderator action)
 */
export async function moderatePost(
    postId: string,
    action: 'delete' | 'warn' | 'temp_ban' | 'permanent_ban',
    reason: string,
    banDurationDays?: number
): Promise<ApiResponse<void>> {
    try {
        // Get post to find user
        const { data: post } = await supabase
            .from('forum_posts')
            .select('user_id')
            .eq('id', postId)
            .single()

        if (!post) {
            return { error: { message: 'Post not found', code: 'NOT_FOUND' } }
        }

        // Delete post
        await supabase
            .from('forum_posts')
            .update({ is_deleted: true })
            .eq('id', postId)

        // Apply user restriction if needed
        if (action === 'temp_ban' || action === 'permanent_ban') {
            const expiresAt = action === 'temp_ban' && banDurationDays
                ? new Date(Date.now() + banDurationDays * 24 * 60 * 60 * 1000).toISOString()
                : undefined

            await restrictUser(
                post.user_id,
                action === 'permanent_ban' ? 'permanent_ban' : 'temp_ban',
                reason,
                expiresAt
            )
        }

        return { data: undefined }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get moderation log (moderator/admin)
 */
export async function getModerationLog(
    page = 1,
    pageSize = 50
): Promise<ApiResponse<PaginatedResponse<ForumUserRestriction & { moderator_username?: string; user_username?: string }>>> {
    try {
        const offset = (page - 1) * pageSize

        const { data, error, count } = await supabase
            .from('forum_user_restrictions')
            .select(`
        *,
        moderator:forum_users!issued_by(username),
        user:forum_users!user_id(username)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const logWithUsernames = (data || []).map(l => ({
            ...l,
            moderator_username: l.moderator?.username,
            user_username: l.user?.username
        }))

        return {
            data: {
                data: logWithUsernames,
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
