// API service for Fish Trophy backend

// Add RequestInit type for fetch options
type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ProfileData {
  displayName: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FishingRecord {
  id: string;
  species: string;
  weight: number;
  location: string;
  date: string;
  angler: string;
  imageUrl?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Profile methods
  async updateProfile(userId: string, profileData: ProfileData): Promise<ApiResponse<ProfileData>> {
    return this.request<ProfileData>(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getProfile(userId: string): Promise<ApiResponse<ProfileData>> {
    return this.request<ProfileData>(`/users/${userId}/profile`);
  }

  async uploadProfileImage(userId: string, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    return this.request<{ imageUrl: string }>(`/users/${userId}/profile-image`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
      },
    });
  }

  // Records methods
  async getUserRecords(userId: string): Promise<ApiResponse<FishingRecord[]>> {
    return this.request<FishingRecord[]>(`/users/${userId}/records`);
  }

  async createRecord(recordData: FishingRecord): Promise<ApiResponse<FishingRecord>> {
    return this.request<FishingRecord>('/records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  }

  async updateRecord(recordId: string, recordData: Partial<FishingRecord>): Promise<ApiResponse<FishingRecord>> {
    return this.request<FishingRecord>(`/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(recordData),
    });
  }

  async deleteRecord(recordId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/records/${recordId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
