import React from 'react';
import { User, Mail, Phone, Edit3, Save, X } from 'lucide-react';

interface ProfileHeaderProps {
  profileData: {
    displayName: string;
    email: string;
    phone: string;
    bio: string;
  };
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  isEditing,
  onEditToggle,
  onSave,
  onCancel
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profileData.displayName || 'Utilizator'}
            </h1>
            <p className="text-gray-600 flex items-center mt-1">
              <Mail className="w-4 h-4 mr-2" />
              {profileData.email}
            </p>
            {profileData.phone && (
              <p className="text-gray-600 flex items-center mt-1">
                <Phone className="w-4 h-4 mr-2" />
                {profileData.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Salvează modificările"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvează
              </button>
              <button
                onClick={onCancel}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Anulează modificările"
              >
                <X className="w-4 h-4 mr-2" />
                Anulează
              </button>
            </>
          ) : (
            <button
              onClick={onEditToggle}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="Editează profilul"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Editează
            </button>
          )}
        </div>
      </div>

      {profileData.bio && (
        <div className="mt-4">
          <p className="text-gray-700">{profileData.bio}</p>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
