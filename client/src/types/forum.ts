// Tipuri pentru forum pescuit - conform schema din plan

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ForumUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  signature?: string;
  post_count: number;
  reputation_points: number;
  rank: UserRank;
  badges: string[];
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  // Admin properties
  isAdmin?: boolean;
  canModerateRespect?: boolean;
  canDeletePosts?: boolean;
  canBanUsers?: boolean;
  canEditAnyPost?: boolean;
}

export type UserRank = 
  | 'incepator' 
  | 'pescar' 
  | 'experimentat' 
  | 'expert' 
  | 'maestru' 
  | 'moderator' 
  | 'vip';

export interface ForumCategory {
  id: string;
  name: string;
  description?: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  subcategories?: ForumSubcategory[];
  stats?: {
    topic_count: number;
    post_count: number;
    last_post?: {
      id: string;
      user_name: string;
      created_at: string;
      topic_title: string;
    };
  };
}

export interface ForumSubcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  moderator_only: boolean;
  created_at: string;
  stats?: {
    topic_count: number;
    post_count: number;
    last_post?: {
      id: string;
      user_name: string;
      created_at: string;
      topic_title: string;
    };
  };
}

export interface ForumTopic {
  id: string;
  subcategory_id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  view_count: number;
  reply_count: number;
  last_post_at: string;
  last_post_user_id?: string;
  created_at: string;
  // Relations
  user?: ForumUser;
  last_post_user?: ForumUser;
  subcategory?: ForumSubcategory;
}

export interface ForumPost {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  edited_at?: string;
  edited_by?: string;
  created_at: string;
  // Relations
  user?: ForumUser;
  topic?: ForumTopic;
  attachments?: ForumAttachment[];
}

export interface ForumAttachment {
  id: string;
  post_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface ForumStats {
  total_users: number;
  total_topics: number;
  total_posts: number;
  online_users: number;
  newest_user?: {
    id: string;
    username: string;
  };
}
