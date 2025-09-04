import { supabase, Profile } from '@/lib/supabase';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class SupabaseApiService {
  async getProfile(userId: string): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Profile not found' };
      }

      return {
        success: true,
        data: {
          displayName: data.display_name || '',
          email: data.email,
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || '',
        }
      };
    } catch (error) {
      console.error('Error in getProfile:', error);
      return { success: false, error: 'Failed to fetch profile' };
    }
  }

  async updateProfile(userId: string, profileData: Profile): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: profileData.displayName,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          displayName: data.display_name || '',
          email: data.email,
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || '',
        }
      };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  async getFishingLocations() {
    try {
      const { data, error } = await supabase
        .from('fishing_locations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching fishing locations:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in getFishingLocations:', error);
      return { success: false, error: 'Failed to fetch fishing locations' };
    }
  }

  async getRecords(userId?: string) {
    try {
      let query = supabase
        .from('records')
        .select(`
          *,
          profiles!records_user_id_fkey(display_name, photo_url),
          fishing_locations!records_location_id_fkey(name, type, county)
        `)
        .order('date_caught', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching records:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in getRecords:', error);
      return { success: false, error: 'Failed to fetch records' };
    }
  }

  async createRecord(recordData: Record<string, unknown>) {
    try {
      const { data, error } = await supabase
        .from('records')
        .insert(recordData)
        .select()
        .single();

      if (error) {
        console.error('Error creating record:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in createRecord:', error);
      return { success: false, error: 'Failed to create record' };
    }
  }

  async updateRecord(recordId: string, updates: Record<string, unknown>) {
    try {
      const { data, error } = await supabase
        .from('records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating record:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in updateRecord:', error);
      return { success: false, error: 'Failed to update record' };
    }
  }
}

export const supabaseApi = new SupabaseApiService();
