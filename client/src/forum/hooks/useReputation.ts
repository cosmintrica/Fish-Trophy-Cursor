import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export interface PostReputation {
  post_id: string;
  total_points: number;
  like_count: number;
  dislike_count: number;
  has_user_voted: boolean;
  user_vote: {
    points: number;
    comment: string | null;
    created_at: string;
  } | null;
}

export interface GiveReputationParams {
  post_id: string;
  receiver_user_id: string;
  points: 1 | -1; // +1 pentru like, -1 pentru dislike
  comment?: string;
}

export function useReputation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Obține reputația unui post
  const getPostReputation = useCallback(async (postId: string): Promise<PostReputation | null> => {
    try {
      const { data, error: fetchError } = await supabase.rpc('get_post_reputation', {
        p_post_id: postId
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return data as PostReputation;
    } catch (err) {
      console.error('Error fetching post reputation:', err);
      setError(err as Error);
      return null;
    }
  }, []);

  // Acordă reputație (like/dislike)
  const giveReputation = useCallback(async (params: GiveReputationParams): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('give_reputation', {
        p_post_id: params.post_id,
        p_receiver_user_id: params.receiver_user_id,
        p_points: params.points,
        p_comment: params.comment || null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Eroare necunoscută');
      }

      toast.success(data.message || 'Reputație acordată cu succes!');
      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Error giving reputation:', err);
      setError(err as Error);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Șterge reputația acordată
  const removeReputation = useCallback(async (postId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('remove_reputation', {
        p_post_id: postId
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Eroare necunoscută');
      }

      toast.success(data.message || 'Reputație ștearsă cu succes!');
      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Error removing reputation:', err);
      setError(err as Error);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getPostReputation,
    giveReputation,
    removeReputation,
    loading,
    error
  };
}
