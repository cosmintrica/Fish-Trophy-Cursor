import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook pentru gestionarea actualizărilor realtime în forum
 * Ascultă evenimente globale (postări noi, topicuri noi) și invalidează cache-ul
 */
export function useForumRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // console.log('[ForumRealtime] Initializing global forum subscriptions');

        const channel = supabase.channel('forum-global-changes')
            // Ascultă postări noi pentru a actualiza statusul read/unread
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'forum_posts'
                },
                async (payload) => {
                    // console.log('[ForumRealtime] New post detected:', payload);
                    const newPost = payload.new as any;
                    const topicId = newPost.topic_id;

                    // 1. Invalidează topic-ul specific (pentru a arăta postul nou dacă suntem pe pagină)
                    queryClient.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
                    queryClient.invalidateQueries({ queryKey: queryKeys.posts(topicId) });

                    // 2. Invalidează statusul de citire al topicului
                    queryClient.invalidateQueries({ queryKey: ['topic-read-status'] });

                    // 3. Invalidează listele de topicuri (pentru a actualiza last_post_at și read status)
                    queryClient.invalidateQueries({ queryKey: ['topics'] });
                    queryClient.invalidateQueries({ queryKey: ['topics-read-status-batch'] });

                    // 4. Invalidează analiticele/statistici
                    queryClient.invalidateQueries({ queryKey: ['forum-stats'] });

                    // 5. Invalidează subcategoriile (pentru indicatorul de unread de pe homepage)
                    queryClient.invalidateQueries({ queryKey: ['subcategory-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategories-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-read-status-batch'] });
                }
            )
            // Ascultă topicuri noi
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'forum_topics'
                },
                (payload) => {
                    // console.log('[ForumRealtime] New topic detected:', payload);
                    // Actualizează listele de topicuri și categorii
                    queryClient.invalidateQueries({ queryKey: ['topics'] });
                    queryClient.invalidateQueries({ queryKey: ['forum-stats'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategories-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-read-status-batch'] });
                }
            )
            .subscribe((status) => {
                // console.log('[ForumRealtime] Subscription status:', status);
            });

        return () => {
            // console.log('[ForumRealtime] Cleaning up subscriptions');
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}
