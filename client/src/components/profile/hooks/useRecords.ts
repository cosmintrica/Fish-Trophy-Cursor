/**
 * User Records Hook
 * Manages user records data using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useRecords = (userId: string | undefined) => {
    const queryKey = userId ? ['records', userId] : null

    const { data: records = [], isLoading: loadingRecords, refetch: loadUserRecords } = useQuery({
        queryKey: queryKey || ['records', 'disabled'],
        queryFn: async () => {
            if (!userId) {
                throw new Error('User ID is required')
            }
            const { data, error } = await supabase
                .from('records')
                .select(`
                    *,
                    fish_species:species_id(name, scientific_name),
                    fishing_locations:location_id(name, type, county),
                    profiles!records_user_id_fkey(id, display_name, username, photo_url)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: !!queryKey, // Nu rulează query-ul dacă nu avem userId
        staleTime: 1 * 60 * 1000, // 1 minut - records se schimbă mai des
        gcTime: 3 * 60 * 1000, // 3 minute
        refetchOnWindowFocus: false, // Dezactivat pentru performanță
    })

    return {
        records,
        loadingRecords,
        loadUserRecords: () => loadUserRecords()
    }
}
