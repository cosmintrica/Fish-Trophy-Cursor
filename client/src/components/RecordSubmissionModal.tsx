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
    photo_file: null as File | null,
    video_file: null as File | null,
    photo_url: '',
    video_url: ''
  });

  const [isUploading, setIsUploading] = useState(false);

  // Sync location props with state
  useEffect(() => {
    if (locationId) {
      setSelectedLocation(locationId);
      if (locationName) {
        setLocationSearchTerm(locationName);
      }
    }
  }, [locationId, locationName, isOpen]);

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

  const handleFileUpload = async (file: File, type: 'photo' | 'video') => {
    if (!user) {
      toast.error('Trebuie să fii autentificat pentru a încărca fișiere');
      return;
    }

    try {
      setIsUploading(true);
      toast.loading(`${type === 'photo' ? 'Se încarcă imaginea' : 'Se încarcă videoclipul'}...`, { id: `upload-${type}` });

      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `${user.id}_${timestamp}_${file.name}`;
      const category = type === 'photo' ? 'submission-images' : 'submission-videos';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('fileName', fileName);

      // Use Netlify function for upload (works in both dev and production)
      const uploadUrl = import.meta.env.DEV 
        ? 'http://localhost:8888/.netlify/functions/upload'
        : '/.netlify/functions/upload';

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.url) {
        handleInputChange(type === 'photo' ? 'photo_file' : 'video_file', file);
        handleInputChange(type === 'photo' ? 'photo_url' : 'video_url', result.url);
        toast.success(`${type === 'photo' ? 'Imaginea' : 'Videoclipul'} a fost încărcat cu succes`, { id: `upload-${type}` });
      } else {
        throw new Error(result.error || 'Upload failed - no URL returned');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(`Eroare la încărcarea ${type === 'photo' ? 'imaginii' : 'videoclipului'}: ${error.message || 'Eroare necunoscută'}`, { id: `upload-error-${type}` });
    } finally {
      setIsUploading(false);
    }
  };

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

    // Video is required
    if (!formData.video_url) {
      toast.error('Videoclipul este obligatoriu pentru trimiterea recordului');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Se trimite recordul...', { id: 'submit-record' });

    try {
      const recordData = {
        species_id: formData.species_id,
        weight: parseFloat(formData.weight),
        length_cm: parseFloat(formData.length_cm),
        location_id: selectedLocation,
        date_caught: formData.date_caught,
        notes: formData.notes || null,
        photo_url: formData.photo_url || null,
        video_url: formData.video_url || null
      };

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sesiunea a expirat. Te rugăm să te autentifici din nou.');
        return;
      }

      const { error } = await supabase
        .from('records')
        .insert([recordData])
        .select();

      if (error) throw error;

      toast.success('Record trimis cu succes! Va fi verificat de moderatori.', { id: 'submit-record' });

      // Track record submission
      trackRecordSubmission({
        species: formData.species_id,
        weight: formData.weight,
        length: formData.length_cm,
        location: selectedLocation
      });

      onClose();
      // Reset form
      setFormData({
        species_id: '',
        weight: '',
        length_cm: '',
        date_caught: new Date().toISOString().slice(0, 16),
        notes: '',
        photo_file: null,
        video_file: null,
        photo_url: '',
        video_url: ''
      });
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Species Selection */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="species" className="text-sm font-medium">
                Specia de pește <span className="text-red-500">*</span>
              </Label>

              {/* Search Input */}
              <div className="space-y-2">
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
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Locația de pescuit <span className="text-red-500">*</span>
              </Label>

              {/* Search Input */}
              <div className="space-y-2">
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
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
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

            {/* Weight and Length */}
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

            {/* Capture Date and Time */}
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

            {/* File Uploads */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Fișiere (opțional)</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Camera className="w-4 h-4 text-blue-500" />
                    Fotografie
                  </Label>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 sm:p-6 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 group">
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'photo');
                      }}
                      className="hidden"
                    />
                    <label htmlFor="photo" className="cursor-pointer block">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                        <Camera className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600">Selectează imagine</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP până la 10MB</p>
                      {formData.photo_file && (
                        <p className="text-xs text-green-600 mt-2 font-medium flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3" />
                          {formData.photo_file.name}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <Label htmlFor="video" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <Video className="w-4 h-4 text-green-500" />
                    Videoclip
                  </Label>
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-4 sm:p-6 text-center hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 group">
                    <input
                      type="file"
                      id="video"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'video');
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
                          {formData.video_url && formData.video_url.startsWith('http') && (
                            <video
                              src={formData.video_url}
                              controls
                              className="w-full max-w-xs h-32 object-cover rounded mx-auto"
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
