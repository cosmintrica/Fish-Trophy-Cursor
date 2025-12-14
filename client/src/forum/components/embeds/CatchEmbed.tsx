/**
 * Catch Embed Component
 * Displays a compact, clickable card for a catch embedded in forum posts
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Scale, Ruler, MapPin, Calendar, User, ExternalLink } from 'lucide-react';
import { fetchCatchEmbedData, type CatchEmbedData } from '../../services/embedDataService';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface CatchEmbedProps {
  catchId: string;
}

export default function CatchEmbed({ catchId }: CatchEmbedProps) {
  const { isDarkMode } = useTheme();
  const [data, setData] = useState<CatchEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const catchData = await fetchCatchEmbedData(catchId);
        
        if (isMounted) {
          if (catchData) {
            setData(catchData);
          } else {
            setError('Captura nu a fost găsită');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Eroare la încărcarea capturii');
          console.error('Error loading catch embed:', err);
          console.error('Catch ID:', catchId);
        }
      } finally {
        if (isMounted) {
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
        margin: '1rem 0',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.02)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '120px'
      }}>
        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Se încarcă captura...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bbcode-catch-embed" style={{
        margin: '1rem 0',
        padding: '1rem',
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '0.5rem',
        color: '#dc2626',
        fontSize: '0.875rem'
      }}>
        {error || 'Captura nu a fost găsită'}
      </div>
    );
  }

  // Build URL to catch on main site
  const catchUrl = data.user_username 
    ? `/profile/${data.user_username}#catch-${data.id}`
    : `/profile/${data.id}#catch-${data.id}`;

  return (
    <div className="bbcode-catch-embed" style={{
      margin: '1rem 0',
      padding: '0',
      background: isDarkMode ? '#1e293b' : '#ffffff',
      border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '100%',
      boxShadow: isDarkMode ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Image/Video Section */}
      {data.photo_url && (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          overflow: 'hidden',
          background: '#f3f4f6',
          position: 'relative'
        }}>
          <img
            src={data.photo_url}
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
          {data.video_url && (
            <div style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.5rem',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span>📹</span>
              <span>Video</span>
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div style={{
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {/* Header with Fish Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.25rem'
        }}>
          <Fish style={{ width: '1rem', height: '1rem', color: '#3b82f6', flexShrink: 0 }} />
          <span style={{
            fontWeight: '600',
            fontSize: '0.875rem',
            color: isDarkMode ? '#f1f5f9' : '#111827'
          }}>
            Captură: {data.species_name || 'Necunoscut'}
          </span>
          {data.scientific_name && (
            <span style={{
              fontSize: '0.75rem',
              color: isDarkMode ? '#94a3b8' : '#6b7280',
              fontStyle: 'italic'
            }}>
              ({data.scientific_name})
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem',
          fontSize: '0.8125rem'
        }}>
          {data.weight && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              <Scale style={{ width: '0.875rem', height: '0.875rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
              <span><strong>{data.weight}</strong> kg</span>
            </div>
          )}
          {data.length_cm && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              <Ruler style={{ width: '0.875rem', height: '0.875rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
              <span><strong>{data.length_cm}</strong> cm</span>
            </div>
          )}
          {data.location_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              <MapPin style={{ width: '0.875rem', height: '0.875rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.location_name}
              </span>
            </div>
          )}
          {data.captured_at && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              <Calendar style={{ width: '0.875rem', height: '0.875rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
              <span>{new Date(data.captured_at).toLocaleDateString('ro-RO')}</span>
            </div>
          )}
        </div>

        {/* User Info */}
        {data.user_display_name && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            color: isDarkMode ? '#94a3b8' : '#6b7280',
            marginTop: '0.25rem',
            paddingTop: '0.5rem',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
          }}>
            <User style={{ width: '0.875rem', height: '0.875rem' }} />
            <span>{data.user_display_name}</span>
          </div>
        )}

        {/* Link to Full Catch */}
        <Link
          to={catchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: '#3b82f6',
            color: 'white',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontSize: '0.8125rem',
            fontWeight: '500',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6';
          }}
        >
          <span>Vezi captura completă</span>
          <ExternalLink style={{ width: '0.875rem', height: '0.875rem' }} />
        </Link>
      </div>
    </div>
  );
}

