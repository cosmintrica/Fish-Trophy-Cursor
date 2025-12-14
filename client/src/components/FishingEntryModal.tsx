import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Scale, Ruler, Fish, Camera, Video, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase, getR2ImageUrlProxy, getNetlifyFunctionsBaseUrl } from '@/lib/supabase';
import { toast } from 'sonner';

// Types
type EntryType = 'record' | 'catch';
type Mode = 'add' | 'edit';

interface Species {
  id: string;
  name: string;
  scientific_name: string;
}

interface FishingLocation {
  id: string;
  name: string;
  type: string;
  county: string;
}

interface BaseEntry {
  id: string;
  species_id: string | null;
  location_id: string | null;
  weight: number | null;
  length_cm?: number | null; // catches use 'length_cm'
  length?: number | null; // records use 'length' (integer)
  captured_at?: string; // catches use 'captured_at' (timestamptz)
  date_caught?: string; // records use 'date_caught' (date)
  time_caught?: string; // records use 'time_caught' (time)
  notes?: string | null;
  image_url?: string | null; // records use 'image_url'
  photo_url?: string | null; // catches use 'photo_url'
  photo_urls?: string[] | null; // Internal form state - catches table uses 'photo_url' (singular)
  video_url?: string | null;
  is_public?: boolean; // only for catches
  global_id?: number | null;
  status?: string; // only for records
  fish_species?: {
    id: string;
    name: string;
    scientific_name?: string;
  };
  fishing_locations?: {
    id: string;
    name: string;
    type: string;
    county: string;
  };
}

interface FishingEntryModalProps {
  // Core props
  type: EntryType; // 'record' | 'catch'
  mode: Mode; // 'add' | 'edit'
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  
  // Entry data (for edit mode)
  entry?: BaseEntry | null;
  
  // Pre-filled location (for add mode from map)
  locationId?: string;
  locationName?: string;
  
  // Admin mode
  isAdmin?: boolean;
  
  // Delete handler (for edit mode)
  onDelete?: () => void;
}

const FishingEntryModal: React.FC<FishingEntryModalProps> = ({
  type,
  mode,
  isOpen,
  onClose,
  onSuccess,
  entry,
  locationId,
  locationName,
  isAdmin = false,
  onDelete
}) => {
  const { user } = useAuth();
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [species, setSpecies] = useState<Species[]>([]);
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');

  // State for limited display and search
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState(locationName || '');

  const [formData, setFormData] = useState({
    species_id: '',
    weight: '',
    length_cm: '',
    captured_at: new Date().toISOString().slice(0, 16),
    notes: '',
    photo_files: [] as File[],
    video_file: null as File | null,
    photo_urls: [] as string[],
    video_url: '',
    is_public: true, // only for catches
    global_id: null as number | null
  });

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ photos?: string[]; video?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Track files to be deleted from R2 (only delete when saving, not when canceling)
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  
  // Store original URLs for cancel restoration
  const [originalPhotoUrls, setOriginalPhotoUrls] = useState<string[]>([]);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string>('');

  // Determine field requirements based on type
  const isRecord = type === 'record';
  const isEdit = mode === 'edit';
  const photosRequired = isRecord; // Required for all records (add and edit)
  const videoRequired = isRecord; // Required for all records (add and edit)
  const speciesRequired = isRecord; // Required for records
  const weightRequired = isRecord; // Required for records
  const lengthRequired = isRecord; // Required for records
  const locationRequired = isRecord; // Required for records

  // Get title based on type and mode
  const getTitle = () => {
    if (isRecord) {
      return isEdit ? 'Editează Record' : 'Adaugă Record';
    } else {
      return isEdit ? 'Editează Captură' : 'Adaugă Captură';
    }
  };

  // Get submit button text
  const getSubmitText = () => {
    if (isUploading) return 'Se încarcă fișierele...';
    if (isSubmitting) return 'Se salvează...';
    return isEdit ? 'Salvează Modificările' : `Adaugă ${isRecord ? 'Record' : 'Captură'}`;
  };

  // Load username from profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.username) {
            setUserUsername(data.username);
          }
        });
    }
  }, [user?.id]);

  // Load species and locations
  useEffect(() => {
    if (isOpen) {
      loadSpecies();
      loadLocations();
    }
  }, [isOpen]);

  // Sync location props with state
  useEffect(() => {
    if (locationId && isOpen && mode === 'add') {
      setSelectedLocation(locationId);
      if (locationName) {
        setLocationSearchTerm(locationName);
      }
    }
  }, [locationId, locationName, isOpen, mode]);

  // Populate form when entry changes (edit mode)
  useEffect(() => {
    if (entry && isOpen && isEdit) {
      // Records use image_url, catches use photo_url
      const existingPhotoUrls = isRecord
        ? (entry.image_url ? [entry.image_url] : [])
        : (entry.photo_url ? [entry.photo_url] : []);
      
      // Store original URLs for cancel restoration
      setOriginalPhotoUrls(existingPhotoUrls);
      setOriginalVideoUrl(entry.video_url || '');
      
      // Fetch global_id if not in entry object
      const loadEntryId = async () => {
        const tableName = isRecord ? 'records' : 'catches';
        const { data } = await supabase
          .from(tableName)
          .select('global_id')
          .eq('id', entry.id)
          .single();
        
        // Records use date_caught (date) + time_caught (time), catches use captured_at (timestamptz)
        let capturedAt: string;
        if (isRecord) {
          // Combine date_caught + time_caught for records
          const dateStr = entry.date_caught || new Date().toISOString().split('T')[0];
          const timeStr = entry.time_caught || '00:00';
          capturedAt = `${dateStr}T${timeStr}`;
        } else {
          // Catches use captured_at directly
          capturedAt = entry.captured_at || new Date().toISOString().slice(0, 16);
        }
        
        // Records use 'length' (integer), catches use 'length_cm' (decimal)
        const lengthValue = isRecord ? entry.length : entry.length_cm;
        
        setFormData(prev => ({
          ...prev,
          species_id: entry.species_id || '',
          weight: entry.weight?.toString() || '',
          length_cm: lengthValue?.toString() || '',
          captured_at: capturedAt.slice(0, 16), // Ensure format is YYYY-MM-DDTHH:MM
          notes: entry.notes || '',
          photo_files: [],
          video_file: null,
          photo_urls: existingPhotoUrls,
          video_url: entry.video_url || '',
          is_public: entry.is_public ?? true,
          global_id: data?.global_id || entry.global_id || null
        }));
      };
      
      loadEntryId();
      setPreviewUrls({
        photos: existingPhotoUrls.map(url => getR2ImageUrlProxy(url)),
        video: entry.video_url ? getR2ImageUrlProxy(entry.video_url) : undefined
      });
      setSelectedLocation(entry.location_id || '');
      setSpeciesSearchTerm(entry.fish_species?.name || '');
      setLocationSearchTerm(entry.fishing_locations?.name || '');
      
      // Reset deletion tracking
      setPhotosToDelete([]);
      setVideoToDelete(null);
    } else if (!entry && isOpen && mode === 'add') {
      // Reset form for add mode
      setFormData({
        species_id: '',
        weight: '',
        length_cm: '',
        captured_at: new Date().toISOString().slice(0, 16),
        notes: '',
        photo_files: [],
        video_file: null,
        photo_urls: [],
        video_url: '',
        is_public: true,
        global_id: null
      });
      setPreviewUrls({});
      setSelectedLocation(locationId || '');
      setSpeciesSearchTerm('');
      setLocationSearchTerm(locationName || '');
      
      // Reset deletion tracking
      setPhotosToDelete([]);
      setVideoToDelete(null);
      setOriginalPhotoUrls([]);
      setOriginalVideoUrl('');
    }
  }, [entry, isOpen, isEdit, isRecord, locationId, locationName]);

  const loadSpecies = async () => {
    try {
      const { data, error } = await supabase
        .from('fish_species')
        .select('id, name, scientific_name')
        .order('name');

      if (error) throw error;
      setSpecies(data || []);
    } catch (error) {
      console.error('Error loading species:', error);
      setSpecies([]);
    }
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('fishing_locations')
        .select('id, name, type, county')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  // Helper function to remove diacritics for search
  const removeDiacritics = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/ș/g, 's')
      .replace(/ț/g, 't');
  };

  const getFilteredSpecies = () => {
    if (!speciesSearchTerm.trim()) return species.slice(0, showAllSpecies ? undefined : 10);
    const normalizedTerm = removeDiacritics(speciesSearchTerm.toLowerCase());
    return species.filter(s => {
      const normalizedName = removeDiacritics(s.name.toLowerCase());
      const normalizedScientific = s.scientific_name ? removeDiacritics(s.scientific_name.toLowerCase()) : '';
      return normalizedName.includes(normalizedTerm) || normalizedScientific.includes(normalizedTerm);
    });
  };

  const getFilteredLocations = () => {
    if (!locationSearchTerm.trim()) return locations.slice(0, showAllLocations ? undefined : 10);
    const normalizedTerm = removeDiacritics(locationSearchTerm.toLowerCase());
    return locations.filter(l => {
      const normalizedName = removeDiacritics(l.name.toLowerCase());
      const normalizedCounty = removeDiacritics(l.county.toLowerCase());
      const normalizedType = removeDiacritics(l.type.toLowerCase());
      return normalizedName.includes(normalizedTerm) || 
             normalizedCounty.includes(normalizedTerm) ||
             normalizedType.includes(normalizedTerm);
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (files: FileList | null, fileType: 'photo' | 'video') => {
    if (!files || files.length === 0) return;

    if (fileType === 'photo') {
      const newFiles = Array.from(files);
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        photo_files: [...prev.photo_files, ...newFiles]
      }));
      setPreviewUrls(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...newUrls]
      }));
    } else {
      const file = files[0];
      
      // Validare explicită pentru tipul de fișier video (inclusiv .mov de pe iPhone)
      // iPhone folosește video/quicktime pentru .mov
      const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/mov'];
      const validExtensions = ['.mp4', '.mov', '.avi', '.m4v'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidVideoType = file.type.startsWith('video/') || validVideoTypes.includes(file.type) || validExtensions.includes(fileExtension);
      
      if (!isValidVideoType) {
        toast.error('Tip de fișier nevalid. Acceptăm doar videouri: MP4, MOV, AVI');
        return;
      }
      
      // Validare pentru dimensiunea fișierului (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast.error('Fișierul este prea mare. Dimensiunea maximă este 100MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, video_file: file }));
      setPreviewUrls(prev => ({
        ...prev,
        video: URL.createObjectURL(file)
      }));
    }
  };

  // Helper function to delete file from R2
  const deleteFileFromR2 = async (fileUrl: string): Promise<void> => {
    try {
      let r2Url = fileUrl;
      if (fileUrl.includes('/.netlify/functions/r2-proxy')) {
        const urlParams = new URLSearchParams(fileUrl.split('?')[1]);
        r2Url = decodeURIComponent(urlParams.get('url') || fileUrl);
      }

      const baseUrl = getNetlifyFunctionsBaseUrl();
      const deleteEndpoint = baseUrl 
        ? `${baseUrl}/.netlify/functions/delete-r2-file`
        : '/.netlify/functions/delete-r2-file';

      const deleteResponse = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileUrl: r2Url })
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}));
        console.warn('Failed to delete file from R2:', errorData);
      } else {
        console.log('File deleted from R2 successfully:', r2Url);
      }
    } catch (error) {
      console.warn('Error deleting file from R2:', error);
    }
  };

  const removePhoto = (index: number) => {
    const isExistingPhoto = index < formData.photo_urls.length;
    
    if (isExistingPhoto) {
      // Mark existing photo for deletion (don't delete from R2 yet - only on save)
      const photoUrl = formData.photo_urls[index];
      if (photoUrl) {
        setPhotosToDelete(prev => [...prev, photoUrl]);
      }
    }

    setFormData(prev => {
      const newPhotos = [...prev.photo_urls];
      const newFiles = [...prev.photo_files];
      
      if (index < newPhotos.length) {
        newPhotos.splice(index, 1);
      } else {
        const fileIndex = index - newPhotos.length;
        if (newFiles[fileIndex]) {
          URL.revokeObjectURL(URL.createObjectURL(newFiles[fileIndex]));
        }
        newFiles.splice(fileIndex, 1);
      }
      
      return {
        ...prev,
        photo_urls: newPhotos,
        photo_files: newFiles
      };
    });

    setPreviewUrls(prev => {
      if (prev.photos) {
        URL.revokeObjectURL(prev.photos[index]);
        const newPreviewUrls = [...prev.photos];
        newPreviewUrls.splice(index, 1);
        return {
          ...prev,
          photos: newPreviewUrls
        };
      }
      return prev;
    });
  };

  const removeVideo = () => {
    if (formData.video_url && !formData.video_file) {
      // Mark existing video for deletion (don't delete from R2 yet - only on save)
      setVideoToDelete(formData.video_url);
    }

    if (formData.video_file && previewUrls.video) {
      URL.revokeObjectURL(previewUrls.video);
    }
    setFormData(prev => ({ ...prev, video_file: null, video_url: '' }));
    setPreviewUrls(prev => ({ ...prev, video: undefined }));
  };

  // Upload file to R2
  const uploadFileToR2 = async (file: File, fileType: 'photo' | 'video', entryId?: string): Promise<string> => {
    if (!user) {
      throw new Error('Trebuie să fii autentificat');
    }

    if (!userUsername) {
      throw new Error('Username-ul nu este disponibil. Te rog reîncarcă pagina.');
    }

    let finalEntryId = entryId;
    if (!finalEntryId && entry) {
      const tableName = isRecord ? 'records' : 'catches';
      const { data: entryData } = await supabase
        .from(tableName)
        .select('global_id')
        .eq('id', entry.id)
        .single();
      
      if (entryData?.global_id) {
        finalEntryId = `${isRecord ? 'record' : 'catch'}-${entryData.global_id}`;
      } else {
        throw new Error('ID-ul nu este disponibil');
      }
    }

    if (!finalEntryId && mode === 'add') {
      // For new entries, we'll use a temporary ID
      finalEntryId = `temp-${Date.now()}`;
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileExtension = sanitizedFileName.split('.').pop() || '';
    const baseFileName = sanitizedFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${finalEntryId}_${timestamp}_${baseFileName}.${fileExtension}`;
    
    const subCategory = fileType === 'photo' ? 'images' : 'videos';
    // Records use 'records' category, catches use 'journal' category
    const category = isRecord ? 'records' : 'journal';

    // Use presigned URL for large files (>10MB) or videos (especially .mov from iPhone)
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
    const isLargeFile = file.size > LARGE_FILE_THRESHOLD || fileType === 'video';
    const isMovFile = file.name.toLowerCase().endsWith('.mov') || file.type === 'video/quicktime';

    if (isLargeFile || isMovFile) {
      // Use presigned URL for direct upload to R2
      try {
        const baseUrl = getNetlifyFunctionsBaseUrl();
        const presignedUrlEndpoint = baseUrl
          ? `${baseUrl}/.netlify/functions/get-r2-presigned-url`
          : '/.netlify/functions/get-r2-presigned-url';

        // Get presigned URL
        const presignedResponse = await fetch(presignedUrlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileName,
            category,
            subCategory,
            username: userUsername,
            contentType: file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg')
          })
        });

        if (!presignedResponse.ok) {
          throw new Error(`Failed to get presigned URL: ${presignedResponse.status}`);
        }

        const presignedData = await presignedResponse.json();
        if (!presignedData.success || !presignedData.presignedUrl) {
          throw new Error(presignedData.error || 'Failed to get presigned URL');
        }

        // Upload directly to R2 using presigned URL
        const uploadResponse = await fetch(presignedData.presignedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg')
          },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload to R2: ${uploadResponse.status}`);
        }

        return presignedData.publicUrl;
      } catch (error: any) {
        console.error('Presigned URL upload failed, falling back to regular upload:', error);
        // Fall back to regular upload if presigned URL fails
      }
    }

    // Regular upload through Netlify Functions (for smaller files)
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    formDataObj.append('category', category);
    formDataObj.append('subCategory', subCategory);
    formDataObj.append('fileName', fileName);
    formDataObj.append('username', userUsername);

    const baseUrl = getNetlifyFunctionsBaseUrl();
    const uploadUrls = baseUrl
      ? [
          `${baseUrl}/.netlify/functions/upload`,
          '/.netlify/functions/upload'
        ]
      : ['/.netlify/functions/upload'];

    let lastError: Error | null = null;

    for (const uploadUrl of uploadUrls) {
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formDataObj
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`Upload failed: ${response.status} ${errorText}`);
          continue;
        }

        const result = await response.json();

        if (result.success && result.url) {
          return result.url;
        } else {
          lastError = new Error(result.error || 'Upload failed - no URL returned');
          continue;
        }
      } catch (error: any) {
        if (error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('Failed to fetch')) {
          lastError = new Error(
            'Funcțiile Netlify nu sunt disponibile. Te rog rulează `npm run dev` din root pentru a porni funcțiile Netlify local.'
          );
          continue;
        }
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error('Upload failed - all endpoints failed');
  };

  // Cleanup preview URLs when modal closes
  useEffect(() => {
    return () => {
      if (previewUrls.photos) {
        previewUrls.photos.forEach(url => URL.revokeObjectURL(url));
      }
      if (previewUrls.video) {
        URL.revokeObjectURL(previewUrls.video);
      }
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return;
    }

    if (isUploading) {
      toast.error('Te rugăm să aștepți finalizarea încărcării fișierelor');
      return;
    }

    // Validation based on type
    if (isRecord) {
      // Records require: species, weight, length, location, photos, video
      if (!formData.species_id || !formData.weight || !formData.length_cm || !selectedLocation) {
        toast.error('Completează toate câmpurile obligatorii');
        return;
      }

      if (formData.photo_files.length === 0 && formData.photo_urls.length === 0) {
        toast.error('Cel puțin o fotografie este obligatorie pentru record');
        return;
      }

      if (!formData.video_file && !formData.video_url) {
        toast.error('Videoclipul este obligatoriu pentru record');
        return;
      }
    }

    setIsSubmitting(true);
    setIsUploading(true);
    const toastId = toast.loading(isEdit ? 'Se actualizează...' : 'Se salvează...', { id: 'fishing-entry' });

    try {
      // Get username for file path
      if (!userUsername) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (!profile?.username) {
          throw new Error('Username-ul nu este disponibil');
        }
        setUserUsername(profile.username);
      }

      const username = userUsername || user.id;

      // Upload new photos
      const photoUrls: string[] = [...formData.photo_urls];
      for (const file of formData.photo_files) {
        const url = await uploadFileToR2(file, 'photo', entry?.id);
        photoUrls.push(url);
      }

      // Upload new video
      let videoUrl = formData.video_url;
      if (formData.video_file) {
        videoUrl = await uploadFileToR2(formData.video_file, 'video', entry?.id);
      }

      setIsUploading(false);

      // Delete files marked for deletion (only on save, not on cancel)
      // This happens AFTER upload but BEFORE database update
      if (photosToDelete.length > 0) {
        for (const photoUrl of photosToDelete) {
          await deleteFileFromR2(photoUrl).catch(err => {
            console.warn('Failed to delete photo from R2:', err);
          });
        }
      }
      
      if (videoToDelete) {
        await deleteFileFromR2(videoToDelete).catch(err => {
          console.warn('Failed to delete video from R2:', err);
        });
      }

      if (isRecord) {
          // Handle record submission/update
        if (isEdit && entry) {
          // Update record
          // Find species name from selected species_id
          const selectedSpecies = species.find(s => s.id === formData.species_id);
          const speciesName = selectedSpecies?.name || entry.fish_species?.name || 'Unknown';

          // Find location name from selected location_id
          const selectedLocationObj = locations.find(l => l.id === selectedLocation);
          const locationName = selectedLocationObj?.name || entry.fishing_locations?.name || 'Unknown';

          const updateData: any = {
            species_id: formData.species_id,
            species_name: speciesName, // Required field
            weight: parseFloat(formData.weight),
            length: formData.length_cm ? Math.round(parseFloat(formData.length_cm)) : null, // records use 'length' (integer)
            location_id: selectedLocation,
            location_name: locationName, // Optional but good to have
            date_caught: formData.captured_at.split('T')[0], // records use date_caught (date)
            time_caught: formData.captured_at.split('T')[1] || null, // records use time_caught (time)
            notes: formData.notes || null,
            image_url: photoUrls.length > 0 ? photoUrls[0] : null, // records use image_url, not photo_url
            video_url: videoUrl,
            updated_at: new Date().toISOString()
          };

          if (entry.status === 'rejected') {
            updateData.status = 'pending';
          }

          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            throw new Error('Utilizatorul nu este autentificat');
          }

          let query = supabase
            .from('records')
            .update(updateData)
            .eq('id', entry.id);

          if (!isAdmin) {
            query = query.eq('user_id', authUser.id);
          }

          const { data: updatedRecord, error: updateError } = await query.select().single();

          if (updateError) {
            throw new Error(updateError.message || 'Eroare la actualizarea recordului');
          }

          if (entry.status === 'rejected') {
            toast.success('Record actualizat și trimis din nou pentru aprobare!', { id: toastId });
          } else {
            toast.success('Record actualizat cu succes!', { id: toastId });
          }
        } else {
          // Create new record
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            throw new Error('Utilizatorul nu este autentificat');
          }

          // Find species name from selected species_id
          const selectedSpecies = species.find(s => s.id === formData.species_id);
          const speciesName = selectedSpecies?.name || 'Unknown';

          // Find location name from selected location_id
          const selectedLocationObj = locations.find(l => l.id === selectedLocation);
          const locationName = selectedLocationObj?.name || 'Unknown';

          const recordData = {
            user_id: authUser.id,
            species_id: formData.species_id,
            species_name: speciesName, // Required field
            weight: parseFloat(formData.weight),
            length: Math.round(parseFloat(formData.length_cm)),
            location_id: selectedLocation,
            location_name: locationName, // Optional but good to have
            date_caught: formData.captured_at.split('T')[0],
            time_caught: formData.captured_at.split('T')[1] || null,
            notes: formData.notes || null,
            image_url: photoUrls[0] || null, // records use image_url, not photo_url
            video_url: videoUrl,
            status: 'pending'
          };

          const { data: newRecord, error: insertError } = await supabase
            .from('records')
            .insert([recordData])
            .select()
            .single();

          if (insertError) {
            throw new Error(insertError.message || 'Eroare la crearea recordului');
          }

          toast.success('Record trimis cu succes! Va fi verificat de administratori.', { id: toastId });
        }
      } else {
        // Handle catch submission/update
        if (isEdit && entry) {
          // Update catch
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            throw new Error('Utilizatorul nu este autentificat');
          }

          const updateData: any = {
            species_id: formData.species_id || null,
            location_id: selectedLocation || null,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            length_cm: formData.length_cm ? parseFloat(formData.length_cm) : null,
            captured_at: formData.captured_at,
            notes: formData.notes || null,
            photo_url: photoUrls.length > 0 ? photoUrls[0] : null,
            video_url: videoUrl || null,
            is_public: formData.is_public,
            updated_at: new Date().toISOString()
          };

          const { error: updateError } = await supabase
            .from('catches')
            .update(updateData)
            .eq('id', entry.id)
            .eq('user_id', authUser.id);

          if (updateError) {
            throw new Error(updateError.message || 'Eroare la actualizarea capturii');
          }

          toast.success('Captură actualizată cu succes!', { id: toastId });
        } else {
          // Create new catch
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            throw new Error('Utilizatorul nu este autentificat');
          }

          const catchData = {
            user_id: authUser.id,
            species_id: formData.species_id || null,
            location_id: selectedLocation || null,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            length_cm: formData.length_cm ? parseFloat(formData.length_cm) : null,
            captured_at: formData.captured_at,
            notes: formData.notes || null,
            photo_url: photoUrls.length > 0 ? photoUrls[0] : null,
            video_url: videoUrl || null,
            is_public: formData.is_public
          };

          const { error: insertError } = await supabase
            .from('catches')
            .insert([catchData]);

          if (insertError) {
            throw new Error(insertError.message || 'Eroare la crearea capturii');
          }

          toast.success('Captură adăugată cu succes!', { id: toastId });
        }
      }

      // Cleanup preview URLs
      if (previewUrls.photos) {
        previewUrls.photos.forEach(url => URL.revokeObjectURL(url));
      }
      if (previewUrls.video) {
        URL.revokeObjectURL(previewUrls.video);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} ${type}:`, error);
      toast.error(error.message || `Eroare la ${isEdit ? 'actualizarea' : 'crearea'} ${isRecord ? 'recordului' : 'capturii'}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!entry || !onDelete) return;
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!entry || !onDelete) return;

    setShowDeleteConfirm(false);

    const toastId = toast.loading('Se șterge...', { id: 'delete-entry' });

    try {
      if (!user) {
        throw new Error('Trebuie să fii autentificat');
      }

      // Get file URLs before deletion for R2 cleanup
      let filesToDelete: string[] = [];
      
      if (isRecord) {
        // Records: image_url and video_url
        if (entry.image_url) {
          filesToDelete.push(entry.image_url);
        }
        if (entry.video_url) {
          filesToDelete.push(entry.video_url);
        }
      } else {
        // Catches: photo_url and video_url (photo_url is singular, not photo_urls)
        if (entry.photo_url) {
          filesToDelete.push(entry.photo_url);
        }
        if (entry.video_url) {
          filesToDelete.push(entry.video_url);
        }
      }

      // Delete files from R2 first
      if (filesToDelete.length > 0) {
        toast.loading(`Se șterg ${filesToDelete.length} fișier${filesToDelete.length > 1 ? 'e' : ''} din R2...`, { id: toastId });
        
        for (const fileUrl of filesToDelete) {
          await deleteFileFromR2(fileUrl).catch(err => {
            console.warn('Failed to delete file from R2:', fileUrl, err);
            // Continue even if R2 deletion fails
          });
        }
      }

      const tableName = isRecord ? 'records' : 'catches';
      
      // Delete from database
      toast.loading('Se șterge din baza de date...', { id: toastId });
      
      console.log('Deleting from database:', {
        tableName,
        entryId: entry.id,
        userId: user.id,
        entryUserId: (entry as any).user_id
      });
      
      // First, verify the entry exists and belongs to the user
      const { data: verifyData, error: verifyError } = await supabase
        .from(tableName)
        .select('id, user_id')
        .eq('id', entry.id)
        .eq('user_id', user.id)
        .single();

      if (verifyError || !verifyData) {
        console.error('Entry verification failed:', verifyError);
        throw new Error(verifyError?.message || 'Recordul nu a fost găsit sau nu îți aparține');
      }

      // Now delete
      const { data: deleteData, error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', entry.id)
        .eq('user_id', user.id)
        .select();

      console.log('Delete result:', { deleteData, deleteError });

      if (deleteError) {
        console.error('Delete error details:', deleteError);
        throw deleteError;
      }

      // Verify deletion was successful
      if (!deleteData || deleteData.length === 0) {
        console.warn('Delete returned no data - entry may not have been deleted');
        throw new Error('Recordul nu a putut fi șters. Verifică permisiunile.');
      }

      toast.success(`${isRecord ? 'Record' : 'Captură'} ștearsă cu succes!`, { id: toastId });
      onDelete();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(error.message || `Eroare la ștergerea ${isRecord ? 'recordului' : 'capturii'}`, { id: toastId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">{getTitle()}</CardTitle>
            <div className="flex items-center gap-2">
              {isEdit && onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-red-600 dark:text-red-400"
                  disabled={isSubmitting || isUploading}
                  title={`Șterge ${isRecord ? 'recordul' : 'captura'}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => {
                  // Reset deletion tracking when canceling (don't delete from R2)
                  setPhotosToDelete([]);
                  setVideoToDelete(null);
                  onClose();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-600 dark:text-slate-200"
                disabled={isSubmitting || isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Species and Location on same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Species Selection */}
              <div className="space-y-2">
                <Label htmlFor="species" className="text-sm font-medium text-gray-900 dark:text-white">
                  Specia {speciesRequired && <span className="text-red-500">*</span>}
                  {!speciesRequired && <span className="text-gray-500 dark:text-slate-400">(opțional)</span>}
                </Label>
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={formData.species_id ? "Specia selectată" : "Caută specia..."}
                      value={speciesSearchTerm}
                      onChange={(e) => setSpeciesSearchTerm(e.target.value)}
                      className={`w-full pr-10 ${formData.species_id ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'} text-gray-900 dark:text-white`}
                      required={speciesRequired}
                    />
                    {formData.species_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, species_id: '' }));
                          setSpeciesSearchTerm('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Șterge
                      </button>
                    )}
                  </div>

                  {speciesSearchTerm.trim() && !formData.species_id && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg absolute z-50 w-full bg-white dark:bg-slate-800 shadow-lg">
                      {getFilteredSpecies().length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                          <div className="text-sm">Nu s-au găsit specii pentru "{speciesSearchTerm}"</div>
                        </div>
                      ) : (
                        getFilteredSpecies().map((s) => (
                          <div
                            key={s.id}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-600 last:border-b-0"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, species_id: s.id }));
                              setSpeciesSearchTerm(s.name);
                            }}
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                            {s.scientific_name && (
                              <div className="text-sm text-gray-500 dark:text-slate-400 italic">{s.scientific_name}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium text-gray-900 dark:text-white">
                  Locația de pescuit {locationRequired && <span className="text-red-500">*</span>}
                  {!locationRequired && <span className="text-gray-500 dark:text-slate-400">(opțional)</span>}
                </Label>
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={selectedLocation ? "Locația selectată" : "Caută locația..."}
                      value={locationSearchTerm}
                      onChange={(e) => setLocationSearchTerm(e.target.value)}
                      className={`w-full pr-10 ${selectedLocation ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'} text-gray-900 dark:text-white`}
                      required={locationRequired}
                    />
                    {selectedLocation && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocation('');
                          setLocationSearchTerm('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Șterge
                      </button>
                    )}
                  </div>

                  {locationSearchTerm.trim() && !selectedLocation && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg absolute z-50 w-full bg-white dark:bg-slate-800 shadow-lg">
                      {getFilteredLocations().length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                          <div className="text-sm">Nu s-au găsit locații pentru "{locationSearchTerm}"</div>
                        </div>
                      ) : (
                        getFilteredLocations().map((l) => (
                          <div
                            key={l.id}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-600 last:border-b-0"
                            onClick={() => {
                              setSelectedLocation(l.id);
                              setLocationSearchTerm(l.name);
                            }}
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{l.name.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400 capitalize">
                              {l.type.replace(/_/g, ' ')} • {l.county}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date and Weight/Length - Full width on same row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="captured_at" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data și ora capturării <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="captured_at"
                  type="datetime-local"
                  value={formData.captured_at}
                  onChange={(e) => handleInputChange('captured_at', e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-medium flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Greutatea (kg) {weightRequired && <span className="text-red-500">*</span>}
                  {!weightRequired && <span className="text-gray-500 dark:text-slate-400">(opțional)</span>}
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="ex: 2.5"
                  className="w-full"
                  required={weightRequired}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="length_cm" className="text-sm font-medium flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Lungimea (cm) {lengthRequired && <span className="text-red-500">*</span>}
                  {!lengthRequired && <span className="text-gray-500 dark:text-slate-400">(opțional)</span>}
                </Label>
                <Input
                  id="length_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.length_cm}
                  onChange={(e) => handleInputChange('length_cm', e.target.value)}
                  placeholder="ex: 45.2"
                  className="w-full"
                  required={lengthRequired}
                />
              </div>
            </div>

            {/* Photos and Video */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="photos" className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-200">
                    <Camera className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    Fotografii {photosRequired && <span className="text-red-500">*</span>}
                    {!photosRequired && <span className="text-gray-500 dark:text-slate-400">(opțional)</span>}
                  </Label>
                  <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 text-center hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-200 group">
                    <input
                      type="file"
                      id="photos"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleFileSelect(e.target.files, 'photo');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <label htmlFor="photos" className="cursor-pointer block">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 flex items-center justify-center transition-colors">
                        <Camera className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Adaugă fotografii</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">JPG, PNG până la 10MB</p>
                    </label>
                  </div>

                  {/* Photo Previews */}
                  {(formData.photo_urls.length > 0 || formData.photo_files.length > 0) && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {previewUrls.photos?.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-slate-600">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <Label htmlFor="video" className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-slate-200">
                    <Video className="w-4 h-4 text-green-500 dark:text-green-400" />
                    Videoclip {videoRequired && <span className="text-red-500">*</span>}
                    {!videoRequired && <span className="text-gray-500 dark:text-slate-400">(opțional)</span>}
                  </Label>
                  <div className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl p-4 text-center hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50/30 dark:hover:bg-green-900/20 transition-all duration-200 group">
                    <input
                      type="file"
                      id="video"
                      accept="video/*,.mov,.mp4,.avi,.m4v"
                      onChange={(e) => {
                        handleFileSelect(e.target.files, 'video');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <label htmlFor="video" className="cursor-pointer block">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 flex items-center justify-center transition-colors">
                        <Video className="w-6 h-6 text-green-500 dark:text-green-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400">Selectează videoclip</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">MP4, MOV, AVI până la 100MB</p>
                      {(formData.video_file || formData.video_url) && (
                        <div className="mt-3">
                          {previewUrls.video && (
                            <video
                              src={previewUrls.video}
                              controls
                              className="w-full max-w-xs h-48 object-contain rounded mx-auto bg-black"
                              preload="metadata"
                            />
                          )}
                        </div>
                      )}
                    </label>
                    {(formData.video_file || formData.video_url) && (
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="mt-2 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        Șterge videoclip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                <FileText className="w-4 h-4" />
                Note suplimentare
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Detalii despre captură, tehnica folosită, vremea, etc."
                rows={3}
                className="w-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-50 placeholder-gray-500 dark:placeholder-slate-400"
              />
            </div>

            {/* Privacy (only for catches) */}
            {!isRecord && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Captură publică (vizibilă pentru toți)</Label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-600 dark:text-slate-200">{formData.is_public ? 'Public' : 'Privat'}</span>
                    <div
                      onClick={() => handleInputChange('is_public', !formData.is_public)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.is_public ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-200 transition-transform ${
                          formData.is_public ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {(isSubmitting || isUploading) ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    {getSubmitText()}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {getSubmitText()}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Reset deletion tracking when canceling (don't delete from R2)
                  // The form will be reset when modal reopens via useEffect
                  setPhotosToDelete([]);
                  setVideoToDelete(null);
                  onClose();
                }}
                disabled={isSubmitting || isUploading}
                className="px-6 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Anulează
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              maxWidth: '450px',
              width: '100%',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle style={{ color: '#dc2626', width: '1.5rem', height: '1.5rem' }} />
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Șterge {isRecord ? 'recordul' : 'captura'}
              </h3>
            </div>

            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              Ești sigur că vrei să ștergi această {isRecord ? 'record' : 'captură'}? Această acțiune nu poate fi anulată.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting || isUploading}
                className="px-6"
              >
                Anulează
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting || isUploading}
                className="px-6 bg-red-600 hover:bg-red-700 text-white"
              >
                {(isSubmitting || isUploading) ? 'Se șterge...' : 'Șterge'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishingEntryModal;

