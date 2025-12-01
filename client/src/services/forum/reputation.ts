/**
 * Forum Reputation Service
 * Handles like/dislike, power levels, and reputation logs
 */

import { supabase } from '../../lib/supabase'
import type {
    AwardReputationParams,
    AdminAwardReputationParams,
    ForumReputationLog,
    ReputationLogWithUsers,
    ApiResponse,
    PaginatedResponse
} from './types'

// ============================================
// REPUTATION POWER THRESHOLDS
// ============================================

export const REPUTATION_POWER_THRESHOLDS = {
    0: { min: 0, max: 49, like: 1, dislike: 0, comment_multiplier: 0 },
    1: { min: 50, max: 199, like: 1, dislike: -1, comment_multiplier: 2 },
    2: { min: 200, max: 499, like: 1, dislike: -1, comment_multiplier: 3 },
    3: { min: 500, max: 999, like: 1, dislike: -1, comment_multiplier: 4 },
    4: { min: 1000, max: 2499, like: 1, dislike: -1, comment_multiplier: 5 },
    5: { min: 2500, max: 4999, like: 1, dislike: -1, comment_multiplier: 6 },
    6: { min: 5000, max: 9999, like: 1, dislike: -1, comment_multiplier: 7 },
    7: { min: 10000, max: Infinity, like: 1, dislike: -1, comment_multiplier: 8 }
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate user's reputation power (0-7) based on reputation points
 */
export function calculateReputationPower(reputationPoints: number): number {
    if (reputationPoints < 50) return 0
    if (reputationPoints < 200) return 1
    if (reputationPoints < 500) return 2
    if (reputationPoints < 1000) return 3
    if (reputationPoints < 2500) return 4
    if (reputationPoints < 5000) return 5
    if (reputationPoints < 10000) return 6
    return 7
}

/**
 * Calculate actual points awarded based on power level and comment
 */
export function calculateAwardedPoints(
    giverPower: number,
    isLike: boolean,
    hasComment: boolean
): number {
    const powerConfig = REPUTATION_POWER_THRESHOLDS[giverPower as keyof typeof REPUTATION_POWER_THRESHOLDS]

    if (!powerConfig) {
        throw new Error(`Invalid power level: ${giverPower}`)
    }

    // Power 0 can only like (no dislike)
    if (giverPower === 0 && !isLike) {
        throw new Error('Users with Power 0 cannot dislike')
    }

    const basePoints = isLike ? powerConfig.like : powerConfig.dislike

    // If comment provided (min 3 chars), multiply
    if (hasComment) {
        return basePoints * powerConfig.comment_multiplier
    }

    return basePoints
}

/**
 * Validate comment length (min 3 characters)
 */
export function validateComment(comment?: string): boolean {
    if (!comment) return false
    return comment.trim().length >= 3
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Award reputation (like/dislike) to a user
 */
export async function awardReputation(
    params: AwardReputationParams
): Promise<ApiResponse<ForumReputationLog>> {
    try {
        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !currentUser) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        // Get giver's forum profile (for power level)
        const { data: giverProfile, error: profileError } = await supabase
            .from('forum_users')
            .select('reputation_power, reputation_points')
            .eq('user_id', currentUser.id)
            .single()

        if (profileError || !giverProfile) {
            return { error: { message: 'Forum profile not found', code: 'PROFILE_NOT_FOUND' } }
        }

        // Validate comment if provided
        const hasComment = validateComment(params.comment)
        if (params.comment && !hasComment) {
            return { error: { message: 'Comment must be at least 3 characters', code: 'INVALID_COMMENT' } }
        }

        // Calculate points based on power and comment
        const isLike = params.points > 0
        const actualPoints = calculateAwardedPoints(giverProfile.reputation_power, isLike, hasComment)

        // Insert reputation log
        const { data, error } = await supabase
            .from('forum_reputation_logs')
            .insert({
                giver_user_id: currentUser.id,
                receiver_user_id: params.receiverUserId,
                post_id: params.postId,
                points: actualPoints,
                comment: params.comment || null,
                giver_power: giverProfile.reputation_power,
                is_admin_award: false
            })
            .select()
            .single()

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        // Trigger will automatically update receiver's reputation_points
        return { data }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Admin award reputation (unlimited amount)
 * Only admins can call this function (RLS enforced)
 */
export async function adminAwardReputation(
    params: AdminAwardReputationParams
): Promise<ApiResponse<ForumReputationLog>> {
    try {
        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !currentUser) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        // RLS will enforce admin permission

        // Insert reputation log
        const { data, error } = await supabase
            .from('forum_reputation_logs')
            .insert({
                giver_user_id: currentUser.id,
                receiver_user_id: params.receiverUserId,
                post_id: null,
                points: params.points, // Unlimited
                comment: params.comment,
                giver_power: 7, // Max power for admin
                is_admin_award: true
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
 * Get reputation logs for a user (last 10 public, or all for admin)
 */
export async function getUserReputationLogs(
    userId: string,
    limit = 10
): Promise<ApiResponse<PaginatedResponse<ReputationLogWithUsers>>> {
    try {
        // RLS will automatically enforce visibility rules:
        // - Regular users see last 10
        // - Admins see all
        const { data, error, count } = await supabase
            .from('forum_reputation_logs')
            .select(`
        *,
        giver:forum_users!giver_user_id(username),
        receiver:forum_users!receiver_user_id(username),
        post:forum_posts!post_id(
          id,
          topic:forum_topics(title)
        )
      `, { count: 'exact' })
            .eq('receiver_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        // Transform data to include usernames
        const transformedData: ReputationLogWithUsers[] = (data || []).map(log => ({
            ...log,
            giver_username: log.giver?.username || 'Unknown',
            receiver_username: log.receiver?.username || 'Unknown',
            post_title: log.post?.topic?.title
        }))

        return {
            data: {
                data: transformedData,
                total: count || 0,
                page: 1,
                page_size: limit,
                has_more: (count || 0) > limit
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get all reputation logs for a user (admin only)
 */
export async function getAllUserReputationLogs(
    userId: string,
    page = 1,
    pageSize = 50
): Promise<ApiResponse<PaginatedResponse<ReputationLogWithUsers>>> {
    try {
        const offset = (page - 1) * pageSize

        const { data, error, count } = await supabase
            .from('forum_reputation_logs')
            .select(`
        *,
        giver:forum_users!giver_user_id(username),
        receiver:forum_users!receiver_user_id(username),
        post:forum_posts!post_id(
          id,
          topic:forum_topics(title)
        )
      `, { count: 'exact' })
            .eq('receiver_user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const transformedData: ReputationLogWithUsers[] = (data || []).map(log => ({
            ...log,
            giver_username: log.giver?.username || 'Unknown',
            receiver_username: log.receiver?.username || 'Unknown',
            post_title: log.post?.topic?.title
        }))

        return {
            data: {
                data: transformedData,
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
 * Get reputation statistics for a user
 */
export async function getUserReputationStats(userId: string): Promise<ApiResponse<{
    total_reputation: number
    reputation_power: number
    total_received: number
    total_given: number
    positive_count: number
    negative_count: number
    recent_trend: 'increasing' | 'decreasing' | 'stable'
}>> {
    try {
        // Get user's current stats
        const { data: user, error: userError } = await supabase
            .from('forum_users')
            .select('reputation_points, reputation_power')
            .eq('user_id', userId)
            .single()

        if (userError || !user) {
            return { error: { message: 'User not found', code: 'USER_NOT_FOUND' } }
        }

        // Get reputation counts
        const { data: receivedLogs } = await supabase
            .from('forum_reputation_logs')
            .select('points')
            .eq('receiver_user_id', userId)

        const { data: givenLogs } = await supabase
            .from('forum_reputation_logs')
            .select('points')
            .eq('giver_user_id', userId)

        const positiveCount = (receivedLogs || []).filter(log => log.points > 0).length
        const negativeCount = (receivedLogs || []).filter(log => log.points < 0).length
        const totalGiven = (givenLogs || []).length

        // Calculate recent trend (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: recentLogs } = await supabase
            .from('forum_reputation_logs')
            .select('points, created_at')
            .eq('receiver_user_id', userId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true })

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
        if (recentLogs && recentLogs.length > 0) {
            const totalRecent = recentLogs.reduce((sum, log) => sum + log.points, 0)
            if (totalRecent > 10) trend = 'increasing'
            else if (totalRecent < -10) trend = 'decreasing'
        }

        return {
            data: {
                total_reputation: user.reputation_points,
                reputation_power: user.reputation_power,
                total_received: (receivedLogs || []).length,
                total_given: totalGiven,
                positive_count: positiveCount,
                negative_count: negativeCount,
                recent_trend: trend
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}
