import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { matchesAtStart } from '@/data/romania-locations';

interface SearchableSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Caută...",
  disabled = false,
  className = ""
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        matchesAtStart(option.label, searchQuery)
      );
      setFilteredOptions(filtered);
    }
  }, [searchQuery, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
      }
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-3 py-2.5 text-left border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white text-gray-900 hover:border-gray-400 cursor-pointer'
          }
          flex items-center justify-between
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                    flex items-center justify-between
                    ${value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                  `}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                Nu s-au găsit rezultate
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
