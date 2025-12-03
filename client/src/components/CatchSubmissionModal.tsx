import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Scale, Ruler, Fish, Camera, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CatchSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

const CatchSubmissionModal: React.FC<CatchSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
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
    is_public: true
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

  // Filter species based on search term
  const getFilteredSpecies = () => {
    if (!speciesSearchTerm.trim()) return [];

    const searchTerm = speciesSearchTerm.toLowerCase();
    let filtered = species.filter(s =>
      s.name.toLowerCase().includes(searchTerm) ||
      (s.scientific_name && s.scientific_name.toLowerCase().includes(searchTerm))
    );

    filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStartsWith = aName.startsWith(searchTerm);
      const bStartsWith = bName.startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return 0;
    });

    if (!showAllSpecies) {
      filtered = filtered.slice(0, 10);
    }

    return filtered;
  };

  // Filter locations based on search term
  const getFilteredLocations = () => {
    if (!locationSearchTerm.trim()) return [];

    const searchTerm = locationSearchTerm.toLowerCase();
    let filtered = locations.filter(l =>
      l.name.toLowerCase().includes(searchTerm) ||
      l.county.toLowerCase().includes(searchTerm) ||
      l.type.toLowerCase().includes(searchTerm)
    );

    filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStartsWith = aName.startsWith(searchTerm);
      const bStartsWith = bName.startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return 0;
    });

    if (!showAllLocations) {
      filtered = filtered.slice(0, 10);
    }

    return filtered;
  };

  const handleInputChange = (field: string, value: string | File | null | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle file selection - only store in memory, no upload yet
  const handleFileSelect = (files: FileList | null, type: 'photo' | 'video') => {
    if (!user) {
      toast.error('Trebuie să fii autentificat pentru a selecta fișiere');
      return;
    }

    if (!files || files.length === 0) return;

    const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    
    if (type === 'photo') {
      const validFiles: File[] = [];
      const previewUrlsArray: string[] = [];
      
      Array.from(files).forEach(file => {
        if (file.size > maxSize) {
          toast.error(`Imaginea "${file.name}" este prea mare. Maxim 10MB.`);
          return;
        }
        validFiles.push(file);
        const previewUrl = URL.createObjectURL(file);
        previewUrlsArray.push(previewUrl);
      });

      if (validFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          photo_files: [...prev.photo_files, ...validFiles]
        }));
        
        setPreviewUrls(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...previewUrlsArray]
        }));

        toast.success(`${validFiles.length} ${validFiles.length === 1 ? 'imagine' : 'imagini'} ${validFiles.length === 1 ? 'a fost' : 'au fost'} selectat${validFiles.length === 1 ? 'ă' : 'e'}. Se vor încărca la trimitere.`);
      }
    } else {
      const file = files[0];
      if (file.size > maxSize) {
        toast.error(`Videoclipul este prea mare. Maxim 100MB.`);
        return;
      }

      setFormData(prev => ({
        ...prev,
        video_file: file
      }));
      
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls(prev => ({
        ...prev,
        video: previewUrl
      }));

      toast.success('Videoclipul a fost selectat. Se va încărca la trimitere.');
    }
  };

  // Remove photo from selection
  const handleRemovePhoto = (index: number) => {
    setFormData(prev => {
      const newPhotos = [...prev.photo_files];
      newPhotos.splice(index, 1);
      return {
        ...prev,
        photo_files: newPhotos
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

  // Upload file to R2
  const uploadFileToR2 = async (file: File, type: 'photo' | 'video', catchId?: string): Promise<string> => {
    if (!user) {
      throw new Error('Trebuie să fii autentificat');
    }

    if (!userUsername) {
      throw new Error('Username-ul nu este disponibil. Te rog reîncarcă pagina.');
    }

    if (!catchId) {
      throw new Error('ID-ul capturii nu este disponibil');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileExtension = sanitizedFileName.split('.').pop() || '';
    const baseFileName = sanitizedFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${catchId}_${timestamp}_${baseFileName}.${fileExtension}`;
    
    // New structure: username/journal/images or username/journal/videos
    const category = type === 'photo' ? 'images' : 'videos';
    const fullPath = `${userUsername}/journal/${category}/${fileName}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'journal'); // Main category
    formData.append('subCategory', category); // images or videos
    formData.append('fileName', fileName);
    formData.append('username', userUsername);

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
          body: formData
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
        // Connection refused or network error
        if (error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('Failed to fetch')) {
          lastError = new Error(
            'Funcțiile Netlify nu sunt disponibile. Te rog rulează `npm run dev` din root (nu `cd client && npm run dev`) pentru a porni funcțiile Netlify local.'
          );
          continue;
        }
        lastError = error;
        continue;
      }
    }

    // If we get here, all URLs failed
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
      toast.error('Trebuie să fii autentificat pentru a adăuga o captură');
      return;
    }

    // Only captured_at is required for catches
    if (!formData.captured_at) {
      toast.error('Data capturării este obligatorie');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);
    toast.loading('Se salvează captura și se încarcă fișierele...', { id: 'submit-catch' });

    try {
      // First, insert catch to get user_catch_id from trigger
      const catchData: any = {
        user_id: user.id,
        captured_at: formData.captured_at,
        notes: formData.notes || null,
        is_public: formData.is_public
      };

      // Add optional fields if provided
      if (formData.species_id) {
        catchData.species_id = formData.species_id;
      }
      if (selectedLocation) {
        catchData.location_id = selectedLocation;
      }
      if (formData.weight) {
        catchData.weight = parseFloat(formData.weight);
      }
      if (formData.length_cm) {
        catchData.length_cm = parseFloat(formData.length_cm);
      }

      // Insert catch first to get global_id
      const { data: insertedCatch, error: insertError } = await supabase
        .from('catches')
        .insert([catchData])
        .select('id, global_id')
        .single();

      if (insertError) throw insertError;
      if (!insertedCatch?.global_id) {
        throw new Error('ID-ul capturii nu a fost generat. Te rog reîncearcă.');
      }

      const catchId = `catch-${insertedCatch.global_id}`;

      // Now upload files to R2 with the correct catch ID
      let photoUrls: string[] = [];
      let videoUrl: string | null = null;

      // Upload photos if any
      if (formData.photo_files.length > 0) {
        try {
          const uploadPromises = formData.photo_files.map(file => uploadFileToR2(file, 'photo', catchId));
          photoUrls = await Promise.all(uploadPromises);
        } catch (error: any) {
          // Delete the catch if upload fails
          await supabase.from('catches').delete().eq('id', insertedCatch.id);
          toast.error(`Eroare la încărcarea imaginilor: ${error.message}`);
          setIsSubmitting(false);
          setIsUploading(false);
          toast.dismiss('submit-catch');
          return;
        }
      }

      // Upload video if provided
      if (formData.video_file) {
        try {
          videoUrl = await uploadFileToR2(formData.video_file, 'video', catchId);
        } catch (error: any) {
          // Delete the catch if upload fails
          await supabase.from('catches').delete().eq('id', insertedCatch.id);
          toast.error(`Eroare la încărcarea videoclipului: ${error.message}`);
          setIsSubmitting(false);
          setIsUploading(false);
          toast.dismiss('submit-catch');
          return;
        }
      }

      // Update catch with photo and video URLs
      if (photoUrls.length > 0 || videoUrl) {
        const updateData: any = {};
        if (photoUrls.length > 0) {
          updateData.photo_url = photoUrls[0];
        }
        if (videoUrl) {
          updateData.video_url = videoUrl;
        }

        const { error: updateError } = await supabase
          .from('catches')
          .update(updateData)
          .eq('id', insertedCatch.id);

        if (updateError) throw updateError;
      }

      setIsUploading(false);


      toast.success('Captură adăugată cu succes!', { id: 'submit-catch' });

      // Cleanup preview URLs
      if (previewUrls.photos) {
        previewUrls.photos.forEach(url => URL.revokeObjectURL(url));
      }
      if (previewUrls.video) {
        URL.revokeObjectURL(previewUrls.video);
      }

      // Reset form
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
        is_public: true
      });
      setPreviewUrls({});
      setSelectedLocation('');
      setSpeciesSearchTerm('');
      setLocationSearchTerm('');

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting catch:', error);
      toast.error(error.message || 'Eroare la salvarea capturii', { id: 'submit-catch' });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <Card className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Fish className="w-6 h-6 text-blue-600" />
            Adaugă Captură în Jurnal
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Species and Location - Same Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Species Selection - Optional */}
            <div className="space-y-2">
              <Label htmlFor="species" className="text-sm font-medium">
                Specia de pește (opțional)
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
                        handleInputChange('species_id', '');
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
                            handleInputChange('species_id', s.id);
                            setSpeciesSearchTerm(s.name);
                          }}
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-sm text-gray-500">{s.scientific_name}</div>
                        </div>
                      ))
                    )}

                    {!showAllSpecies && getFilteredSpecies().length > 10 && (
                      <div className="p-3 text-center border-t">
                        <button
                          type="button"
                          onClick={() => setShowAllSpecies(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Arată toate ({getFilteredSpecies().length} rezultate)
                        </button>
                      </div>
                    )}

                    {showAllSpecies && (
                      <div className="p-3 text-center border-t">
                        <button
                          type="button"
                          onClick={() => setShowAllSpecies(false)}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                          Arată mai puține
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Location Selection - Optional */}
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

                    {!showAllLocations && getFilteredLocations().length > 10 && (
                      <div className="p-3 text-center border-t">
                        <button
                          type="button"
                          onClick={() => setShowAllLocations(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Arată toate ({getFilteredLocations().length} rezultate)
                        </button>
                      </div>
                    )}

                    {showAllLocations && (
                      <div className="p-3 text-center border-t">
                        <button
                          type="button"
                          onClick={() => setShowAllLocations(false)}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                          Arată mai puține
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date, Weight and Length - Same Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className="w-full"
                  required
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
                <Label htmlFor="length" className="text-sm font-medium flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Lungimea (cm) (opțional)
                </Label>
                <Input
                  id="length"
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

            {/* File Uploads - Optional */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Fișiere (opțional)</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Camera className="w-4 h-4 text-blue-500" />
                    Fotografii
                  </Label>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 sm:p-6 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 group">
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleFileSelect(e.target.files, 'photo');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <label htmlFor="photo" className="cursor-pointer block">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                        <Camera className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600">Selectează imagini</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP până la 10MB fiecare</p>
                    </label>
                    
                    {formData.photo_files.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {formData.photo_files.map((file, index) => (
                          <div key={index} className="relative bg-white rounded-lg p-2 border border-gray-200">
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors z-10"
                              title="Șterge imaginea"
                            >
                              ×
                            </button>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-3 h-3 text-green-600" />
                              <p className="text-xs text-green-600 font-medium truncate flex-1">
                                {file.name}
                              </p>
                            </div>
                            {previewUrls.photos && previewUrls.photos[index] && (
                              <img
                                src={previewUrls.photos[index]}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded bg-gray-100"
                                loading="lazy"
                                decoding="async"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <Label htmlFor="video" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Video className="w-4 h-4 text-green-500" />
                    Videoclip (opțional)
                  </Label>
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-4 sm:p-6 text-center hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 group">
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
                      {formData.video_file && (
                        <div className="mt-3">
                          <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1 mb-2">
                            <FileText className="w-3 h-3" />
                            {formData.video_file.name}
                          </p>
                          {previewUrls.video && (
                            <video
                              src={previewUrls.video}
                              controls
                              className="w-full max-w-xs h-48 object-contain rounded mx-auto bg-black"
                              preload="metadata"
                              onError={(e) => {
                                console.log('Video preview error:', e);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
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
            <div className="space-y-2 md:col-span-2">
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
                    Salvează Captura
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

export default CatchSubmissionModal;

