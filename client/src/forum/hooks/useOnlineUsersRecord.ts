/**
 * Hook pentru obținerea recordului de utilizatori conectați simultan
 * Folosește Supabase Realtime pentru actualizări instantanee (fără timer-uri)
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-client';

export interface OnlineUsersRecord {
  max_users_count: number;
  record_date: string;
  record_time: string;
  formatted_date: string;
  formatted_time: string;
}

export function useOnlineUsersRecord() {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.onlineUsersRecord();

  const { data: record, error, isLoading, refetch } = useQuery<OnlineUsersRecord | null>({
    queryKey,
    queryFn: async () => {
      const { data, error: recordError } = await supabase.rpc('get_online_users_record');

      if (recordError) {
        console.error('Error fetching online users record:', recordError);
        throw new Error(recordError.message);
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as OnlineUsersRecord;
    },
    staleTime: 5 * 60 * 1000, // 5 minute - recordul nu se schimbă des
    gcTime: 10 * 60 * 1000, // 10 minute
    refetchOnWindowFocus: false,
  });

  // Supabase Realtime subscription pentru actualizări instantanee
  useEffect(() => {
    const channel = supabase
      .channel('forum_online_users_record_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'forum_online_users_record'
        },
        async (payload) => {
          // Când se schimbă recordul, refetch datele instant
          await refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    record,
    loading: isLoading,
    error: error as Error | null,
    refetch: () => refetch()
  };
}

