/**
 * Gear Embed Component
 * Displays a compact, clickable card for gear embedded in forum posts
 */

import React, { useEffect, useState } from 'react';
import { Wrench, Calendar, ExternalLink } from 'lucide-react';
import { fetchGearEmbedData, type GearEmbedData } from '../../services/embedDataService';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import ImageZoom from '../ImageZoom';

interface GearEmbedProps {
  gearId: string;
}

// Helper to detect dark mode (works outside React context)
const getIsDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark') ||
         window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export default function GearEmbed({ gearId }: GearEmbedProps) {
  const [isDarkMode, setIsDarkMode] = useState(getIsDarkMode());
  const [data, setData] = useState<GearEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Listen for theme changes and mobile detection
  useEffect(() => {
    const updateDarkMode = () => setIsDarkMode(getIsDarkMode());
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateDarkMode);
    
    window.addEventListener('resize', checkMobile);
    checkMobile();

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', updateDarkMode);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const gearData = await fetchGearEmbedData(gearId);
        if (isMounted) {
          setData(gearData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Eroare la încărcarea echipamentului');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [gearId]);

  if (loading) {
    return (
      <div className="bbcode-gear-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: isDarkMode ? '#1e293b' : '#f3f4f6',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '0.5rem',
        fontSize: isMobile ? '0.75rem' : '0.875rem',
        color: isDarkMode ? '#94a3b8' : '#6b7280'
      }}>
        Se încarcă echipamentul...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bbcode-gear-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '0.5rem',
        color: '#dc2626',
        fontSize: isMobile ? '0.75rem' : '0.875rem'
      }}>
        {error || 'Echipamentul nu a fost găsit'}
      </div>
    );
  }

  const gearName = data.brand && data.model ? `${data.brand} ${data.model}` : data.brand || data.model || 'Echipament';

  // Get gear category display name
  const getGearCategoryName = (category?: string): string => {
    if (!category) return '';
    const categoryMap: Record<string, string> = {
      'undita': 'Undiță',
      'mulineta': 'Mulinetă',
      'scaun': 'Scaun',
      'rucsac': 'Rucsac',
      'vesta': 'Vestă',
      'cizme': 'Cizme',
      'altceva': 'Altceva'
    };
    return categoryMap[category.toLowerCase()] || category;
  };

  const categoryName = getGearCategoryName(data.category);

  return (
    <>
      <div className="bbcode-gear-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: isDarkMode ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '0.5rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '0.5rem' : '0.75rem',
        maxWidth: '100%',
        boxShadow: isDarkMode ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Thumbnail Image */}
        {data.image_url && (
          <div style={{
            width: isMobile ? '100%' : '100px',
            height: isMobile ? 'auto' : '75px',
            aspectRatio: isMobile ? '16/9' : undefined,
            flexShrink: 0,
            overflow: 'hidden',
            background: '#f3f4f6',
            position: 'relative',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
          onClick={() => setZoomedImage(getR2ImageUrlProxy(data.image_url!))}
          >
            <img
              src={getR2ImageUrlProxy(data.image_url)}
              alt={gearName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content Section - Responsive Layout */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '0.5rem' : '0.75rem',
          flexWrap: 'wrap',
          minWidth: 0
        }}>
          {/* Category Tag */}
          {categoryName && (
            <div style={{
              padding: isMobile ? '0.125rem 0.375rem' : '0.25rem 0.5rem',
              background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
              borderRadius: '0.25rem',
              fontSize: isMobile ? '0.625rem' : '0.6875rem',
              fontWeight: '600',
              color: isDarkMode ? '#93c5fd' : '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.025em',
              flexShrink: 0,
              alignSelf: isMobile ? 'flex-start' : 'center'
            }}>
              {categoryName}
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexShrink: 0
          }}>
            <Wrench style={{ width: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? '0.75rem' : '0.875rem', color: '#8b5cf6', flexShrink: 0 }} />
            <span style={{
              fontWeight: '600',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: isDarkMode ? '#f1f5f9' : '#111827'
            }}>
              {gearName}
            </span>
          </div>

          {/* Details */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
            flexWrap: 'wrap',
            fontSize: isMobile ? '0.6875rem' : '0.8125rem',
            color: isDarkMode ? '#cbd5e1' : '#374151',
            flex: isMobile ? '1' : undefined
          }}>
            {data.price && (
              <span>
                <strong>{data.price}</strong> RON
              </span>
            )}
            {data.purchase_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span>{new Date(data.purchase_date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
            )}
            {data.description && (
              <span style={{ 
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                maxWidth: isMobile ? '100%' : '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isMobile ? 'normal' : 'nowrap',
                display: isMobile ? 'block' : 'inline'
              }}>
                {data.description}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <ImageZoom
          src={zoomedImage}
          alt={gearName}
          isVideo={false}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </>
  );
}
