/**
 * Hook pentru prefetch pe hover și preloading agresiv
 * Preîncarcă datele când utilizatorul trece cu mouse-ul peste link-uri sau când stă pe homepage
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getTopicById, getTopics, getPosts, getForumContext } from '../../services/forum';

/**
 * Hook pentru prefetch topicuri, subcategorii, posts și preloading agresiv
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch context forum (RPC)
   * Folosit pentru a face paginile să se încarce instant
   */
  const prefetchForumContext = async (
    slug: string,
    parentSlug?: string,
    expectedType?: string,
    parentType?: string
  ) => {
    // Generăm cheia pentru 'subcategory' parent (primul pas din probing)
    const queryKey = queryKeys.forumContext(slug, parentSlug, expectedType || null, parentType || null);

    // Verifică dacă datele sunt deja în cache
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) return;

    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getForumContext(slug, parentSlug, expectedType, parentType);
        if (result.error) throw new Error(result.error.message);
        return result.data!;
      },
      staleTime: 10 * 60 * 1000, // 10 minute
    });
  };

  /**
   * Prefetch un topic când utilizatorul trece cu mouse-ul peste link
   */
  const prefetchTopic = async (
    topicSlug: string,
    parentSlug?: string,
    isSubforum = false
  ) => {
    // Prefetch contextul paginii TopicPage (ceea ce consumă de fapt TopicPage)
    // Deoarece TopicPage face sequential probing, preîncărcăm ambele variante posibile 
    // dacă nu suntem siguri, sau varianta corectă dacă o avem.

    const pType = isSubforum ? 'subforum' : 'subcategory';

    // Prefetch varianta probabilă
    await prefetchForumContext(topicSlug, parentSlug, undefined, pType);

    // Dacă nu suntem la sub-forum, prefetch și varianta subcategorie (probing behavior)
    if (!isSubforum) {
      await prefetchForumContext(topicSlug, parentSlug, undefined, 'subforum');
    }
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
    topicSlug: string,
    hash: string,
    pageSize = 20,
    parentSlug?: string,
    isSubforum = false
  ) => {
    // Extract post number from hash (ex: #post5 → 5)
    const postNumberMatch = hash.match(/#post(\d+)/i);
    if (!postNumberMatch) {
      await prefetchTopic(topicSlug, parentSlug, isSubforum);
      return;
    }

    const postNumber = parseInt(postNumberMatch[1], 10);
    if (postNumber <= 0) return;

    const page = Math.ceil(postNumber / pageSize);

    // Prefetch contextul paginii
    await prefetchTopic(topicSlug, parentSlug, isSubforum);
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

