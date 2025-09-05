import { useState } from 'react';
import { X, Fish, MapPin, Calendar, Scale, Ruler, User, Clock, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Record {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length_cm: number;
  captured_at: string;
  notes?: string;
  photo_url?: string;
  video_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  fish_species?: {
    name: string;
  };
  fishing_locations?: {
    name: string;
    type: string;
    county: string;
  };
  profiles?: {
    display_name: string;
    email: string;
  };
}

interface RecordDetailsModalProps {
  record: Record | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (record: Record) => void;
  onDelete?: (recordId: string) => void;
  isAdmin?: boolean;
  canEdit?: boolean;
}

const RecordDetailsModal = ({ 
  record, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  isAdmin = false, 
  canEdit = false 
}: RecordDetailsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !record) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Verificat',
          color: 'bg-green-100 text-green-800 border-green-200',
          bgColor: 'bg-green-50'
        };
      case 'pending':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'În așteptare',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          bgColor: 'bg-yellow-50'
        };
      case 'rejected':
        return {
          icon: <X className="w-5 h-5" />,
          text: 'Respins',
          color: 'bg-red-100 text-red-800 border-red-200',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Necunoscut',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const statusInfo = getStatusInfo(record.status);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(record);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete || !record.id) return;
    
    if (window.confirm('Ești sigur că vrei să ștergi acest record?')) {
      setIsLoading(true);
      try {
        await onDelete(record.id);
        onClose();
      } catch (error) {
        console.error('Error deleting record:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-0">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-t-lg">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Fish className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{record.fish_species?.name || 'Specie necunoscută'}</h2>
                  <p className="text-blue-100">{record.fishing_locations?.name || 'Locație necunoscută'}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge className={`${statusInfo.color} border`}>
                  {statusInfo.icon}
                  <span className="ml-2">{statusInfo.text}</span>
                </Badge>
                <div className="text-sm text-gray-500">
                  ID: #{record.id}
                </div>
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Scale className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Greutate</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {record.weight || 'N/A'} kg
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Ruler className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Lungime</p>
                      <p className="text-2xl font-bold text-green-900">
                        {record.length_cm || 'N/A'} cm
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Pescător</p>
                      <p className="font-medium">{record.profiles?.display_name || 'Utilizator'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Locație</p>
                      <p className="font-medium">{record.fishing_locations?.name || 'Necunoscută'}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {record.fishing_locations?.type} • {record.fishing_locations?.county}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Data capturii</p>
                      <p className="font-medium">{formatDate(record.captured_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Adăugat</p>
                      <p className="font-medium">{formatDate(record.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Gallery */}
              {(record.photo_url || record.video_url) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Media
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {record.photo_url && (
                      <div className="relative group">
                        <img 
                          src={record.photo_url} 
                          alt={`Poza record ${record.fish_species?.name}`}
                          className="w-full h-48 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <button className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 p-2 rounded-full transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {record.video_url && (
                      <div className="relative group">
                        <video 
                          src={record.video_url} 
                          controls
                          className="w-full h-48 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Note</h4>
                  <p className="text-yellow-700">{record.notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {record.status === 'rejected' && record.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Motivul respingerii</h4>
                  <p className="text-red-700">{record.rejection_reason}</p>
                </div>
              )}

              {/* Admin Info */}
              {isAdmin && record.verified_by && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Informații Admin</h4>
                  <p className="text-blue-700">
                    Verificat de: {record.verified_by} la {record.verified_at ? formatDate(record.verified_at) : 'N/A'}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Închide
                </Button>
                
                {canEdit && (
                  <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                    <Edit className="w-4 h-4 mr-2" />
                    Editează
                  </Button>
                )}
                
                {isAdmin && (
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isLoading ? 'Se șterge...' : 'Șterge'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecordDetailsModal;
