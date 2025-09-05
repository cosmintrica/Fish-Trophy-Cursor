import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Scale, Ruler, Fish, Camera, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from './SearchableSelect';
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
  common_ro: string;
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
  
  const [formData, setFormData] = useState({
    species_id: '',
    weight_kg: '',
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
      const response = await fetch('/api/species');
      const result = await response.json();
      if (result.success) {
        setSpecies(result.data);
      }
    } catch (error) {
      console.error('Error loading species:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
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

    if (!formData.species_id || !formData.weight_kg || !formData.length_cm || !selectedLocation) {
      toast.error('Completează toate câmpurile obligatorii');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Se trimite recordul...', { id: 'submit-record' });

    try {
      const recordData = {
        species_id: formData.species_id,
        weight_kg: parseFloat(formData.weight_kg),
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
          weight_kg: '',
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
              <SearchableSelect
                options={species.map(s => ({
                  value: s.id,
                  label: `${s.common_ro} (${s.scientific_name})`
                }))}
                value={formData.species_id}
                onChange={(value) => handleInputChange('species_id', value)}
                placeholder="Selectează specia de pește"
                searchPlaceholder="Caută specia..."
              />
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Locația de pescuit <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={locations.map(l => ({
                  value: l.id,
                  label: `${l.name} (${l.type}, ${l.county})`
                }))}
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="Selectează locația de pescuit"
                searchPlaceholder="Caută locația..."
              />
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
                  value={formData.weight_kg}
                  onChange={(e) => handleInputChange('weight_kg', e.target.value)}
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
            <div className="space-y-4">
              <Label className="text-sm font-medium">Fișiere (opțional)</Label>
              
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label htmlFor="photo" className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Fotografie
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'photo');
                    }}
                    className="flex-1"
                  />
                  {formData.photo_file && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {formData.photo_file.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Video Upload */}
              <div className="space-y-2">
                <Label htmlFor="video" className="text-sm font-medium flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Videoclip
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video');
                    }}
                    className="flex-1"
                  />
                  {formData.video_file && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {formData.video_file.name}
                    </div>
                  )}
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
