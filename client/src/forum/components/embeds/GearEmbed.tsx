/**
 * Gear Embed Component
 * Displays a compact, clickable card for gear embedded in forum posts
 */

import React, { useEffect, useState } from 'react';
import { Wrench, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { fetchGearEmbedData, type GearEmbedData } from '../../services/embedDataService';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface GearEmbedProps {
  gearId: string;
}

export default function GearEmbed({ gearId }: GearEmbedProps) {
  const { isDarkMode } = useTheme();
  const [data, setData] = useState<GearEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const gearData = await fetchGearEmbedData(gearId);
        
        if (isMounted) {
          if (gearData) {
            setData(gearData);
          } else {
            setError('Echipamentul nu a fost găsit');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Eroare la încărcarea echipamentului');
          console.error('Error loading gear embed:', err);
          console.error('Gear ID:', gearId);
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
  }, [gearId]);

  if (loading) {
    return (
      <div className="bbcode-gear-embed" style={{
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
        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Se încarcă echipamentul...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bbcode-gear-embed" style={{
        margin: '1rem 0',
        padding: '1rem',
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '0.5rem',
        color: '#dc2626',
        fontSize: '0.875rem'
      }}>
        {error || 'Echipamentul nu a fost găsit'}
      </div>
    );
  }

  return (
    <div className="bbcode-gear-embed" style={{
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
      {/* Image Section */}
      {data.image_url && (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          overflow: 'hidden',
          background: '#f3f4f6',
          position: 'relative'
        }}>
          <img
            src={data.image_url}
            alt={data.name}
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

      {/* Content Section */}
      <div style={{
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {/* Header with Wrench Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.25rem'
        }}>
          <Wrench style={{ width: '1rem', height: '1rem', color: '#8b5cf6', flexShrink: 0 }} />
          <span style={{
            fontWeight: '600',
            fontSize: '0.875rem',
            color: isDarkMode ? '#f1f5f9' : '#111827'
          }}>
            {data.name}
          </span>
        </div>

        {/* Brand/Model */}
        {(data.brand || data.model) && (
          <div style={{
            fontSize: '0.8125rem',
            color: isDarkMode ? '#94a3b8' : '#6b7280'
          }}>
            {data.brand && <span>{data.brand}</span>}
            {data.brand && data.model && <span> • </span>}
            {data.model && <span>{data.model}</span>}
          </div>
        )}

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem',
          fontSize: '0.8125rem'
        }}>
          {data.price && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              <DollarSign style={{ width: '0.875rem', height: '0.875rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
              <span><strong>{data.price}</strong> RON</span>
            </div>
          )}
          {data.purchase_date && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              <Calendar style={{ width: '0.875rem', height: '0.875rem', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
              <span>{new Date(data.purchase_date).toLocaleDateString('ro-RO')}</span>
            </div>
          )}
        </div>

        {/* Category */}
        {data.category && (
          <div style={{
            fontSize: '0.75rem',
            color: isDarkMode ? '#94a3b8' : '#6b7280',
            paddingTop: '0.25rem',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
          }}>
            Categorie: {data.category}
          </div>
        )}

        {/* Description (truncated) */}
        {data.description && (
          <div style={{
            fontSize: '0.8125rem',
            color: isDarkMode ? '#cbd5e1' : '#374151',
            lineHeight: '1.5',
            maxHeight: '3rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
}

