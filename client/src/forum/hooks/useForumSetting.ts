import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getForumSetting, setForumSetting } from '../../services/forum/categories';

/**
 * Hook to get a global forum setting (boolean)
 * Uses React Query for caching and real-time updates
 */
export function useForumSetting(key: 'show_category_icons' | 'show_subcategory_icons' | 'show_subforum_icons', defaultValue: boolean = true) {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['forum-setting', key],
        queryFn: async () => {
            const result = await getForumSetting(key);
            if (result.error) throw new Error(result.error.message);
            // If data is null (setting doesn't exist), return "true" (as string) to match default behavior or defaultValue
            return result.data;
        },
        staleTime: 0, // Always fresh - settings can change and need immediate updates
        refetchOnMount: true, // Refetch when component mounts (ensures fresh data)
        refetchOnWindowFocus: false, // Don't refetch on window focus (not needed for settings)
    });

    // Helper to determine actual boolean value
    // If loading, use defaultValue
    // If data is 'true', true. If 'false', false. If null, defaultValue.
    const isEnabled = isLoading
        ? defaultValue
        : (data !== null ? data === 'true' : defaultValue);

    /**
     * Mutation to update the setting
     */
    const mutation = useMutation({
        mutationFn: async (newValue: boolean) => {
            const result = await setForumSetting(key, newValue.toString());
            if (result.error) throw new Error(result.error.message);
            return result;
        },
        onSuccess: (_, newValue) => {
            // Invalidate the specific setting
            queryClient.invalidateQueries({ queryKey: ['forum-setting', key] });

            // Also invalidate categories to ensure any derived data is refreshed
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['subcategory-or-subforum'] });
        }
    });

    return {
        value: isEnabled,
        isLoading,
        error,
        update: mutation.mutateAsync,
        isUpdating: mutation.isPending
    };
}
