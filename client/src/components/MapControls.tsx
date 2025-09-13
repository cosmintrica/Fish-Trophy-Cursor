import React from 'react';
import { Search } from 'lucide-react';

interface MapControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFilterChange: (type: string) => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  searchTerm,
  onSearchChange,
  onFilterChange
}) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută locații..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Caută locații de pescuit"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onFilterChange('all')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Arată toate locațiile"
            >
              Toate
            </button>
            <button
              onClick={() => onFilterChange('rivers')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              aria-label="Filtrează râuri"
            >
              Râuri
            </button>
            <button
              onClick={() => onFilterChange('lakes')}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              aria-label="Filtrează lacuri"
            >
              Lacuri
            </button>
            <button
              onClick={() => onFilterChange('private_ponds')}
              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
              aria-label="Filtrează bălți private"
            >
              Bălți Private
            </button>
            <button
              onClick={() => onFilterChange('wild_ponds')}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              aria-label="Filtrează bălți sălbatice"
            >
              Bălți Sălbatice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapControls;
