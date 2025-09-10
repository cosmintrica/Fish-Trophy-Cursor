import React, { useState, useEffect } from 'react';
import { X, Fish, Calendar, Scale, Ruler, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FishingRecord {
  id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length_cm: number;
  captured_at: string;
  notes?: string;
  photo_url?: string;
  video_url?: string;
  status: string;
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

interface EditRecordModalProps {
  record: FishingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditRecordModal = ({ record, isOpen, onClose, onSuccess }: EditRecordModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [species, setSpecies] = useState<Array<{id: string, name: string, scientific_name?: string}>>([]);
  const [locations, setLocations] = useState<Array<{id: string, name: string, type: string, county: string}>>([]);

  const [formData, setFormData] = useState({
    species_id: '',
    weight: '',
    length_cm: '',
    captured_at: '',
    notes: '',
    photo_file: null as File | null,
    video_file: null as File | null,
    photo_url: '',
    video_url: ''
  });

  const [selectedLocation, setSelectedLocation] = useState('');

  // Load species and locations
  useEffect(() => {
    if (isOpen) {
      loadSpecies();
      loadLocations();
    }
  }, [isOpen]);

  // Populate form when record changes
  useEffect(() => {
    if (record) {
      setFormData({
        species_id: record.species_id || '',
        weight: record.weight?.toString() || '',
        length_cm: record.length_cm?.toString() || '',
        captured_at: record.captured_at ? new Date(record.captured_at).toISOString().slice(0, 16) : '',
        notes: record.notes || '',
        photo_file: null,
        video_file: null,
        photo_url: record.photo_url || '',
        video_url: record.video_url || ''
      });
      setSelectedLocation(record.location_id || '');
    }
  }, [record]);

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

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (file: File, type: 'photo' | 'video') => {
    try {
      // Upload to Cloudflare R2
      const fileName = `${user?.id}_${Date.now()}_${file.name}`;
      const category = type === 'photo' ? 'submission-images' : 'submission-videos';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('fileName', fileName);

      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      if (result.success) {
        handleInputChange(type === 'photo' ? 'photo_file' : 'video_file', file);
        handleInputChange(type === 'photo' ? 'photo_url' : 'video_url', result.url);
        toast.success(`${type === 'photo' ? 'Imaginea' : 'Videoclipul'} a fost încărcat cu succes`);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Eroare la încărcarea fișierului');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !record) {
      toast.error('Utilizatorul nu este autentificat');
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
    toast.loading('Se actualizează recordul...', { id: 'edit-record' });

    try {
      const recordData = {
        species_id: formData.species_id,
        weight: parseFloat(formData.weight),
        length_cm: parseFloat(formData.length_cm),
        location_id: selectedLocation,
        captured_at: formData.captured_at,
        notes: formData.notes || null,
        photo_url: formData.photo_url || null,
        video_url: formData.video_url || null,
        updated_at: new Date().toISOString(),
        // Reset status to pending if record was rejected
        ...(record.status === 'rejected' && { status: 'pending' })
      };

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sesiunea a expirat. Te rugăm să te autentifici din nou.');
        return;
      }

      const response = await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(recordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update record');
      }

      await response.json();

      if (record.status === 'rejected') {
        toast.success('Record actualizat și trimis din nou pentru aprobare!', { id: 'edit-record' });
      } else {
        toast.success('Record actualizat cu succes!', { id: 'edit-record' });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Eroare la actualizarea recordului', { id: 'edit-record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="modal-overlay">
      <Card className="modal-content w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Fish className="w-6 h-6 text-blue-600" />
            Editează Record
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Species Selection */}
            <div className="space-y-2">
              <Label htmlFor="species">Specia de pește *</Label>
              <select
                id="species"
                value={formData.species_id}
                onChange={(e) => handleInputChange('species_id', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selectează specia</option>
                {species.map((specie) => (
                  <option key={specie.id} value={specie.id}>
                    {specie.name} {specie.scientific_name && `(${specie.scientific_name})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Weight and Length */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Greutate (kg) *</Label>
                <div className="relative">
                  <Scale className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    className="pl-10"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="length">Lungime (cm) *</Label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.length_cm}
                    onChange={(e) => handleInputChange('length_cm', e.target.value)}
                    className="pl-10"
                    placeholder="0.0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location">Locația *</Label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selectează locația</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type}) - {location.county}
                  </option>
                ))}
              </select>
            </div>

            {/* Capture Date */}
            <div className="space-y-2">
              <Label htmlFor="captured_at">Data capturării *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="captured_at"
                  type="datetime-local"
                  value={formData.captured_at}
                  onChange={(e) => handleInputChange('captured_at', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Note (opțional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Adaugă detalii despre captură..."
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Fotografie (opțional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'photo');
                    }
                  }}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    {formData.photo_file ? formData.photo_file.name : 'Apasă pentru a încărca o fotografie'}
                  </p>
                </label>
                {formData.photo_url && (
                  <div className="mt-2">
                    <img
                      src={formData.photo_url}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label>Videoclip <span className="text-red-500">*</span></Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'video');
                    }
                  }}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <Video className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {formData.video_file ? formData.video_file.name : 'Apasă pentru a încărca un videoclip'}
                  </p>
                </label>
                {formData.video_url && (
                  <div className="mt-4">
                    <p className="text-xs text-green-600 font-medium mb-2">
                      Videoclip încărcat cu succes
                    </p>
                    <video
                      src={formData.video_url}
                      controls
                      className="w-40 h-24 object-cover rounded mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Se actualizează...
                  </>
                ) : (
                  'Actualizează Record'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditRecordModal;
