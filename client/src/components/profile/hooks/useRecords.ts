import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export const useRecords = (userId: string | undefined) => {
    const [records, setRecords] = useState<any[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const hasLoadedOnceRef = useRef(false);

    const loadUserRecords = useCallback(async () => {
        if (!userId) return;

        // Only show loading on first load
        if (!hasLoadedOnceRef.current) {
            setLoadingRecords(true);
        }
        try {
            const { data, error } = await supabase
                .from('records')
                .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county)
        `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
            hasLoadedOnceRef.current = true;
        } catch (error) {
            console.error('Error loading user records:', error);
        } finally {
            setLoadingRecords(false);
        }
    }, [userId]);

    return {
        records,
        loadingRecords,
        loadUserRecords
    };
};
