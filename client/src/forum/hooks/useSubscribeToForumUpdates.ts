import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../../lib/query-client';

export function useSubscribeToForumUpdates() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('forum-global-updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'forum_posts'
                },
                (payload) => {
                    const newPost = payload.new as any;

                    // 1. Invalidate Topics Lists (to show new last post)
                    queryClient.invalidateQueries({ queryKey: ['topics'] });

                    // 2. Invalidate Subforums List (to show updated stats)
                    queryClient.invalidateQueries({ queryKey: ['subforum'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums'] });
                    queryClient.invalidateQueries({ queryKey: queryKeys.categories() }); // Update Homepage Hierarchy

                    // 3. Invalidate Subcategories List
                    queryClient.invalidateQueries({ queryKey: ['subcategory'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategories'] });

                    // 4. Invalidate Unread Status checks (Comprehensive)
                    queryClient.invalidateQueries({ queryKey: ['topic-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['topics-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategory-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategories-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-unread-status'] }); // Legacy support

                    // 5. Invalidate Stats
                    queryClient.invalidateQueries({ queryKey: ['forum-stats'] });

                    // 6. Invalidate specific topic cache if we are inside it
                    if (newPost.topic_id) {
                        queryClient.invalidateQueries({ queryKey: ['topic', newPost.topic_id] });
                        queryClient.invalidateQueries({ queryKey: ['posts', newPost.topic_id] });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'forum_topics'
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['topics'] });
                    queryClient.invalidateQueries({ queryKey: ['forum-stats'] });
                    queryClient.invalidateQueries({ queryKey: queryKeys.categories() }); // Update Homepage Hierarchy
                    queryClient.invalidateQueries({ queryKey: ['subcategories-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-read-status-batch'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'forum_topic_reads'
                },
                (payload) => {
                    // Invalidează cache-ul pentru toate query-urile de read status
                    queryClient.invalidateQueries({ queryKey: ['topic-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['topics-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategory-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategories-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-read-status-batch'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'forum_topic_reads'
                },
                (payload) => {
                    // Invalidează cache-ul pentru toate query-urile de read status
                    queryClient.invalidateQueries({ queryKey: ['topic-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['topics-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategory-read-status'] });
                    queryClient.invalidateQueries({ queryKey: ['subcategories-read-status-batch'] });
                    queryClient.invalidateQueries({ queryKey: ['subforums-read-status-batch'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}
