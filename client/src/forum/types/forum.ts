export interface ForumUser {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  rank: string;
  post_count: number;
  topic_count: number;
  reputation_points: number;
  reputation_power?: number;
  badges: string[];
  isAdmin?: boolean;
  canModerateRespect?: boolean;
  canDeletePosts?: boolean;
  canBanUsers?: boolean;
  canEditAnyPost?: boolean;
}

export interface ForumTopic {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  author: string;
  authorRank: string;
  authorAvatar?: string;
  replies: number;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  lastPost: {
    id: string;
    author: string;
    authorRank: string;
    time: string;
    content: string;
  };
}

export interface ForumPost {
  id: string;
  topicId: string;
  content: string;
  author: string;
  authorRank: string;
  authorAvatar?: string;
  createdAt: string;
  editedAt?: string;
  likes: number;
  dislikes: number;
}

export interface ForumSubcategory {
  id: string;
  slug?: string; // Slug pentru URL-uri frumoase (ex: pescuit-nocturn)
  name: string;
  description: string;
  topicCount: number;
  postCount: number;
  icon?: string;
  moderator_only?: boolean;
  stats?: {
    totalTopics: number;
    totalPosts: number;
    totalMembers: number;
    onlineUsers: number;
    topic_count?: number;
    post_count?: number;
    last_post?: {
      topicId: string;
      topicTitle: string;
      topicSlug?: string;
      author: string;
      time: string;
      date?: string | null;
      timeOnly?: string;
      postNumber?: number | null;
      categorySlug?: string | null;
      subcategorySlug?: string | null;
      subforumSlug?: string | null;
      created_at?: string;
      user_name?: string;
      topic_title?: string;
    };
  };
  lastPost?: {
    topicId: string;
    topicTitle: string;
    topicSlug?: string;
    author: string;
    time: string;
    date?: string | null;
    timeOnly?: string;
    postNumber?: number | null;
    categorySlug?: string | null;
    subcategorySlug?: string | null;
    subforumSlug?: string | null;
    created_at?: string;
    user_name?: string;
    topic_title?: string;
  };
}

export interface ForumCategory {
  id: string;
  slug?: string; // Slug pentru URL-uri frumoase (ex: tehnici-de-pescuit)
  name: string;
  description: string;
  icon: string;
  isCollapsed?: boolean;
  subcategories: ForumSubcategory[];
  totalTopics: number;
  totalPosts: number;
  stats?: {
    totalTopics: number;
    totalPosts: number;
    totalMembers: number;
    onlineUsers: number;
    topic_count?: number;
    post_count?: number;
    last_post?: {
      topicId: string;
      topicTitle: string;
      topicSlug?: string;
      author: string;
      time: string;
      date?: string | null;
      timeOnly?: string;
      postNumber?: number | null;
      categorySlug?: string | null;
      subcategorySlug?: string | null;
      subforumSlug?: string | null;
      created_at?: string;
      user_name?: string;
      topic_title?: string;
    };
  };
  lastPost?: {
    topicId: string;
    topicTitle: string;
    topicSlug?: string;
    author: string;
    time: string;
    date?: string | null;
    timeOnly?: string;
    postNumber?: number | null;
    categorySlug?: string | null;
    subcategorySlug?: string | null;
    subforumSlug?: string | null;
    created_at?: string;
    user_name?: string;
    topic_title?: string;
  };
}
