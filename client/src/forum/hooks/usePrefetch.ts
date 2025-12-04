/**
 * Hook pentru prefetch pe hover
 * Preîncarcă datele când utilizatorul trece cu mouse-ul peste link-uri
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getTopicById, getTopics } from '../../services/forum';

/**
 * Hook pentru prefetch topicuri și subcategorii
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch un topic când utilizatorul trece cu mouse-ul peste link
   */
  const prefetchTopic = async (topicId: string, subcategorySlug?: string) => {
    const queryKey = queryKeys.topic(topicId, subcategorySlug);
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return; // Datele sunt deja în cache, nu mai e nevoie de prefetch
    }

    // Prefetch topic-ul
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getTopicById(topicId, subcategorySlug);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data!;
      },
      staleTime: 2 * 60 * 1000, // 2 minute
    });
  };

  /**
   * Prefetch topicurile unei subcategorii când utilizatorul trece cu mouse-ul peste link
   */
  const prefetchSubcategory = async (subcategoryId: string) => {
    const queryKey = queryKeys.topics(subcategoryId, 1, 20);
    
    // Verifică dacă datele sunt deja în cache și fresh
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      return; // Datele sunt deja în cache, nu mai e nevoie de prefetch
    }

    // Prefetch topicurile subcategoriei
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getTopics(subcategoryId, 1, 20);
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
    prefetchSubcategory,
  };
}

