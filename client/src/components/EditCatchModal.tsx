import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Scale, Ruler, Fish, Camera, Video, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { toast } from 'sonner';

interface Catch {
  id: string;
  user_id: string;
  species_id: string | null;
  location_id: string | null;
  weight: number | null;
  length_cm: number | null;
  captured_at: string;
  notes: string | null;
  photo_url: string | null;
  video_url: string | null;
  is_public: boolean;
  global_id: number | null;
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

interface EditCatchModalProps {
  catchItem: Catch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: () => void;
}

const EditCatchModal: React.FC<EditCatchModalProps> = ({
  catchItem,
  isOpen,
  onClose,
  onSuccess,
  onDelete
}) => {
  const { user } = useAuth();
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [species, setSpecies] = useState<Species[]>([]);
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  // State for limited display and search
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');

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
    is_public: true,
    global_id: null as number | null
  });

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ photos?: string[]; video?: string }>({});

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

  // Populate form when catch changes
  useEffect(() => {
    if (catchItem && isOpen) {
      const existingPhotoUrls = catchItem.photo_url ? [catchItem.photo_url] : [];
      // Fetch global_id if not in catch object
      const loadCatchId = async () => {
        const { data } = await supabase
          .from('catches')
          .select('global_id')
          .eq('id', catchItem.id)
          .single();
        
        setFormData(prev => ({
          ...prev,
          species_id: catchItem.species_id || '',
          weight: catchItem.weight?.toString() || '',
          length_cm: catchItem.length_cm?.toString() || '',
          captured_at: catchItem.captured_at ? new Date(catchItem.captured_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          notes: catchItem.notes || '',
          photo_files: [],
          video_file: null,
          photo_urls: existingPhotoUrls,
          video_url: catchItem.video_url || '',
          is_public: catchItem.is_public,
          global_id: data?.global_id || (catchItem as any).global_id || null
        }));
      };
      
      loadCatchId();
      setSelectedLocation(catchItem.location_id || '');
      setSpeciesSearchTerm(catchItem.fish_species?.name || '');
      setLocationSearchTerm(catchItem.fishing_locations?.name || '');

      // Set preview URLs for existing files
      setPreviewUrls({
        photos: existingPhotoUrls.map(url => getR2ImageUrlProxy(url)),
        video: catchItem.video_url ? getR2ImageUrlProxy(catchItem.video_url) : undefined
      });
    }
  }, [catchItem, isOpen]);

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

  const getFilteredSpecies = () => {
    if (!speciesSearchTerm.trim()) return species.slice(0, showAllSpecies ? undefined : 10);
    const term = speciesSearchTerm.toLowerCase();
    return species.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.scientific_name?.toLowerCase().includes(term)
    );
  };

  const getFilteredLocations = () => {
    if (!locationSearchTerm.trim()) return locations.slice(0, showAllLocations ? undefined : 10);
    const term = locationSearchTerm.toLowerCase();
    return locations.filter(l => 
      l.name.toLowerCase().includes(term) || 
      l.county.toLowerCase().includes(term) ||
      l.type.toLowerCase().includes(term)
    );
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (files: FileList | null, type: 'photo' | 'video') => {
    if (!files || files.length === 0) return;

    if (type === 'photo') {
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
      setFormData(prev => ({ ...prev, video_file: file }));
      setPreviewUrls(prev => ({
        ...prev,
        video: URL.createObjectURL(file)
      }));
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => {
      const newPhotos = [...prev.photo_urls];
      const newFiles = [...prev.photo_files];
      
      if (index < newPhotos.length) {
        newPhotos.splice(index, 1);
      } else {
        const fileIndex = index - newPhotos.length;
        URL.revokeObjectURL(URL.createObjectURL(newFiles[fileIndex]));
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
    if (formData.video_file && previewUrls.video) {
      URL.revokeObjectURL(previewUrls.video);
    }
    setFormData(prev => ({ ...prev, video_file: null, video_url: '' }));
    setPreviewUrls(prev => ({ ...prev, video: undefined }));
  };

  // Upload file to R2
  const uploadFileToR2 = async (file: File, type: 'photo' | 'video', catchId?: string): Promise<string> => {
    if (!user) {
      throw new Error('Trebuie să fii autentificat');
    }

    if (!userUsername) {
      throw new Error('Username-ul nu este disponibil. Te rog reîncarcă pagina.');
    }

    // Use existing catch's global_id or get it from catch
    let finalCatchId = catchId;
    if (!finalCatchId && catchItem) {
      // Fetch global_id if not provided
      const { data: catchData } = await supabase
        .from('catches')
        .select('global_id')
        .eq('id', catchItem.id)
        .single();
      
      if (catchData?.global_id) {
        finalCatchId = `catch-${catchData.global_id}`;
      } else {
        throw new Error('ID-ul capturii nu este disponibil');
      }
    }

    if (!finalCatchId) {
      throw new Error('ID-ul capturii nu este disponibil');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileExtension = sanitizedFileName.split('.').pop() || '';
    const baseFileName = sanitizedFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${finalCatchId}_${timestamp}_${baseFileName}.${fileExtension}`;
    
    // New structure: username/journal/images or username/journal/videos
    const category = type === 'photo' ? 'images' : 'videos';
    const fullPath = `${userUsername}/journal/${category}/${fileName}`;

    const formDataObj = new FormData();
    formDataObj.append('file', file);
    formDataObj.append('category', 'journal'); // Main category
    formDataObj.append('subCategory', category); // images or videos
    formDataObj.append('fileName', fileName);
    formDataObj.append('username', userUsername);

    // Try multiple endpoints for development
    const uploadUrls = import.meta.env.DEV 
      ? [
          'http://localhost:8888/.netlify/functions/upload',
          'http://localhost:8889/.netlify/functions/upload',
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

    if (!user || !catchItem) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    // Check if we have photos (either existing or new files)
    const hasPhotos = (formData.photo_urls.length > 0) || (formData.photo_files.length > 0);
    if (!hasPhotos) {
      toast.error('Cel puțin o fotografie este obligatorie');
      return;
    }

    // Video is optional for catches (only required for records)

    setIsSubmitting(true);
    setIsUploading(true);
    toast.loading('Se încarcă fișierele și se actualizează captura...', { id: 'edit-catch' });

    try {
      // Upload new files to R2 first
      let photoUrls: string[] = [...formData.photo_urls]; // Keep existing photos
      let videoUrl: string = formData.video_url; // Keep existing video

      // Get global_id for file naming
      const catchId = formData.global_id ? `catch-${formData.global_id}` : undefined;

      // Upload new photos
      if (formData.photo_files.length > 0) {
        try {
          const uploadPromises = formData.photo_files.map(file => uploadFileToR2(file, 'photo', catchId));
          const newPhotoUrls = await Promise.all(uploadPromises);
          photoUrls = [...photoUrls, ...newPhotoUrls];
        } catch (error: any) {
          toast.error(`Eroare la încărcarea imaginilor: ${error.message}`);
          setIsSubmitting(false);
          setIsUploading(false);
          toast.dismiss('edit-catch');
          return;
        }
      }

      // Upload new video if provided
      if (formData.video_file) {
        try {
          videoUrl = await uploadFileToR2(formData.video_file, 'video', catchId);
        } catch (error: any) {
          let errorMessage = error.message || 'Eroare necunoscută';
          
          if (error.message && error.message.includes('{')) {
            try {
              const errorMatch = error.message.match(/\{.*\}/);
              if (errorMatch) {
                const errorData = JSON.parse(errorMatch[0]);
                if (errorData.error) {
                  errorMessage = errorData.error;
                  if (errorData.details) {
                    errorMessage += ` (${errorData.details})`;
                  }
                }
              }
            } catch (e) {
              // Keep original error message
            }
          }
          
          toast.error(`Eroare la încărcarea videoclipului: ${errorMessage}`);
          setIsSubmitting(false);
          setIsUploading(false);
          toast.dismiss('edit-catch');
          return;
        }
      }

      setIsUploading(false);

      // Prepare update data
      const updateData: any = {
        captured_at: formData.captured_at,
        notes: formData.notes || null,
        photo_url: photoUrls.length > 0 ? photoUrls[0] : null,
        video_url: videoUrl,
        is_public: formData.is_public,
        updated_at: new Date().toISOString()
      };

      // Add optional fields if provided
      if (formData.species_id) {
        updateData.species_id = formData.species_id;
      } else {
        updateData.species_id = null;
      }
      if (selectedLocation) {
        updateData.location_id = selectedLocation;
      } else {
        updateData.location_id = null;
      }
      if (formData.weight) {
        updateData.weight = parseFloat(formData.weight);
      } else {
        updateData.weight = null;
      }
      if (formData.length_cm) {
        updateData.length_cm = parseFloat(formData.length_cm);
      } else {
        updateData.length_cm = null;
      }

      // Update catch
      const { error: updateError } = await supabase
        .from('catches')
        .update(updateData)
        .eq('id', catchItem.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating catch:', updateError);
        throw new Error(updateError.message || 'Eroare la actualizarea capturii');
      }

      toast.success('Captură actualizată cu succes!', { id: 'edit-catch' });

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
      console.error('Error updating catch:', error);
      toast.error(error.message || 'Eroare la actualizarea capturii', { id: 'edit-catch' });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleDeleteCatch = async () => {
    if (!user || !catchItem) return;
    
    if (!confirm('Ești sigur că vrei să ștergi această captură? Această acțiune nu poate fi anulată.')) {
      return;
    }

    const toastId = toast.loading('Se șterge captura...');

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

      const username = userUsername || catchItem.user_id; // Fallback
      const catchPrefix = catchItem.global_id 
        ? `${username}/journal/images/catch-${catchItem.global_id}_`
        : `${username}/journal/images/catch-${catchItem.id}_`;

      // Delete files from R2
      try {
        const deleteResponse = await fetch('/.netlify/functions/delete-r2-file', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prefix: catchPrefix })
        });

        if (!deleteResponse.ok) {
          console.warn('Failed to delete files from R2, continuing with DB deletion');
        }
      } catch (error) {
        console.warn('Error deleting files from R2:', error);
        // Continue with DB deletion even if file deletion fails
      }

      // Delete catch from database (cascade will delete likes and comments)
      const { error: deleteError } = await supabase
        .from('catches')
        .delete()
        .eq('id', catchItem.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      toast.success('Captură ștearsă cu succes!', { id: toastId });
      onDelete?.();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting catch:', error);
      toast.error(error.message || 'Eroare la ștergerea capturii', { id: toastId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Editează Captură</CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteCatch}
                className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-600"
                disabled={isSubmitting || isUploading}
                title="Șterge captura"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isSubmitting || isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Species and Location on same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Species Selection */}
              <div className="space-y-2">
                <Label htmlFor="species" className="text-sm font-medium">
                  Specia (opțional)
                </Label>
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={formData.species_id ? "Specia selectată" : "Caută specia..."}
                      value={speciesSearchTerm}
                      onChange={(e) => setSpeciesSearchTerm(e.target.value)}
                      className={`w-full pr-10 ${formData.species_id ? 'bg-green-50 border-green-300' : ''}`}
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
                    <div className="max-h-48 overflow-y-auto border rounded-lg absolute z-50 w-full bg-white shadow-lg">
                      {getFilteredSpecies().length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="text-sm">Nu s-au găsit specii pentru "{speciesSearchTerm}"</div>
                        </div>
                      ) : (
                        getFilteredSpecies().map((s) => (
                          <div
                            key={s.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, species_id: s.id }));
                              setSpeciesSearchTerm(s.name);
                            }}
                          >
                            <div className="font-medium">{s.name}</div>
                            {s.scientific_name && (
                              <div className="text-sm text-gray-500 italic">{s.scientific_name}</div>
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
                <Label htmlFor="location" className="text-sm font-medium">
                  Locația de pescuit (opțional)
                </Label>
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={selectedLocation ? "Locația selectată" : "Caută locația..."}
                      value={locationSearchTerm}
                      onChange={(e) => setLocationSearchTerm(e.target.value)}
                      className={`w-full pr-10 ${selectedLocation ? 'bg-green-50 border-green-300' : ''}`}
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
                    <div className="max-h-48 overflow-y-auto border rounded-lg absolute z-50 w-full bg-white shadow-lg">
                      {getFilteredLocations().length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="text-sm">Nu s-au găsit locații pentru "{locationSearchTerm}"</div>
                        </div>
                      ) : (
                        getFilteredLocations().map((l) => (
                          <div
                            key={l.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSelectedLocation(l.id);
                              setLocationSearchTerm(l.name);
                            }}
                          >
                            <div className="font-medium">{l.name.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-gray-500 capitalize">
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
                  Greutatea (kg) (opțional)
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="length_cm" className="text-sm font-medium flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Lungimea (cm) (opțional)
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
                />
              </div>
            </div>

            {/* Photos and Video */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="photos" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Camera className="w-4 h-4 text-blue-500" />
                    Fotografii <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 group">
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
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                        <Camera className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600">Adaugă fotografii</p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG până la 10MB</p>
                    </label>
                  </div>

                  {/* Photo Previews */}
                  {(formData.photo_urls.length > 0 || formData.photo_files.length > 0) && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {previewUrls.photos?.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                  <Label htmlFor="video" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Video className="w-4 h-4 text-green-500" />
                    Videoclip (opțional)
                  </Label>
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-4 text-center hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 group">
                    <input
                      type="file"
                      id="video"
                      accept="video/*"
                      onChange={(e) => {
                        handleFileSelect(e.target.files, 'video');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <label htmlFor="video" className="cursor-pointer block">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                        <Video className="w-6 h-6 text-green-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 group-hover:text-green-600">Selectează videoclip</p>
                      <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI până la 100MB</p>
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
                        className="mt-2 text-xs text-red-500 hover:text-red-700"
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
              <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Note suplimentare
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Detalii despre captură, tehnica folosită, vremea, etc."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Captură publică (vizibilă pentru toți)</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-600">{formData.is_public ? 'Public' : 'Privat'}</span>
                  <div
                    onClick={() => handleInputChange('is_public', !formData.is_public)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_public ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_public ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {(isSubmitting || isUploading) ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    {isUploading ? 'Se încarcă fișierele...' : 'Se salvează...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Salvează Modificările
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isUploading}
                className="px-6"
              >
                Anulează
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCatchModal;

