import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { supabaseApi } from '@/services/supabase-api';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-client';

interface ProfileData {
    displayName: string;
    email: string;
    username: string;
    phone: string;
    bio: string;
    website: string;
    youtube_channel: string;
    show_gear_publicly: boolean;
    show_county_publicly?: boolean;
    show_city_publicly?: boolean;
    show_website_publicly?: boolean;
    show_youtube_publicly?: boolean;
    cover_photo_url?: string;
    county_id?: string;
    city_id?: string;
}

export const useProfileData = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    // Load counties
    const { data: counties = [] } = useQuery({
        queryKey: queryKeys.counties(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('counties')
                .select('id, name')
                .order('name');

            if (error) {
                console.error('Error loading counties:', error);
                return [];
            }

            return data || [];
        },
        staleTime: 10 * 60 * 1000, // 10 minute - counties nu se schimbă des
    });

    // Load cities for a county
    const loadCities = async (countyId: string) => {
        if (!countyId) return [];

        const { data, error } = await supabase
            .from('cities')
            .select('id, name')
            .eq('county_id', countyId)
            .order('name');

        if (error) {
            console.error('Error loading cities:', error);
            return [];
        }

        return data || [];
    };

    // Load profile
    const { data: profileData, isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: queryKeys.profile(userId || ''),
        queryFn: async (): Promise<ProfileData | null> => {
            if (!userId) return null;

            try {
                // Try to load from profiles table using supabaseApi
                const result = await supabaseApi.getProfile(userId);

                if (result.success && result.data) {
                    return {
                        displayName: result.data.displayName || '',
                        email: result.data.email || '',
                        username: result.data.username || '',
                        phone: result.data.phone || '',
                        bio: result.data.bio || 'Pescar pasionat din România!',
                        website: result.data.website || '',
                        youtube_channel: result.data.youtube_channel || '',
                        show_gear_publicly: result.data.show_gear_publicly || false,
                        show_county_publicly: result.data.show_county_publicly || false,
                        show_city_publicly: result.data.show_city_publicly || false,
                        show_website_publicly: result.data.show_website_publicly || false,
                        show_youtube_publicly: result.data.show_youtube_publicly || false,
                        cover_photo_url: '',
                        county_id: result.data.county_id,
                        city_id: result.data.city_id,
                    };
                } else {
                    // Fallback: try direct query
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (!error && data) {
                        return {
                            displayName: data.display_name || '',
                            email: data.email || '',
                            username: data.username || '',
                            phone: data.phone || '',
                            bio: data.bio || 'Pescar pasionat din România!',
                            website: data.website || '',
                            youtube_channel: data.youtube_channel || '',
                            show_gear_publicly: data.show_gear_publicly || false,
                            show_county_publicly: data.show_county_publicly || false,
                            show_city_publicly: data.show_city_publicly || false,
                            show_website_publicly: data.show_website_publicly || false,
                            show_youtube_publicly: data.show_youtube_publicly || false,
                            cover_photo_url: data.cover_photo_url || '',
                            county_id: data.county_id,
                            city_id: data.city_id,
                        };
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            }

            return null;
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000, // 2 minute
    });

    // Load cities for selected county
    const selectedCounty = profileData?.county_id || '';
    const { data: cities = [] } = useQuery({
        queryKey: queryKeys.cities(selectedCounty),
        queryFn: () => loadCities(selectedCounty),
        enabled: !!selectedCounty,
        staleTime: 10 * 60 * 1000, // 10 minute - cities nu se schimbă des
    });

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data: {
            profileData: ProfileData;
            selectedCounty: string;
            selectedCity: string;
        }) => {
            if (!userId) {
                throw new Error('Utilizatorul nu este autentificat');
            }

            // Update Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    display_name: data.profileData.displayName,
                    phone: data.profileData.phone,
                    bio: data.profileData.bio
                }
            });

            if (authError) {
                throw new Error('Eroare la actualizarea profilului: ' + authError.message);
            }

            // Update profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    display_name: data.profileData.displayName,
                    phone: data.profileData.phone,
                    county_id: data.selectedCounty || null,
                    city_id: data.selectedCity || null,
                    bio: data.profileData.bio,
                    website: data.profileData.website,
                    youtube_channel: data.profileData.youtube_channel,
                    show_gear_publicly: data.profileData.show_gear_publicly,
                    show_county_publicly: data.profileData.show_county_publicly || false,
                    show_city_publicly: data.profileData.show_city_publicly || false,
                    show_website_publicly: data.profileData.show_website_publicly || false,
                    show_youtube_publicly: data.profileData.show_youtube_publicly || false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                throw new Error('Eroare la actualizarea bazei de date: ' + updateError.message);
            }

            return true;
        },
        onSuccess: () => {
            // Invalidate profile query to refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId || '') });
            toast.success('Profilul a fost actualizat cu succes!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Wrapper function for updateProfile to maintain compatibility
    const updateProfile = async (
        profileDataToUpdate: ProfileData,
        selectedCounty: string,
        selectedCity: string
    ) => {
        toast.loading('Se actualizează profilul...', { id: 'profile-update' });
        
        try {
            await updateProfileMutation.mutateAsync({
                profileData: profileDataToUpdate,
                selectedCounty,
                selectedCity,
            });
            return true;
        } catch (error) {
            return false;
        }
    };

    return {
        profileData: profileData || {
            displayName: '',
            email: '',
            username: '',
            phone: '',
            bio: 'Pescar pasionat din România!',
            website: '',
            youtube_channel: '',
            show_gear_publicly: false,
            show_county_publicly: false,
            show_city_publicly: false,
            show_website_publicly: false,
            show_youtube_publicly: false,
            cover_photo_url: ''
        },
        setProfileData: (data: ProfileData | ((prev: ProfileData) => ProfileData)) => {
            // This is a no-op for React Query - use updateProfileMutation instead
            // But we allow it for local state updates that will be saved later
            console.warn('setProfileData is deprecated - use updateProfileMutation instead');
        },
        selectedCounty: profileData?.county_id || '',
        setSelectedCounty: () => {
            // This is a no-op for React Query - county is part of profileData
            console.warn('setSelectedCounty is deprecated - county is part of profileData');
        },
        selectedCity: profileData?.city_id || '',
        setSelectedCity: () => {
            // This is a no-op for React Query - city is part of profileData
            console.warn('setSelectedCity is deprecated - city is part of profileData');
        },
        counties: counties as { id: string; name: string }[],
        cities: cities as { id: string; name: string }[],
        isUpdatingProfile: updateProfileMutation.isPending,
        isLoadingProfile,
        loadCounties: () => {
            // This is a no-op for React Query - counties are loaded automatically
            console.warn('loadCounties is deprecated - counties are loaded automatically');
        },
        loadCities: () => {
            // This is a no-op for React Query - cities are loaded automatically
            console.warn('loadCities is deprecated - cities are loaded automatically');
        },
        loadProfile: refetchProfile,
        updateProfile,
    };
};
