/**
 * Forum Topic Read Status Hook
 * Verifică dacă un topic are mesaje necitite pentru user-ul curent
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from './useAuth';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook pentru verificarea status-ului read/unread pentru un topic
 */
export function useTopicReadStatus(topicId: string | null | undefined) {
  const { forumUser } = useAuth();
  const queryKey = topicId && forumUser ? queryKeys.topicReadStatus(topicId, forumUser.id) : null;

  const { data: hasUnread, isLoading } = useQuery<boolean>({
    queryKey: queryKey || ['topic-read-status', 'disabled'],
    queryFn: async () => {
      if (!topicId || !forumUser) return false;

      try {
        // Folosește funcția RPC pentru verificare rapidă
        const { data, error } = await supabase.rpc('has_unread_posts', {
          p_user_id: forumUser.id,
          p_topic_id: topicId
        });

        if (error) {
          console.error('Error checking unread status:', error);
          return false;
        }

        return data || false;
      } catch (error) {
        console.error('Error in useTopicReadStatus:', error);
        return false;
      }
    },
    enabled: !!queryKey,
    staleTime: 0, // 0 - forțează refetch la fiecare verificare pentru actualizări instant
    gcTime: 2 * 60 * 1000, // 2 minute
    refetchOnWindowFocus: false, // Dezactivat pentru a evita refresh-uri când schimbi tab-ul
    refetchOnMount: true, // Forțează refetch când componenta se montează
  });

  return {
    hasUnread: hasUnread || false,
    isLoading,
  };
}

/**
 * Hook pentru marcarea unui topic ca citit
 */
export function useMarkTopicAsRead() {
  const { forumUser } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ topicId, postId }: { topicId: string; postId?: string }) => {
      if (!forumUser) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('mark_topic_as_read', {
        p_user_id: forumUser.id,
        p_topic_id: topicId,
        p_post_id: postId || null,
      });

      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      if (!forumUser) return;

      // 1. Invalidează cache-ul pentru status-ul topicului
      queryClient.invalidateQueries({
        queryKey: queryKeys.topicReadStatus(variables.topicId, forumUser.id),
      });

      // 2. Invalidează cache-ul pentru batch topics read status (pentru listele de topicuri)
      queryClient.invalidateQueries({
        queryKey: ['topics-read-status-batch', forumUser.id],
      });

      // 3. Obține subcategory_id din topic pentru a invalida cache-ul subcategoriei
      try {
        const { data: topicData } = await supabase
          .from('forum_topics')
          .select('subcategory_id')
          .eq('id', variables.topicId)
          .single();

        if (topicData?.subcategory_id) {
          // Invalidează cache-ul pentru subcategorie (pentru homepage)
          queryClient.invalidateQueries({
            queryKey: queryKeys.subcategoryUnreadStatus(topicData.subcategory_id, forumUser.id),
          });

          // Invalidează cache-ul pentru batch subcategories read status (pentru homepage)
          queryClient.invalidateQueries({
            queryKey: ['subcategories-read-status-batch', forumUser.id],
          });
        }

        // 4. Obține subforum_id din topic pentru a invalida cache-ul subforum-ului
        try {
          const { data: topicDataSubforum } = await supabase
            .from('forum_topics')
            .select('subforum_id')
            .eq('id', variables.topicId)
            .single();

          if (topicDataSubforum?.subforum_id) {
            // Invalidează cache-ul pentru batch subforums read status
            queryClient.invalidateQueries({
              queryKey: ['subforums-read-status-batch', forumUser.id],
            });
          }
        } catch (error) {
          // Silent fail - nu blocăm procesul dacă nu putem obține subforum_id
        }
      } catch (error) {
        // Silent fail - nu blocăm procesul dacă nu putem obține subcategory_id
      }
    },
  });

  return {
    markAsRead: mutation.mutateAsync,
    isMarking: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook pentru verificarea status-ului read/unread pentru multiple topicuri (batch)
 * Util pentru liste de topicuri
 */
export function useMultipleTopicsReadStatus(topicIds: string[]) {
  const { forumUser } = useAuth();

  const { data: unreadMap, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: forumUser ? ['topics-read-status-batch', forumUser.id, topicIds.sort().join(',')] : ['disabled'],
    queryFn: async () => {
      if (!forumUser || topicIds.length === 0) return {};

      try {
        // Verifică status-ul pentru fiecare topic
        const promises = topicIds.map(async (topicId) => {
          const { data, error } = await supabase.rpc('has_unread_posts', {
            p_user_id: forumUser.id,
            p_topic_id: topicId,
          });

          if (error) {
            console.error(`Error checking unread for topic ${topicId}:`, error);
            return { topicId, hasUnread: false };
          }

          // Debug log pentru a vedea de ce nu apare statusul necitit
          if (data) console.log(`Topic ${topicId} has unread posts for user ${forumUser.id}`);

          return { topicId, hasUnread: data || false };
        });

        const results = await Promise.all(promises);

        // Transformă array-ul în obiect pentru lookup rapid
        return results.reduce((acc, { topicId, hasUnread }) => {
          acc[topicId] = hasUnread;
          return acc;
        }, {} as Record<string, boolean>);
      } catch (error) {
        console.error('Error in useMultipleTopicsReadStatus:', error);
        return {};
      }
    },
    enabled: !!forumUser && topicIds.length > 0,
    staleTime: 0, // 0 - forțează refetch pentru actualizări instant
    gcTime: 2 * 60 * 1000, // 2 minute
    refetchOnMount: true, // Forțează refetch când componenta se montează
  });

  return {
    unreadMap: unreadMap || {},
    isLoading,
    hasUnread: (topicId: string) => unreadMap?.[topicId] || false,
  };
}

/**
 * Hook pentru verificarea status-ului read/unread pentru o subcategorie
 * Returnează true dacă există cel puțin un topic cu mesaje necitite în subcategorie
 */
export function useSubcategoryUnreadStatus(subcategoryId: string | null | undefined) {
  const { forumUser } = useAuth();
  const queryKey = subcategoryId && forumUser ? queryKeys.subcategoryUnreadStatus(subcategoryId, forumUser.id) : null;

  const { data: hasUnread, isLoading } = useQuery<boolean>({
    queryKey: queryKey || ['subcategory-read-status', 'disabled'],
    queryFn: async () => {
      if (!subcategoryId || !forumUser) return false;

      try {
        // Folosește funcția RPC pentru verificare rapidă
        const { data, error } = await supabase.rpc('has_unread_topics_in_subcategory', {
          p_user_id: forumUser.id,
          p_subcategory_id: subcategoryId
        });

        if (error) {
          console.error('Error checking subcategory unread status:', error);
          return false;
        }

        return data || false;
      } catch (error) {
        console.error('Error in useSubcategoryUnreadStatus:', error);
        return false;
      }
    },
    enabled: !!queryKey,
    staleTime: 0, // 0 - forțează refetch pentru actualizări instant
    gcTime: 2 * 60 * 1000, // 2 minute
    refetchOnWindowFocus: false, // Dezactivat pentru a evita refresh-uri când schimbi tab-ul
    refetchOnMount: true, // Forțează refetch când componenta se montează
  });

  return {
    hasUnread: hasUnread || false,
    isLoading,
  };
}

/**
 * Hook pentru verificarea status-ului read/unread pentru multiple subcategorii (batch)
 * Util pentru liste de subcategorii (homepage)
 * OPTIMIZAT: Folosește o singură funcție RPC pentru toate subcategoriile
 */
export function useMultipleSubcategoriesUnreadStatus(subcategoryIds: string[]) {
  const { forumUser } = useAuth();

  const { data: unreadMap, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: forumUser ? ['subcategories-read-status-batch', forumUser.id, subcategoryIds.sort().join(',')] : ['disabled'],
    queryFn: async () => {
      if (!forumUser || subcategoryIds.length === 0) return {};

      try {
        // Try batch RPC first (much faster)
        const { data, error } = await supabase.rpc('has_unread_topics_in_subcategories_batch', {
          p_user_id: forumUser.id,
          p_subcategory_ids: subcategoryIds,
        });

        if (!error && data) {
          // Transform array result to object for quick lookup
          return (data as Array<{ subcategory_id: string; has_unread: boolean }>).reduce(
            (acc, { subcategory_id, has_unread }) => {
              acc[subcategory_id] = has_unread;
              return acc;
            },
            {} as Record<string, boolean>
          );
        }

        // Fallback to individual calls if batch function doesn't exist yet
        console.warn('Batch RPC not available, falling back to individual calls');
        const promises = subcategoryIds.map(async (subcategoryId) => {
          const { data, error } = await supabase.rpc('has_unread_topics_in_subcategory', {
            p_user_id: forumUser.id,
            p_subcategory_id: subcategoryId,
          });

          if (error) {
            console.error(`Error checking unread for subcategory ${subcategoryId}:`, error);
            return { subcategoryId, hasUnread: false };
          }

          return { subcategoryId, hasUnread: data || false };
        });

        const results = await Promise.all(promises);

        // Transformă array-ul în obiect pentru lookup rapid
        return results.reduce((acc, { subcategoryId, hasUnread }) => {
          acc[subcategoryId] = hasUnread;
          return acc;
        }, {} as Record<string, boolean>);
      } catch (error) {
        console.error('Error in useMultipleSubcategoriesUnreadStatus:', error);
        return {};
      }
    },
    enabled: !!forumUser && subcategoryIds.length > 0,
    staleTime: 0, // 0 - forțează refetch pentru actualizări instant
    gcTime: 2 * 60 * 1000, // 2 minute
    refetchOnMount: true, // Forțează refetch când componenta se montează
  });

  return {
    unreadMap: unreadMap || {},
    isLoading,
    hasUnread: (subcategoryId: string) => unreadMap?.[subcategoryId] || false,
  };
}

/**
 * Hook pentru verificarea status-ului read/unread pentru multiple subforumuri (batch)
 * Util pentru liste de subforumuri
 */
export function useMultipleSubforumsUnreadStatus(subforumIds: string[]) {
  const { forumUser } = useAuth();

  const { data: unreadMap, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: forumUser ? ['subforums-read-status-batch', forumUser.id, subforumIds.sort().join(',')] : ['disabled'],
    queryFn: async () => {
      if (!forumUser || subforumIds.length === 0) return {};

      try {
        // Try batch RPC first
        const { data, error } = await supabase.rpc('has_unread_topics_in_subforums_batch', {
          p_user_id: forumUser.id,
          p_subforum_ids: subforumIds,
        });

        if (!error && data) {
          return (data as Array<{ subforum_id: string; has_unread: boolean }>).reduce(
            (acc, { subforum_id, has_unread }) => {
              acc[subforum_id] = has_unread;
              return acc;
            },
            {} as Record<string, boolean>
          );
        }

        // Fallback to individual calls
        console.warn('Batch RPC for subforums not available, falling back to individual calls');
        const promises = subforumIds.map(async (subforumId) => {
          try {
            const { data, error } = await supabase.rpc('has_unread_topics_in_subforum', {
              p_user_id: forumUser.id,
              p_subforum_id: subforumId,
            });

            if (error) {
              return { subforumId, hasUnread: false };
            }
            return { subforumId, hasUnread: data || false };
          } catch (e) {
            return { subforumId, hasUnread: false };
          }
        });

        const results = await Promise.all(promises);

        return results.reduce((acc, { subforumId, hasUnread }) => {
          acc[subforumId] = hasUnread;
          return acc;
        }, {} as Record<string, boolean>);
      } catch (error) {
        console.error('Error in useMultipleSubforumsUnreadStatus:', error);
        return {};
      }
    },
    enabled: !!forumUser && subforumIds.length > 0,
    staleTime: 0, // 0 - forțează refetch pentru actualizări instant
    gcTime: 2 * 60 * 1000,
    refetchOnMount: true, // Forțează refetch când componenta se montează
  });

  return {
    unreadMap: unreadMap || {},
    isLoading,
    hasUnread: (subforumId: string) => unreadMap?.[subforumId] || false,
  };
}
