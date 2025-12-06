/**
 * Hook pentru prefetch pe hover și preloading agresiv
 * Preîncarcă datele când utilizatorul trece cu mouse-ul peste link-uri sau când stă pe homepage
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getTopicById, getTopics, getPosts } from '../../services/forum';

/**
 * Hook pentru prefetch topicuri, subcategorii, posts și preloading agresiv
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch un topic când utilizatorul trece cu mouse-ul peste link
   */
  const prefetchTopic = async (
    topicId: string, 
    subcategorySlug?: string, 
    subforumSlug?: string,
    subcategoryId?: string,
    subforumId?: string
  ) => {
    const queryKey = queryKeys.topic(topicId, subcategorySlug);
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return; // Datele sunt deja în cache, nu mai e nevoie de prefetch
    }

    // Prefetch topic-ul (folosim ID-uri directe pentru precizie)
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getTopicById(topicId, subcategorySlug, subforumSlug, subcategoryId, subforumId);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data!;
      },
      staleTime: 5 * 60 * 1000, // 5 minute - mai persistent
    });
  };

  /**
   * Prefetch posturile unui topic (pentru link-uri cu hash sau preloading)
   */
  const prefetchPosts = async (topicId: string, page = 1, pageSize = 20) => {
    const queryKey = queryKeys.posts(topicId, page, pageSize);
    
    // Verifică dacă datele sunt deja în cache
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return;
    }

    // Prefetch posturile
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getPosts(topicId, page, pageSize);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data!;
      },
      staleTime: 2 * 60 * 1000, // 2 minute
    });
  };

  /**
   * Prefetch pentru link-uri cu hash - calculează pagina din post number
   */
  const prefetchTopicWithHash = async (
    topicId: string,
    hash: string,
    pageSize = 20,
    subcategorySlug?: string,
    subforumSlug?: string,
    subcategoryId?: string,
    subforumId?: string
  ) => {
    // Extract post number from hash (ex: #post5 → 5)
    const postNumberMatch = hash.match(/#post(\d+)/i);
    if (!postNumberMatch) {
      // Nu e hash de post, prefetch normal
      await prefetchTopic(topicId, subcategorySlug, subforumSlug, subcategoryId, subforumId);
      return;
    }

    const postNumber = parseInt(postNumberMatch[1], 10);
    if (postNumber <= 0) return;

    // Calculăm pagina: post #5 cu pageSize=20 → pagina 1 (posturile 1-20 sunt pe pagina 1)
    // Formula: Math.ceil(postNumber / pageSize)
    const page = Math.ceil(postNumber / pageSize);

    // Prefetch topic-ul și posturile din pagina corectă în paralel
    await Promise.all([
      prefetchTopic(topicId, subcategorySlug, subforumSlug, subcategoryId, subforumId),
      prefetchPosts(topicId, page, pageSize),
    ]);
  };

  /**
   * Prefetch topicurile unei subcategorii când utilizatorul trece cu mouse-ul peste link
   */
  const prefetchSubcategory = async (subcategoryId: string, subforumId?: string) => {
    const queryKey = queryKeys.topics(subcategoryId || subforumId || '', 1, 20, subforumId ? 'subforum' : 'subcategory');
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return;
    }

    // Prefetch topicurile subcategoriei/subforumului
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getTopics(subcategoryId, 1, 20, subforumId);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data!;
      },
      staleTime: 5 * 60 * 1000, // 5 minute
    });
  };

  return {
    prefetchTopic,
    prefetchPosts,
    prefetchTopicWithHash,
    prefetchSubcategory,
  };
}

