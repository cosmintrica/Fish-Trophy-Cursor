import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Scale, Ruler, Fish, Camera, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RecordSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  locationName?: string;
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

const RecordSubmissionModal: React.FC<RecordSubmissionModalProps> = ({
  isOpen,
  onClose,
  locationId,
  locationName
}) => {
  const { user } = useAuth();
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const { trackRecordSubmission } = useAnalytics();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [species, setSpecies] = useState<Species[]>([]);
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');

  // State for limited display and search
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    species_id: '',
    weight: '',
    length_cm: '',
    date_caught: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
    notes: '',
    photo_files: [] as File[],
    video_file: null as File | null,
    photo_urls: [] as string[],
    video_url: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ photos?: string[]; video?: string }>({});

  // Sync location props with state
  useEffect(() => {
    if (locationId) {
      setSelectedLocation(locationId);
      if (locationName) {
        setLocationSearchTerm(locationName);
      }
    }
  }, [locationId, locationName, isOpen]);

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
      console.error('Error loading species from Supabase:', error);
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
      console.error('Error loading locations from Supabase:', error);
      setLocations([]);
    }
  };

  // Helper function to remove diacritics
  const removeDiacritics = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Get filtered species based on search and display limit
  const getFilteredSpecies = () => {
    // Only show results when searching
    if (!speciesSearchTerm.trim()) {
      return [];
    }

    const searchTerm = removeDiacritics(speciesSearchTerm.toLowerCase());

    let filtered = species.filter(s => {
      const name = removeDiacritics(s.name?.toLowerCase() || '');
      const scientificName = removeDiacritics(s.scientific_name?.toLowerCase() || '');

      return name.includes(searchTerm) || scientificName.includes(searchTerm);
    });

    // Apply display limit (show only first 10 if not showing all)
    if (!showAllSpecies) {
      filtered = filtered.slice(0, 10);
    }

    return filtered;
  };

  // Get filtered locations based on search and display limit
  const getFilteredLocations = () => {
    // Only show results when searching
    if (!locationSearchTerm.trim()) {
      return [];
    }

    const searchTerm = removeDiacritics(locationSearchTerm.toLowerCase());

    let filtered = locations.filter(l => {
      const name = removeDiacritics(l.name?.toLowerCase() || '');
      const type = removeDiacritics(l.type?.toLowerCase() || '');
      const county = removeDiacritics(l.county?.toLowerCase() || '');

      return name.includes(searchTerm) || type.includes(searchTerm) || county.includes(searchTerm);
    });

    // Smart prioritization based on search term
    filtered.sort((a, b) => {
      const aName = removeDiacritics(a.name?.toLowerCase() || '');
      const bName = removeDiacritics(b.name?.toLowerCase() || '');
      const aType = removeDiacritics(a.type?.toLowerCase() || '');
      const bType = removeDiacritics(b.type?.toLowerCase() || '');

      // If searching for river names (Olt, Mures, etc.), prioritize rivers
      const riverNames = ['olt', 'mures', 'dunare', 'siret', 'prut', 'arges', 'jijia', 'buzau', 'ialomita', 'teleorman'];
      const isSearchingForRiver = riverNames.some(riverName => searchTerm.includes(riverName));

      if (isSearchingForRiver) {
        const aIsRiver = aType === 'rau' || aType === 'river';
        const bIsRiver = bType === 'rau' || bType === 'river';

        if (aIsRiver && !bIsRiver) return -1;
        if (!aIsRiver && bIsRiver) return 1;
      }

      // If searching for lake names, prioritize lakes
      const lakeNames = ['snagov', 'herastrau', 'cernica', 'tei', 'floreasca', 'morii', 'chitila', 'bucuresti'];
      const isSearchingForLake = lakeNames.some(lakeName => searchTerm.includes(lakeName));

      if (isSearchingForLake) {
        const aIsLake = aType === 'lac' || aType === 'lake';
        const bIsLake = bType === 'lac' || bType === 'lake';

        if (aIsLake && !bIsLake) return -1;
        if (!aIsLake && bIsLake) return 1;
      }

      // Default: prioritize exact name matches
      const aExactMatch = aName === searchTerm;
      const bExactMatch = bName === searchTerm;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Then prioritize name starts with search term
      const aStartsWith = aName.startsWith(searchTerm);
      const bStartsWith = bName.startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      return 0;
    });

    // Apply display limit (show only first 10 if not showing all)
    if (!showAllLocations) {
      filtered = filtered.slice(0, 10);
    }

    return filtered;
  };

  const handleInputChange = (field: string, value: string | File | null) => {
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

    // Validate file size
    const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for photos, 100MB for videos
    
    if (type === 'photo') {
      // Handle multiple photos
      const validFiles: File[] = [];
      const previewUrlsArray: string[] = [];
      
      Array.from(files).forEach(file => {
        if (file.size > maxSize) {
          toast.error(`Imaginea "${file.name}" este prea mare. Maxim 10MB.`);
          return;
        }
        validFiles.push(file);
        // Create optimized preview URL with reduced quality for performance
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
      // Handle single video
      const file = files[0];
      if (file.size > maxSize) {
        toast.error(`Videoclipul este prea mare. Maxim 100MB.`);
        return;
      }

      handleInputChange('video_file', file);
      
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
        // Revoke the URL to free memory
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

  // Upload file to R2 (called only when submitting the form)
  const uploadFileToR2 = async (file: File, type: 'photo' | 'video', recordId?: string): Promise<string> => {
    if (!user) {
      throw new Error('Trebuie să fii autentificat');
    }

    if (!userUsername) {
      throw new Error('Username-ul nu este disponibil. Te rog reîncarcă pagina.');
    }

    if (!recordId) {
      throw new Error('ID-ul recordului nu este disponibil');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileExtension = sanitizedFileName.split('.').pop() || '';
    const baseFileName = sanitizedFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${recordId}_${timestamp}_${baseFileName}.${fileExtension}`;
    
    // New structure: username/records/images or username/records/videos
    const category = type === 'photo' ? 'images' : 'videos';
    // Note: fullPath is calculated in upload function, not used here

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'records'); // Main category
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
      // Cleanup preview URLs when component unmounts or modal closes
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
      toast.error('Trebuie să fii autentificat pentru a adăuga un record');
      return;
    }

    if (isUploading) {
      toast.error('Te rugăm să aștepți finalizarea încărcării fișierelor');
      return;
    }

    if (!formData.species_id || !formData.weight || !formData.length_cm || !selectedLocation) {
      toast.error('Completează toate câmpurile obligatorii');
      return;
    }

    // Photos and video are required
    if (formData.photo_files.length === 0) {
      toast.error('Cel puțin o fotografie este obligatorie pentru trimiterea recordului');
      return;
    }

    if (!formData.video_file) {
      toast.error('Videoclipul este obligatoriu pentru trimiterea recordului');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);
    toast.loading('Se salvează recordul și se încarcă fișierele...', { id: 'submit-record' });

    try {
      // First, insert record to get user_record_id from trigger
      const recordData = {
        species_id: formData.species_id,
        weight: parseFloat(formData.weight),
        length_cm: parseFloat(formData.length_cm),
        location_id: selectedLocation,
        date_caught: formData.date_caught,
        notes: formData.notes || null
      };

      // Insert record first to get global_id
      const { data: insertedRecord, error: insertError } = await supabase
        .from('records')
        .insert([recordData])
        .select('id, global_id')
        .single();

      if (insertError) throw insertError;
      if (!insertedRecord?.global_id) {
        throw new Error('ID-ul recordului nu a fost generat. Te rog reîncearcă.');
      }

      const recordId = `record-${insertedRecord.global_id}`;

      // Now upload files to R2 with the correct record ID
      let photoUrls: string[] = [];
      let videoUrl: string | null = null;

      // Upload all photos
      if (formData.photo_files.length > 0) {
        try {
          const uploadPromises = formData.photo_files.map(file => uploadFileToR2(file, 'photo', recordId));
          photoUrls = await Promise.all(uploadPromises);
        } catch (error: any) {
          // Delete the record if upload fails
          await supabase.from('records').delete().eq('id', insertedRecord.id);
          toast.error(`Eroare la încărcarea imaginilor: ${error.message}`);
          setIsSubmitting(false);
          setIsUploading(false);
          toast.dismiss('submit-record');
          return;
        }
      }

      if (formData.video_file) {
        try {
          videoUrl = await uploadFileToR2(formData.video_file, 'video', recordId);
        } catch (error: any) {
          // Delete the record if upload fails
          await supabase.from('records').delete().eq('id', insertedRecord.id);
          let errorMessage = error.message || 'Eroare necunoscută';
          
          // Try to parse JSON error from response
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
          toast.dismiss('submit-record');
          return;
        }
      }

      // Update record with photo and video URLs
      const updateData: any = {};
      if (photoUrls.length > 0) {
        updateData.photo_url = photoUrls[0];
        updateData.photo_urls = photoUrls; // All photos as array (if column exists)
      }
      if (videoUrl) {
        updateData.video_url = videoUrl;
      }

      const { error: updateError } = await supabase
        .from('records')
        .update(updateData)
        .eq('id', insertedRecord.id);

      if (updateError) throw updateError;

      setIsUploading(false);

      toast.success('Record trimis cu succes! Va fi verificat de moderatori.', { id: 'submit-record' });

      // Track record submission
      trackRecordSubmission({
        species: formData.species_id,
        weight: formData.weight,
        length: formData.length_cm,
        location: selectedLocation
      });

      // Cleanup preview URLs
      if (previewUrls.photos) {
        previewUrls.photos.forEach(url => URL.revokeObjectURL(url));
      }
      if (previewUrls.video) {
        URL.revokeObjectURL(previewUrls.video);
      }

      onClose();
      // Reset form
      setFormData({
        species_id: '',
        weight: '',
        length_cm: '',
        date_caught: new Date().toISOString().slice(0, 16),
        notes: '',
        photo_files: [],
        video_file: null,
        photo_urls: [],
        video_url: ''
      });
      setPreviewUrls({});
      setSelectedLocation(locationId || '');
    } catch (error) {
      console.error('Error submitting record:', error);
      toast.error('Eroare la trimiterea recordului', { id: 'submit-record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <Card className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Fish className="w-6 h-6 text-blue-600" />
            Adaugă Record Nou
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Species and Location - Same Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Species Selection */}
            <div className="space-y-2">
              <Label htmlFor="species" className="text-sm font-medium">
                Specia de pește <span className="text-red-500">*</span>
              </Label>

              {/* Search Input */}
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

                {/* Species List */}
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

                    {/* Show More Button */}
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

                    {/* Show Less Button */}
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

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Locația de pescuit <span className="text-red-500">*</span>
              </Label>

              {/* Search Input */}
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

                {/* Location List */}
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

                    {/* Show More Button */}
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

                    {/* Show Less Button */}
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
                <Label htmlFor="date_caught" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data și ora capturării <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_caught"
                  type="datetime-local"
                  value={formData.date_caught}
                  onChange={(e) => handleInputChange('date_caught', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-medium flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Greutatea (kg) <span className="text-red-500">*</span>
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
                  Lungimea (cm) <span className="text-red-500">*</span>
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

            {/* File Uploads */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Fișiere</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Camera className="w-4 h-4 text-blue-500" />
                    Fotografii <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 sm:p-6 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 group">
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleFileSelect(e.target.files, 'photo');
                        // Reset input to allow selecting the same file again
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
                    
                    {/* Display selected photos with remove buttons */}
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
                    Videoclip <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-4 sm:p-6 text-center hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 group">
                    <input
                      type="file"
                      id="video"
                      accept="video/*"
                      onChange={(e) => {
                        handleFileSelect(e.target.files, 'video');
                        // Reset input to allow selecting the same file again
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
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Se trimite...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Trimite Recordul
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
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

export default RecordSubmissionModal;
