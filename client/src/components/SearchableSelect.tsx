import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

// Helper function to remove diacritics
const removeDiacritics = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

interface SearchableSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  theme?: {
    surface: string;
    surfaceHover: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
  isDarkMode?: boolean;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Caută...",
  disabled = false,
  className = "",
  theme,
  isDarkMode = false
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Default theme (light mode)
  const defaultTheme = {
    surface: '#ffffff',
    surfaceHover: '#f3f4f6',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6'
  };

  const activeTheme = theme || defaultTheme;

  // Filter options based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOptions(options);
    } else {
      const normalizedQuery = removeDiacritics(searchQuery.toLowerCase());
      const filtered = options.filter(option => {
        const normalizedLabel = removeDiacritics(option.label.toLowerCase());
        return normalizedLabel.startsWith(normalizedQuery) || normalizedLabel.includes(normalizedQuery);
      });
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
        style={{
          width: '100%',
          padding: '0.625rem 0.75rem',
          textAlign: 'left',
          border: `1px solid ${activeTheme.border}`,
          borderRadius: '0.375rem',
          outline: 'none',
          backgroundColor: disabled ? activeTheme.surfaceHover : activeTheme.surface,
          color: disabled ? activeTheme.textSecondary : (selectedOption ? activeTheme.text : activeTheme.textSecondary),
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s'
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = activeTheme.primary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${activeTheme.primary}33`;
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = activeTheme.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = activeTheme.border;
            e.currentTarget.style.backgroundColor = activeTheme.surfaceHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = activeTheme.border;
            e.currentTarget.style.backgroundColor = activeTheme.surface;
          }
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={16}
          style={{
            color: activeTheme.textSecondary,
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          width: '100%',
          marginTop: '0.25rem',
          backgroundColor: activeTheme.surface,
          border: `1px solid ${activeTheme.border}`,
          borderRadius: '0.375rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxHeight: '20rem',
          overflow: 'hidden'
        }}>
          {/* Search Input */}
          <div style={{
            padding: '0.5rem',
            borderBottom: `1px solid ${activeTheme.border}`
          }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: activeTheme.textSecondary
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  paddingLeft: '2.25rem',
                  paddingRight: '0.75rem',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  border: `1px solid ${activeTheme.border}`,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: activeTheme.surface,
                  color: activeTheme.text,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = activeTheme.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${activeTheme.primary}33`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = activeTheme.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{
            maxHeight: '16rem',
            overflowY: 'auto'
          }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    backgroundColor: value === option.value ? `${activeTheme.primary}15` : 'transparent',
                    color: value === option.value ? activeTheme.primary : activeTheme.text,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = activeTheme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = value === option.value ? `${activeTheme.primary}15` : 'transparent';
                  }}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check size={16} style={{ color: activeTheme.primary }} />
                  )}
                </button>
              ))
            ) : (
              <div style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                color: activeTheme.textSecondary,
                textAlign: 'center'
              }}>
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
