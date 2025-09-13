import React from 'react';

interface FishingLocation {
  id: string;
  name: string;
  subtitle?: string;
  type: string;
  county: string;
  city: string;
  region?: string;
  administrare?: string;
  latitude: number;
  longitude: number;
  coords?: [number, number];
  recordCount?: number;
  description?: string;
}

interface LocationPopupProps {
  location: FishingLocation;
  onAddRecord: (location: FishingLocation) => void;
  onViewRecords: (location: FishingLocation) => void;
  onClose: () => void;
}

const LocationPopup: React.FC<LocationPopupProps> = ({
  location,
  onAddRecord,
  onViewRecords,
  onClose
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm" role="dialog" aria-labelledby="popup-title">
      <div className="flex items-start justify-between mb-2">
        <h3 id="popup-title" className="text-lg font-semibold text-gray-900">
          {location.name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Închide popup"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-gray-600">{location.city}, {location.county}</p>
        <p className="text-sm text-gray-500">{location.type}</p>
        {location.description && (
          <p className="text-sm text-gray-700">{location.description}</p>
        )}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => onAddRecord(location)}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            aria-label={`Adaugă record pentru ${location.name}`}
          >
            Adaugă Record
          </button>
          <button
            onClick={() => onViewRecords(location)}
            className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            aria-label={`Vezi recorduri pentru ${location.name}`}
          >
            Vezi Recorduri
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPopup;
