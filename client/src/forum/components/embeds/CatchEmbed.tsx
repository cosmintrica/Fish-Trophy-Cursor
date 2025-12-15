/**
 * Catch Embed Component
 * Displays a compact, clickable card for a catch embedded in forum posts
 */

import React, { useEffect, useState } from 'react';
import { Fish, Scale, Ruler, MapPin, Calendar, User, ExternalLink } from 'lucide-react';
import { fetchCatchEmbedData, type CatchEmbedData } from '../../services/embedDataService';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import ImageZoom from '../ImageZoom';

interface CatchEmbedProps {
  catchId: string;
}

// Helper to detect dark mode (works outside React context)
const getIsDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export default function CatchEmbed({ catchId }: CatchEmbedProps) {
  const [isDarkMode, setIsDarkMode] = useState(getIsDarkMode());
  const [data, setData] = useState<CatchEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedMedia, setZoomedMedia] = useState<{ src: string; isVideo: boolean } | null>(null);
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
        const catchData = await fetchCatchEmbedData(catchId);
        if (isMounted) {
          setData(catchData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Eroare la încărcarea capturii');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [catchId]);

  if (loading) {
    return (
      <div className="bbcode-catch-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: isDarkMode ? '#1e293b' : '#f3f4f6',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '0.5rem',
        fontSize: isMobile ? '0.75rem' : '0.875rem',
        color: isDarkMode ? '#94a3b8' : '#6b7280'
      }}>
        Se încarcă captura...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bbcode-catch-embed" style={{
        margin: '0.25rem 0',
        padding: isMobile ? '0.5rem' : '0.75rem',
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '0.5rem',
        color: '#dc2626',
        fontSize: isMobile ? '0.75rem' : '0.875rem'
      }}>
        {error || 'Captura nu a fost găsită'}
      </div>
    );
  }

  const catchUrl = data.user_username
    ? `/profile/${data.user_username}#catch-${data.id}`
    : `/profile/${data.id}#catch-${data.id}`;

  return (
    <>
      <div className="bbcode-catch-embed" style={{
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
        {/* Thumbnail Image/Video */}
        {(data.photo_url || data.video_url) && (
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
              if (data.photo_url) {
                setZoomedMedia({ src: getR2ImageUrlProxy(data.photo_url), isVideo: false });
              } else if (data.video_url) {
                const isYouTube = data.video_url.includes('youtube.com') || data.video_url.includes('youtu.be');
                setZoomedMedia({ src: getR2ImageUrlProxy(data.video_url), isVideo: true }); // We'll handle youtube in ImageZoom or similar if needed, but for now just pass as video. 
                // Actually, ImageZoom treats isVideo as HTML5 video. We might need to handle YouTube there too.
              }
            }}
          >
            {data.photo_url ? (
              <img
                src={getR2ImageUrlProxy(data.photo_url)}
                alt={data.species_name || 'Captură'}
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
            ) : data.video_url ? (
              (data.video_url.includes('youtube.com') || data.video_url.includes('youtu.be')) ? (
                <div className="w-full h-full bg-slate-900 relative">
                  <img
                    src={`https://img.youtube.com/vi/${(() => {
                      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                      const match = data.video_url?.match(regExp);
                      return (match && match[2].length === 11) ? match[2] : '';
                    })()}/hqdefault.jpg`}
                    alt="YouTube thumbnail"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  src={getR2ImageUrlProxy(data.video_url)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  muted
                  playsInline
                />
              )
            ) : null}
            {data.video_url && (
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
            <Fish style={{ width: isMobile ? '0.75rem' : '0.875rem', height: isMobile ? '0.75rem' : '0.875rem', color: '#3b82f6', flexShrink: 0 }} />
            <span style={{
              fontWeight: '600',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: isDarkMode ? '#f1f5f9' : '#111827'
            }}>
              {data.species_name || 'Necunoscut'}
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
            {data.length_cm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Ruler style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span><strong>{data.length_cm}</strong> cm</span>
              </div>
            )}
            {data.location_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span style={{ maxWidth: isMobile ? '120px' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.location_name}</span>
              </div>
            )}
            {data.captured_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
                <span>{new Date(data.captured_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
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
              href={catchUrl}
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
              Vezi captură
              <ExternalLink style={{ width: isMobile ? '0.625rem' : '0.75rem', height: isMobile ? '0.625rem' : '0.75rem' }} />
            </a>
          </div>
        </div>
      </div>

      {/* Media Zoom Modal */}
      {zoomedMedia && (
        <ImageZoom
          src={zoomedMedia.src}
          alt={data.species_name || 'Captură'}
          isVideo={zoomedMedia.isVideo}
          onClose={() => setZoomedMedia(null)}
        />
      )}
    </>
  );
}
