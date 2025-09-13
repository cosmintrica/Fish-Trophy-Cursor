import React from 'react';
import { Trophy, Calendar, MapPin, Eye, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserRecord {
  id: string;
  species: string;
  weight: number;
  length: number;
  location_name: string;
  created_at: string;
  status: string;
  image_url?: string;
}

interface UserRecordsProps {
  records: UserRecord[];
  onViewRecord: (record: UserRecord) => void;
  onEditRecord: (record: UserRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  isLoading: boolean;
}

const UserRecords: React.FC<UserRecordsProps> = ({
  records,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  isLoading
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobat';
      case 'pending':
        return 'În așteptare';
      case 'rejected':
        return 'Respins';
      default:
        return 'Necunoscut';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recordurile Mele</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recordurile Mele</h2>
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nu ai încă recorduri</p>
          <p className="text-gray-400">Adaugă primul tău record de pescuit!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Recordurile Mele</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.map((record) => (
          <div key={record.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            {record.image_url && (
              <div className="mb-4">
                <img
                  src={record.image_url}
                  alt={`Record ${record.species}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-gray-900">{record.species}</h3>
                <Badge className={getStatusColor(record.status)}>
                  {getStatusText(record.status)}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  <span>Greutate: {record.weight} kg</span>
                </div>
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  <span>Lungime: {record.length} cm</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{record.location_name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(record.created_at).toLocaleDateString('ro-RO')}</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => onViewRecord(record)}
                  className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  aria-label={`Vezi detalii record ${record.species}`}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Vezi
                </button>
                <button
                  onClick={() => onEditRecord(record)}
                  className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                  aria-label={`Editează record ${record.species}`}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editează
                </button>
                <button
                  onClick={() => onDeleteRecord(record.id)}
                  className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  aria-label={`Șterge record ${record.species}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Șterge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserRecords;
