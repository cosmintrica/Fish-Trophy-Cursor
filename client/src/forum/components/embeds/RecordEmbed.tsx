/**
 * Record Embed Component
 * Displays a compact, clickable card for a record embedded in forum posts
 */

import React, { useEffect, useState } from 'react';
import { Trophy, Scale, Ruler, MapPin, Calendar, User, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchRecordEmbedData, type RecordEmbedData } from '../../services/embedDataService';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import ImageZoom from '../ImageZoom';

interface RecordEmbedProps {
  recordId: string;
}

// Helper to detect dark mode (works outside React context)
const getIsDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark') ||
         window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export default function RecordEmbed({ recordId }: RecordEmbedProps) {
  const [isDarkMode, setIsDarkMode] = useState(getIsDarkMode());
  const [data, setData] = useState<RecordEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedMedia, setZoomedMedia] = useState<{ src: string; isVideo: boolean; index: number } | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
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
        const recordData = await fetchRecordEmbedData(recordId);
        if (isMounted) {
          setData(recordData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Eroare la încărcarea recordului');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [recordId]);

  if (loading) {
    return (
      <div className="bbcode-record-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: isDarkMode ? '#1e293b' : '#f3f4f6',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '0.5rem',
        fontSize: isMobile ? '0.75rem' : '0.875rem',
        color: isDarkMode ? '#94a3b8' : '#6b7280'
      }}>
        Se încarcă recordul...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bbcode-record-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '0.5rem',
        color: '#dc2626',
        fontSize: isMobile ? '0.75rem' : '0.875rem'
      }}>
        {error || 'Recordul nu a fost găsit'}
      </div>
    );
  }

  // Build all media items
  const allMedia: Array<{ type: 'image' | 'video'; url: string }> = [];
  if (data.image_url) allMedia.push({ type: 'image', url: data.image_url });
  if (data.extra_images) {
    data.extra_images.forEach(url => allMedia.push({ type: 'image', url }));
  }
  if (data.video_url) allMedia.push({ type: 'video', url: data.video_url });

  const recordUrl = data.user_username 
    ? `/profile/${data.user_username}#record-${data.id}`
    : `/records#record-${data.id}`;

  const currentMedia = allMedia[currentMediaIndex];
  const hasMultipleMedia = allMedia.length > 1;

  return (
    <>
      <div className="bbcode-record-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: isDarkMode ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '0.5rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '0.5rem' : '0.75rem',
        maxWidth: '100%',
        boxShadow: isDarkMode ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Media Gallery */}
        {currentMedia && (
          <div style={{
            width: isMobile ? '100%' : '140px',
            height: isMobile ? 'auto' : '105px',
            aspectRatio: isMobile ? '16/9' : undefined,
            flexShrink: 0,
            overflow: 'hidden',
            background: '#f3f4f6',
            position: 'relative',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
          onClick={() => {
            setZoomedMedia({ src: getR2ImageUrlProxy(currentMedia.url), isVideo: currentMedia.type === 'video', index: currentMediaIndex });
          }}
          >
            {currentMedia.type === 'image' ? (
              <img
                src={getR2ImageUrlProxy(currentMedia.url)}
                alt={data.species_name}
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
            ) : (
              <video
                src={getR2ImageUrlProxy(currentMedia.url)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                muted
                playsInline
              />
            )}
            {currentMedia.type === 'video' && (
              <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                fontWeight: '500'
              }}>
                📹
              </div>
            )}
            {hasMultipleMedia && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
                  }}
                  style={{
                    position: 'absolute',
                    left: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    zIndex: 10
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIndex((prev) => (prev + 1) % allMedia.length);
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    zIndex: 10
                  }}
                >
                  <ChevronRight size={14} />
                </button>
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.625rem',
                  fontWeight: '500'
                }}>
                  {currentMediaIndex + 1}/{allMedia.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Content Section */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          minWidth: 0
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <Trophy style={{ width: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? '0.75rem' : '0.875rem', color: '#f59e0b', flexShrink: 0 }} />
            <span style={{
              fontWeight: '600',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: isDarkMode ? '#f1f5f9' : '#111827'
            }}>
              {data.species_name}
            </span>
            {data.scientific_name && (
              <span style={{
                fontSize: isMobile ? '0.625rem' : '0.75rem',
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                fontStyle: 'italic'
              }}>
                {data.scientific_name}
              </span>
            )}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
            flexWrap: 'wrap',
            fontSize: isMobile ? '0.6875rem' : '0.8125rem',
            color: isDarkMode ? '#cbd5e1' : '#374151'
          }}>
            {data.weight && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Scale style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span><strong>{data.weight}</strong> kg</span>
              </div>
            )}
            {data.length && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Ruler style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span><strong>{data.length}</strong> cm</span>
              </div>
            )}
            {data.location_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span style={{ maxWidth: isMobile ? '120px' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.location_name}</span>
              </div>
            )}
            {data.date_caught && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span>{new Date(data.date_caught).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* User & Link */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
            marginTop: '0.125rem',
            flexWrap: 'wrap'
          }}>
            {data.user_display_name && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: isMobile ? '0.6875rem' : '0.8125rem',
                color: isDarkMode ? '#94a3b8' : '#6b7280'
              }}>
                <User style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem' }} />
                <span>{data.user_display_name}</span>
              </div>
            )}
            <a
              href={recordUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: isMobile ? '0.6875rem' : '0.8125rem',
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Vezi record
              <ExternalLink style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem' }} />
            </a>
          </div>
        </div>
      </div>

      {/* Media Zoom Modal */}
      {zoomedMedia && (
        <ImageZoom
          src={zoomedMedia.src}
          alt={data.species_name}
          isVideo={zoomedMedia.isVideo}
          onClose={() => setZoomedMedia(null)}
          onPrev={allMedia.length > 1 ? () => {
            const newIndex = (zoomedMedia.index - 1 + allMedia.length) % allMedia.length;
            setZoomedMedia({ src: getR2ImageUrlProxy(allMedia[newIndex].url), isVideo: allMedia[newIndex].type === 'video', index: newIndex });
          } : undefined}
          onNext={allMedia.length > 1 ? () => {
            const newIndex = (zoomedMedia.index + 1) % allMedia.length;
            setZoomedMedia({ src: getR2ImageUrlProxy(allMedia[newIndex].url), isVideo: allMedia[newIndex].type === 'video', index: newIndex });
          } : undefined}
        />
      )}
    </>
  );
}
