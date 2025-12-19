/**
 * Forum Services - Central Export
 * 
 * Complete API layer for the Fish Trophy Forum
 * All services use Supabase client and return ApiResponse<T>
 */

// Export all types
export * from './types'

// Context
export {
    getForumContext
} from './context'

// Reputation System
export {
    calculateReputationPower,
    calculateAwardedPoints,
    validateComment,
    awardReputation,
    adminAwardReputation,
    getUserReputationLogs,
    getAllUserReputationLogs,
    getUserReputationStats,
    REPUTATION_POWER_THRESHOLDS
} from './reputation'

// Categories Management
export {
    getCategoriesWithHierarchy,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    createSubforum,
    updateSubforum,
    deleteSubforum,
    getSubcategories,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
} from './categories'

// Marketplace
export {
    checkSalesEligibility,
    getSellerRating,
    hasVerifiedSellerBadge
} from './marketplace'

// BBCode Parser
export {
    parseBBCode,
    stripBBCode
} from './bbcode'

// Search
export {
    searchForum,
    getTrendingTopics,
    getSearchSuggestions
} from './search'

// Topics
export {
    getTopics,
    getTopicById,
    createTopic,
    updateTopic,
    toggleTopicPin,
    toggleTopicLock,
    toggleTopicImportant,
    deleteTopic
} from './topics'

// Posts
export {
    getPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    getUserPosts,
    quotePost
} from './posts'

// Moderation
export {
    restrictUser,
    removeRestriction,
    getUserRestrictions,
    getAllUserRestrictions,
    hasActiveRestriction,
    createReport,
    getReports,
    updateReportStatus,
    moderatePost,
    getModerationLog
} from './moderation'
