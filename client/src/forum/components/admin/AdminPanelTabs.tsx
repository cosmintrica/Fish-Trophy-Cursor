/**
 * Admin Panel Tabs Component
 * Navigare între secțiunile Admin Panel
 * Mobile-friendly: Dropdown pe mobil, tabs pe desktop
 */

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronDown } from 'lucide-react';

export type AdminTab = 
  | 'dashboard' 
  | 'categorii'
  | 'moderare' 
  | 'reputatie' 
  | 'badges' 
  | 'braconaj' 
  | 'roluri' 
  | 'marketplace';

interface AdminPanelTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export default function AdminPanelTabs({ activeTab, onTabChange }: AdminPanelTabsProps) {
  const { theme } = useTheme();
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'categorii', label: 'Categorii', icon: '📁' },
    { id: 'moderare', label: 'Moderare', icon: '🛡️' },
    { id: 'reputatie', label: 'Reputație', icon: '⭐' },
    { id: 'badges', label: 'Badge-uri', icon: '🏆' },
    { id: 'braconaj', label: 'Rapoarte Braconaj', icon: '🚨' },
    { id: 'roluri', label: 'Roluri', icon: '👥' },
    { id: 'marketplace', label: 'Marketplace', icon: '🛒' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMobileDropdown(false);
      }
    };

    if (showMobileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileDropdown]);

  return (
    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
      {/* Desktop: Tabs */}
      <div className="hidden md:flex" style={{
        gap: '0.5rem',
        borderBottom: `2px solid ${theme.border}`,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: activeTab === tab.id ? theme.primary : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : theme.text,
              border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${theme.primary}` : '3px solid transparent',
              borderRadius: '0.5rem 0.5rem 0 0',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? '600' : '500',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile: Dropdown */}
      <div className="md:hidden" ref={dropdownRef}>
        <button
          onClick={() => setShowMobileDropdown(!showMobileDropdown)}
          style={{
            width: '100%',
            padding: '0.875rem 1rem',
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.surfaceHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.surface;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{activeTabData.icon}</span>
            <span style={{ 
              fontWeight: '600', 
              color: theme.text,
              fontSize: '0.875rem'
            }}>
              {activeTabData.label}
            </span>
          </div>
          <ChevronDown 
            size={20} 
            style={{ 
              color: theme.textSecondary,
              transform: showMobileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} 
          />
        </button>

        {/* Dropdown Menu */}
        {showMobileDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setShowMobileDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  backgroundColor: activeTab === tab.id ? theme.primary : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : theme.text,
                  border: 'none',
                  borderBottom: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1.125rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

