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

                    // 6. Granular Cache Patching for forum-context (Avoids Flickering)
                    queryClient.setQueriesData({ queryKey: ['forum-context'] }, (oldData: any) => {
                        if (!oldData) return oldData;

                        // Case A: Current Entity is the topic being updated
                        if (oldData.type === 'topic' && oldData.entity?.id === newPost.topic_id) {
                            return {
                                ...oldData,
                                entity: {
                                    ...oldData.entity,
                                    stats: {
                                        ...oldData.entity.stats,
                                        reply_count: (oldData.entity.stats.reply_count || 0) + 1,
                                        last_post_at: newPost.created_at
                                    }
                                }
                            };
                        }

                        // Case B: Current Page is a container and one of its children was updated
                        if (oldData.hierarchy?.children) {
                            const updatedChildren = oldData.hierarchy.children.map((child: any) => {
                                if (child.id === newPost.subcategory_id || child.id === newPost.subforum_id) {
                                    return {
                                        ...child,
                                        stats: {
                                            ...(child.stats || {}),
                                            total_posts: ((child.stats?.total_posts || 0) + 1),
                                            last_post_at: newPost.created_at,
                                            last_post_author: newPost.author_username
                                        }
                                    };
                                }
                                return child;
                            });

                            return {
                                ...oldData,
                                hierarchy: {
                                    ...oldData.hierarchy,
                                    children: updatedChildren
                                }
                            };
                        }

                        return oldData;
                    });

                    // 7. Invalidate specific topic cache if we are inside it
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
                    const newTopic = payload.new as any;
                    queryClient.invalidateQueries({ queryKey: ['topics'] });
                    queryClient.invalidateQueries({ queryKey: ['forum-stats'] });
                    queryClient.invalidateQueries({ queryKey: queryKeys.categories() });

                    // Patch forum-context for child counts
                    queryClient.setQueriesData({ queryKey: ['forum-context'] }, (oldData: any) => {
                        if (!oldData || !oldData.hierarchy?.children) return oldData;

                        const updatedChildren = oldData.hierarchy.children.map((child: any) => {
                            if (child.id === newTopic.subcategory_id || child.id === newTopic.subforum_id) {
                                return {
                                    ...child,
                                    stats: {
                                        ...(child.stats || {}),
                                        total_topics: ((child.stats?.total_topics || 0) + 1),
                                        last_post_at: newTopic.created_at,
                                        last_post_author: newTopic.author_username
                                    }
                                };
                            }
                            return child;
                        });

                        return {
                            ...oldData,
                            hierarchy: {
                                ...oldData.hierarchy,
                                children: updatedChildren
                            }
                        };
                    });
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
