import React from 'react';

interface MapHeaderProps {
  onClusterToggle: () => void;
  isClustered: boolean;
}

const MapHeader: React.FC<MapHeaderProps> = ({ onClusterToggle, isClustered }) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Test Harta</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onClusterToggle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label={isClustered ? 'Arată toate locațiile individual' : 'Grupare locații'}
            >
              {isClustered ? 'Toate Individual' : 'Clustere'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapHeader;
