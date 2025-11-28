import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseApi } from '@/services/supabase-api';
import { toast } from 'sonner';

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
    avatar_url?: string;
    cover_photo_url?: string;
}

export const useProfileData = (userId: string | undefined) => {
    const [profileData, setProfileData] = useState<ProfileData>({
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
        avatar_url: '',
        cover_photo_url: ''
    });
    const [selectedCounty, setSelectedCounty] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [counties, setCounties] = useState<{ id: string; name: string }[]>([]);
    const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const loadCounties = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('counties')
                .select('id, name')
                .order('name');

            if (error) {
                console.error('Error loading counties:', error);
                return;
            }

            setCounties(data || []);
        } catch (error) {
            console.error('Error loading counties:', error);
        }
    }, []);

    const loadCities = useCallback(async (countyId: string) => {
        if (!countyId) {
            setCities([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('cities')
                .select('id, name')
                .eq('county_id', countyId)
                .order('name');

            if (error) {
                console.error('Error loading cities:', error);
                return;
            }

            setCities(data || []);
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    }, []);

    const loadProfile = useCallback(async () => {
        if (!userId) return;

        setIsLoadingProfile(true);
        try {
            // Try to load from profiles table using supabaseApi
            const result = await supabaseApi.getProfile(userId);

            if (result.success && result.data) {
                setProfileData({
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
                    avatar_url: '',
                    cover_photo_url: ''
                });

                if (result.data.county_id) {
                    setSelectedCounty(result.data.county_id);
                    loadCities(result.data.county_id);
                }
                if (result.data.city_id) {
                    setSelectedCity(result.data.city_id);
                }
            } else {
                // Fallback: try direct query
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (!error && data) {
                    setProfileData({
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
                        avatar_url: data.avatar_url || '',
                        cover_photo_url: data.cover_photo_url || ''
                    });

                    if (data.county_id) {
                        setSelectedCounty(data.county_id);
                        loadCities(data.county_id);
                    }
                    if (data.city_id) {
                        setSelectedCity(data.city_id);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Fallback to user metadata if DB fetch fails (handled in component)
        } finally {
            setIsLoadingProfile(false);
        }
    }, [userId, loadCities]);

    const updateProfile = async () => {
        if (!userId) {
            toast.error('Utilizatorul nu este autentificat');
            return false;
        }

        setIsUpdatingProfile(true);
        toast.loading('Se actualizează profilul...', { id: 'profile-update' });

        try {
            // Update Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    display_name: profileData.displayName,
                    phone: profileData.phone,
                    bio: profileData.bio
                }
            });

            if (authError) {
                toast.error('Eroare la actualizarea profilului: ' + authError.message, { id: 'profile-update' });
                return false;
            }

            // Update profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    display_name: profileData.displayName,
                    phone: profileData.phone,
                    county_id: selectedCounty || null,
                    city_id: selectedCity || null,
                    bio: profileData.bio,
                    website: profileData.website,
                    youtube_channel: profileData.youtube_channel,
                    show_gear_publicly: profileData.show_gear_publicly,
                    show_county_publicly: profileData.show_county_publicly || false,
                    show_city_publicly: profileData.show_city_publicly || false,
                    show_website_publicly: profileData.show_website_publicly || false,
                    show_youtube_publicly: profileData.show_youtube_publicly || false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                console.error('Update error:', updateError);
                toast.error('Eroare la actualizarea bazei de date: ' + updateError.message, { id: 'profile-update' });
                return false;
            }

            toast.success('Profilul a fost actualizat cu succes!', { id: 'profile-update' });
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('A apărut o eroare la actualizarea profilului', { id: 'profile-update' });
            return false;
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    return {
        profileData,
        setProfileData,
        selectedCounty,
        setSelectedCounty,
        selectedCity,
        setSelectedCity,
        counties,
        cities,
        isUpdatingProfile,
        isLoadingProfile,
        loadCounties,
        loadCities,
        loadProfile,
        updateProfile
    };
};
