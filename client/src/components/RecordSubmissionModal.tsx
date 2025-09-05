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

interface Location {
  id: string;
  name: string;
  type: string;
  county: string;
}

const RecordSubmissionModal: React.FC<RecordSubmissionModalProps> = ({
  isOpen,
  onClose,
  locationId
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [species, setSpecies] = useState<Species[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
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
    captured_at: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
    notes: '',
    photo_file: null as File | null,
    video_file: null as File | null
  });

  // Load species and locations
  useEffect(() => {
    if (isOpen) {
      loadSpecies();
      loadLocations();
    }
  }, [isOpen]);

  const loadSpecies = async () => {
    try {
      // Try API first
      const response = await fetch('/api/species');
      const result = await response.json();
      if (result.success) {
        setSpecies(result.data);
        return;
      }
    } catch (error) {
      console.error('Error loading species from API:', error);
    }

    // Fallback to direct Supabase query
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
      // Try API first
      const response = await fetch('/api/locations');
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
        return;
      }
    } catch (error) {
      console.error('Error loading locations from API:', error);
    }

    // Fallback to direct Supabase query
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

  // Get filtered species based on search and display limit
  const getFilteredSpecies = () => {
    // Only show results when searching
    if (!speciesSearchTerm.trim()) {
      return [];
    }
    
    let filtered = species.filter(s => 
      (s.name?.toLowerCase() || '').includes(speciesSearchTerm.toLowerCase()) ||
      (s.scientific_name?.toLowerCase() || '').includes(speciesSearchTerm.toLowerCase())
    );
    
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
    
    let filtered = locations.filter(l => 
      (l.name?.toLowerCase() || '').includes(locationSearchTerm.toLowerCase()) ||
      (l.type?.toLowerCase() || '').includes(locationSearchTerm.toLowerCase()) ||
      (l.county?.toLowerCase() || '').includes(locationSearchTerm.toLowerCase())
    );
    
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
    try {
      // For now, we'll just store the file reference
      // In production, upload to Cloudflare R2
      handleInputChange(type === 'photo' ? 'photo_file' : 'video_file', file);
      toast.success(`${type === 'photo' ? 'Imaginea' : 'Videoclipul'} a fost selectat`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Eroare la încărcarea fișierului');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Trebuie să fii autentificat pentru a adăuga un record');
      return;
    }

    if (!formData.species_id || !formData.weight || !formData.length_cm || !selectedLocation) {
      toast.error('Completează toate câmpurile obligatorii');
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
        captured_at: formData.captured_at,
        notes: formData.notes || null,
        photo_url: formData.photo_file ? 'pending_upload' : null,
        video_url: formData.video_file ? 'pending_upload' : null
      };

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sesiunea a expirat. Te rugăm să te autentifici din nou.');
        return;
      }

      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(recordData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Record trimis cu succes! Va fi verificat de moderatori.', { id: 'submit-record' });
        onClose();
        // Reset form
        setFormData({
          species_id: '',
          weight: '',
          length_cm: '',
          captured_at: new Date().toISOString().slice(0, 16),
          notes: '',
          photo_file: null,
          video_file: null
        });
        setSelectedLocation(locationId || '');
      } else {
        toast.error(result.error || 'Eroare la trimiterea recordului', { id: 'submit-record' });
      }
    } catch (error) {
      console.error('Error submitting record:', error);
      toast.error('Eroare la trimiterea recordului', { id: 'submit-record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {/* Species Selection */}
            <div className="space-y-2">
              <Label htmlFor="species" className="text-sm font-medium">
                Specia de pește <span className="text-red-500">*</span>
              </Label>
              
              {/* Search Input */}
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Caută specia..."
                  value={speciesSearchTerm}
                  onChange={(e) => setSpeciesSearchTerm(e.target.value)}
                  className="w-full"
                />
                
                {/* Species List */}
                                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {!speciesSearchTerm.trim() ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="text-sm">Caută o specie de pește...</div>
                      </div>
                    ) : getFilteredSpecies().length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="text-sm">Nu s-au găsit specii pentru "{speciesSearchTerm}"</div>
                      </div>
                    ) : (
                      getFilteredSpecies().map((s) => (
                        <div
                          key={s.id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                            formData.species_id === s.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
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
                  {!showAllSpecies && speciesSearchTerm && getFilteredSpecies().length > 10 && (
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
                  {showAllSpecies && speciesSearchTerm && (
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
              </div>
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Locația de pescuit <span className="text-red-500">*</span>
              </Label>
              
              {/* Search Input */}
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Caută locația..."
                  value={locationSearchTerm}
                  onChange={(e) => setLocationSearchTerm(e.target.value)}
                  className="w-full"
                />
                
                {/* Location List */}
                                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {!locationSearchTerm.trim() ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="text-sm">Caută o locație de pescuit...</div>
                      </div>
                    ) : getFilteredLocations().length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="text-sm">Nu s-au găsit locații pentru "{locationSearchTerm}"</div>
                      </div>
                    ) : (
                      getFilteredLocations().map((l) => (
                        <div
                          key={l.id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                            selectedLocation === l.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
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
                  {!showAllLocations && locationSearchTerm && getFilteredLocations().length > 10 && (
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
                  {showAllLocations && locationSearchTerm && (
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
              </div>
            </div>

            {/* Weight and Length */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Capture Date and Time */}
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
              />
            </div>

            {/* File Uploads */}
            <div className="space-y-6">
              <Label className="text-sm font-medium text-gray-700">Fișiere (opțional)</Label>
              
              {/* Photo Upload */}
              <div className="space-y-3">
                <Label htmlFor="photo" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Camera className="w-4 h-4 text-blue-500" />
                  Fotografie
                </Label>
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-200 group">
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
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                      <Camera className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Apasă pentru a selecta o imagine</p>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP până la 10MB</p>
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
              <div className="space-y-3">
                <Label htmlFor="video" className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Video className="w-4 h-4 text-green-500" />
                  Videoclip
                </Label>
                <div className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 group">
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
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                      <Video className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 group-hover:text-green-600">Apasă pentru a selecta un videoclip</p>
                    <p className="text-xs text-gray-500 mt-2">MP4, MOV, AVI până la 100MB</p>
                    {formData.video_file && (
                      <p className="text-xs text-green-600 mt-2 font-medium flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3" />
                        {formData.video_file.name}
                      </p>
                    )}
                  </label>
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
