/**
 * Tipuri comune pentru componentele de mesaje
 */

export interface MessagePost {
  id: string;
  content: string;
  author: string;
  authorId?: string;
  authorRank: string;
  authorAvatar?: string;
  createdAt: string;
  editedAt?: string;
  editedBy?: string;
  editedByUsername?: string; // Numele utilizatorului care a editat
  editReason?: string; // Motivul editării (pentru admin sau user opțional)
  likes: number;
  dislikes: number;
  respect?: number;
  // Additional user details for sidebar
  authorLocation?: string;
  authorPostCount?: number;
  authorReputationPower?: number;
}

export interface MessageContainerProps {
  post: MessagePost;
  isOriginalPost?: boolean;
  postNumber?: number;
  topicId?: string;
  onRespectChange?: (postId: string, delta: number, comment: string) => void;
  onReply?: (postId: string) => void;
  onQuote?: (postId: string) => void;
  onReputationChange?: () => void;
  onPostDeleted?: () => void;
  onPostEdited?: () => void;
}
