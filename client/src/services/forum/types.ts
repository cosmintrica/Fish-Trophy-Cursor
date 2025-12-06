/**
 * Forum Types & Interfaces
 * Based on SQL migrations in supabase/migrations/forum/
 */

// ============================================
// ENUMS
// ============================================

export type UserRole =
    | 'admin'
    | 'moderator'
    | 'firma'
    | 'organizator_concurs'
    | 'admin_balta'
    | 'oficial'
    | 'ong'
    | 'premium'
    | 'user'

export type UserRank =
    | 'ou_de_peste'
    | 'puiet'
    | 'pui_de_crap'
    | 'crap_junior'
    | 'crap_senior'
    | 'maestru_pescar'
    | 'legenda_apelor'

export type RestrictionType =
    | 'mute'
    | 'view_ban'
    | 'shadow_ban'
    | 'temp_ban'
    | 'permanent_ban'

export type TopicType = 'normal' | 'announcement' | 'poll' | 'sticky'

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export type BraconajStatus =
    | 'pending'
    | 'in_review'
    | 'forwarded_authorities'
    | 'resolved'
    | 'false_report'

// ============================================
// DATABASE TABLES
// ============================================

export interface ForumRole {
    id: string
    name: UserRole
    display_name: string
    description?: string
    color: string
    icon?: string
    permissions: Record<string, boolean>
    is_system_role: boolean
    created_at: string
    updated_at: string
}

export interface ForumUserRank {
    id: string
    name: UserRank
    display_name: string
    min_posts: number
    max_posts?: number
    color: string
    icon?: string
    created_at: string
}

export interface ForumCategory {
    id: string
    slug?: string // Slug pentru URL-uri frumoase (ex: tehnici-de-pescuit)
    name: string
    description?: string
    icon?: string
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
    totalTopics?: number
    totalPosts?: number
}

export interface ForumSubforum {
    id: string
    subcategory_id: string  // Changed: subforums are now under subcategories
    category_id?: string  // Optional: reference to parent category (derived from subcategory)
    name: string
    description?: string
    icon?: string
    slug?: string
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
    category_slug?: string
    category_name?: string
    subcategory_slug?: string
    subcategory_name?: string
    topicCount?: number
    postCount?: number
    lastPost?: {
        topicId: string
        topicTitle: string
        topicSlug?: string
        author: string
        time: string
        date?: string | null
        timeOnly?: string
        postNumber?: number | null
        categorySlug?: string | null
        subcategorySlug?: string | null
        subforumSlug?: string | null
    }
}

export interface ForumSubcategory {
    id: string
    slug?: string // Slug pentru URL-uri frumoase (ex: pescuit-nocturn)
    category_id?: string
    subforum_id?: string  // Deprecated: no longer used, kept for compatibility
    name: string
    description?: string
    icon?: string
    sort_order: number
    is_active: boolean
    moderator_only: boolean
    created_at: string
    updated_at: string
    subforums?: ForumSubforum[]  // NEW: subforums are now under subcategories
    topicCount?: number  // Direct topics (not in subforums)
    postCount?: number  // Direct posts (not in subforums)
    lastPost?: {
        topicId: string
        topicTitle: string
        topicSlug?: string
        author: string
        time: string
        date?: string | null
        timeOnly?: string
        postNumber?: number | null
        categorySlug?: string | null
        subcategorySlug?: string | null
        subforumSlug?: string | null
        created_at?: string
        user_name?: string
        topic_title?: string
    }
}

export interface ForumUser {
    id: string
    user_id: string // FK to auth.users
    username: string
    role_id: string // FK to forum_roles
    avatar_url?: string
    signature?: string
    post_count: number
    topic_count: number
    reputation_points: number
    reputation_power: number // 0-7
    rank: UserRank
    badges: string[] // JSON array
    is_online: boolean
    last_seen_at?: string
    created_at: string
    updated_at: string
}

export interface ForumUserRestriction {
    id: string
    user_id: string // FK to auth.users
    restriction_type: RestrictionType
    reason?: string
    issued_by: string // FK to auth.users
    expires_at?: string
    is_active: boolean
    created_at: string
}

export interface ForumTopic {
    id: string
    subcategory_id?: string  // Optional: topic can be in subcategory OR subforum
    subforum_id?: string  // Optional: topic can be in subforum (NEW STRUCTURE)
    user_id: string // FK to auth.users
    title: string
    topic_type: TopicType
    is_locked: boolean
    is_pinned: boolean
    is_deleted: boolean
    view_count: number
    reply_count: number
    last_post_at?: string
    last_post_user_id?: string
    created_at: string
    updated_at: string
}

export interface ForumPost {
    id: string
    topic_id: string
    user_id: string // FK to auth.users
    content: string
    is_edited: boolean
    edited_at?: string
    edited_by?: string
    edit_reason?: string // Motivul editării (obligatoriu pentru admin)
    edited_by_admin?: boolean // True dacă a fost editată de admin
    is_deleted: boolean
    deleted_at?: string
    deleted_by?: string
    delete_reason?: string // Motivul ștergerii (obligatoriu pentru admin)
    like_count: number
    created_at: string
    post_number?: number // Numărul postului în topic
}

export interface ForumReputationLog {
    id: string
    giver_user_id: string // FK to auth.users
    receiver_user_id: string // FK to auth.users
    post_id?: string
    points: number // -8 to +8
    comment?: string
    giver_power: number // 0-7
    is_admin_award: boolean
    created_at: string
}

export interface ForumModerator {
    id: string
    user_id: string // FK to auth.users
    category_id?: string
    subcategory_id?: string
    permissions: Record<string, boolean>
    created_at: string
}

export interface ForumReport {
    id: string
    reporter_id: string // FK to auth.users
    reported_user_id?: string
    post_id?: string
    topic_id?: string
    reason: string
    description?: string
    status: ReportStatus
    reviewed_by?: string
    reviewed_at?: string
    created_at: string
}

export interface ForumBraconajReport {
    id: string
    reporter_id: string // FK to auth.users
    reported_user_id?: string
    incident_date: string
    location: string
    location_gps?: { x: number; y: number } // Point type
    description: string
    evidence_urls: string[]
    witness_contact?: string
    status: BraconajStatus
    reviewed_by?: string
    reviewed_at?: string
    forwarded_to?: string
    notes?: string
    is_public: boolean
    created_at: string
}

export interface ForumSalesVerification {
    id: string
    user_id: string // FK to auth.users
    account_age_days: number
    reputation_points: number
    post_count: number
    is_eligible: boolean
    email_verified: boolean
    phone_verified: boolean
    successful_sales: number
    failed_sales: number
    last_checked_at: string
    created_at: string
}

export interface ForumMarketplaceFeedback {
    id: string
    sale_post_id: string
    seller_id: string // FK to auth.users
    buyer_id: string // FK to auth.users
    rating: number // 1-5
    review_text?: string
    transaction_completed: boolean
    created_at: string
}

export interface ForumPoll {
    id: string
    topic_id: string
    question: string
    options: { id: number; text: string; votes: number }[]
    multiple_choice: boolean
    expires_at?: string
    created_at: string
}

export interface ForumPollVote {
    id: string
    poll_id: string
    user_id: string // FK to auth.users
    option_ids: number[]
    created_at: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Reputation
export interface AwardReputationParams {
    receiverUserId: string
    postId?: string
    points: number // -1, +1, or amplified with comment
    comment?: string // Min 3 characters for amplification
}

export interface AdminAwardReputationParams {
    receiverUserId: string
    points: number // Unlimited
    comment: string
    reason?: string // Optional - not stored in database, only for API consistency
}

export interface ReputationLogWithUsers extends ForumReputationLog {
    giver_username: string
    receiver_username: string
    post_title?: string
}

// Categories
export interface CategoryCreateParams {
    name: string
    description?: string
    icon?: string
    sort_order?: number
}

export interface CategoryUpdateParams extends Partial<CategoryCreateParams> {
    is_active?: boolean
}

export interface CategoryWithChildren extends ForumCategory {
    subcategories?: ForumSubcategory[]  // Subcategories contain subforums
    subforums?: ForumSubforum[]  // Legacy: direct subforums under category (rare, but possible)
    lastPost?: {
        topicId: string
        topicTitle: string
        topicSlug?: string
        author: string
        time: string
        date?: string | null
        timeOnly?: string
        postNumber?: number | null
        categorySlug?: string | null
        subcategorySlug?: string | null
        subforumSlug?: string | null
        created_at?: string
        user_name?: string
        topic_title?: string
    }
}

// Topics & Posts
export interface TopicCreateParams {
    subcategory_id: string
    title: string
    content: string // First post content
    topic_type?: TopicType
}

export interface PostCreateParams {
    topic_id: string
    content: string
    reply_to_post_id?: string
}

export interface PostUpdateParams {
    content: string
}

// Search
export interface SearchParams {
    query: string
    author?: string
    category_id?: string
    subcategory_id?: string
    date_from?: string
    date_to?: string
    content_type?: 'topics' | 'posts' | 'users' | 'all'
    sort_by?: 'relevance' | 'date' | 'reputation'
    limit?: number
    offset?: number
}

export interface SearchResult {
    id: string
    type: 'topic' | 'post' | 'user'
    title?: string
    content?: string
    username?: string
    created_at: string
    rank?: number // Full-text search rank
    excerpt?: string // Highlighted excerpt
}

// Marketplace
export interface SalesEligibilityCheck {
    eligible: boolean
    reasons: string[]
    account_age_days: number
    reputation_points: number
    post_count: number
    email_verified: boolean
}

// Braconaj
export interface BraconajReportCreateParams {
    reported_user_id?: string
    incident_date: string
    location: string
    location_gps?: { lat: number; lng: number }
    description: string
    evidence_files: File[]
    witness_contact?: string
}

// BBCode
export interface BBCodeParseResult {
    html: string
    embeds: {
        records: string[] // Record IDs
        gear: string[] // Gear IDs
        quotes: { user: string; post_id: string; text: string }[]
    }
}

// Moderation
export interface BanUserParams {
    user_id: string
    restriction_type: RestrictionType
    reason: string
    expires_at?: string
}

// ============================================
// UTILITY TYPES
// ============================================

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    page_size: number
    has_more: boolean
}

export interface ApiError {
    message: string
    code?: string
    title?: string
    details?: unknown
    restrictionType?: string
    reason?: string
    expiresAt?: string
}

export interface ApiResponse<T> {
    data?: T
    error?: ApiError
}
