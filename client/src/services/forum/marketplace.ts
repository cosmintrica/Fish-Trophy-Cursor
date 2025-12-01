/**
 * Forum Marketplace Service
 * Handles sales eligibility verification and seller ratings
 */

import { supabase } from '../../lib/supabase'
import type {
    ForumSalesVerification,
    SalesEligibilityCheck,
    ApiResponse
} from './types'

// ============================================
// ELIGIBILITY REQUIREMENTS
// ============================================

const ELIGIBILITY_REQUIREMENTS = {
    MIN_ACCOUNT_AGE_DAYS: 15,
    MIN_REPUTATION_POINTS: 10,
    MIN_POST_COUNT: 25,
    EMAIL_VERIFIED: true
} as const

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Check if user is eligible to sell in marketplace
 */
export async function checkSalesEligibility(
    userId: string
): Promise<ApiResponse<SalesEligibilityCheck>> {
    try {
        // Get user's forum profile
        const { data: forumUser, error: forumError } = await supabase
            .from('forum_users')
            .select('reputation_points, post_count, created_at')
            .eq('user_id', userId)
            .single()

        if (forumError || !forumUser) {
            return { error: { message: 'Forum profile not found', code: 'PROFILE_NOT_FOUND' } }
        }

        // Get user's auth data
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) {
            return { error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } }
        }

        // Calculate account age
        const accountAge = Math.floor(
            (Date.now() - new Date(forumUser.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Check email verification
        const emailVerified = !!authUser.email_confirmed_at

        // Collect reasons for ineligibility
        const reasons: string[] = []

        if (accountAge < ELIGIBILITY_REQUIREMENTS.MIN_ACCOUNT_AGE_DAYS) {
            reasons.push(`Contul trebuie să aibă minim ${ELIGIBILITY_REQUIREMENTS.MIN_ACCOUNT_AGE_DAYS} zile (ai ${accountAge} zile)`)
        }

        if (forumUser.reputation_points < ELIGIBILITY_REQUIREMENTS.MIN_REPUTATION_POINTS) {
            reasons.push(`Reputație minim ${ELIGIBILITY_REQUIREMENTS.MIN_REPUTATION_POINTS} puncte (ai ${forumUser.reputation_points})`)
        }

        if (forumUser.post_count < ELIGIBILITY_REQUIREMENTS.MIN_POST_COUNT) {
            reasons.push(`Minim ${ELIGIBILITY_REQUIREMENTS.MIN_POST_COUNT} postări (ai ${forumUser.post_count})`)
        }

        if (!emailVerified) {
            reasons.push('Email neverificat - verifică-ți adresa de email')
        }

        const eligible = reasons.length === 0

        return {
            data: {
                eligible,
                reasons,
                account_age_days: accountAge,
                reputation_points: forumUser.reputation_points,
                post_count: forumUser.post_count,
                email_verified: emailVerified
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Get seller rating (average from marketplace feedback)
 */
export async function getSellerRating(sellerId: string): Promise<ApiResponse<{
    average_rating: number
    total_reviews: number
    rating_breakdown: { 1: number; 2: number; 3: number; 4: number; 5: number }
}>> {
    try {
        const { data: feedback, error } = await supabase
            .from('forum_marketplace_feedback')
            .select('rating')
            .eq('seller_id', sellerId)

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const reviews = feedback || []
        const totalReviews = reviews.length

        if (totalReviews === 0) {
            return {
                data: {
                    average_rating: 0,
                    total_reviews: 0,
                    rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            }
        }

        const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
        const average = parseFloat((sum / totalReviews).toFixed(2))

        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviews.forEach(r => {
            breakdown[r.rating as keyof typeof breakdown]++
        })

        return {
            data: {
                average_rating: average,
                total_reviews: totalReviews,
                rating_breakdown: breakdown
            }
        }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}

/**
 * Check if user has "Verified Seller" badge (5+ successful transactions)
 */
export async function hasVerifiedSellerBadge(sellerId: string): Promise<ApiResponse<boolean>> {
    try {
        const { data, error } = await supabase
            .from('forum_marketplace_feedback')
            .select('id')
            .eq('seller_id', sellerId)
            .eq('transaction_completed', true)
            .gte('rating', 4) // Positive = 4 or 5 stars

        if (error) {
            return { error: { message: error.message, code: error.code } }
        }

        const hasVerifiedBadge = (data || []).length >= 5

        return { data: hasVerifiedBadge }
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } }
    }
}
