/**
 * Modal pentru afișarea echipamentelor utilizatorului
 */

import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface GearModalProps {
  authorName: string;
  gear: any[];
  isLoading: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export default function GearModal({ authorName, gear, isLoading, isMobile, onClose }: GearModalProps) {
  const { theme } = useTheme();

  // Calculăm numărul de coloane în funcție de numărul de echipamente
  const getColumnCount = (count: number) => {
    if (count <= 10) return 1;
    if (count <= 20) return 2;
    if (count <= 30) return 3;
    return Math.ceil(count / 10);
  };

  const columnCount = getColumnCount(gear.length);
  const itemsPerColumn = Math.ceil(gear.length / columnCount);

  // Împărțim echipamentele pe coloane
  const columns: any[][] = [];
  for (let i = 0; i < columnCount; i++) {
    columns.push(gear.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
  }

  // Formatăm tipul echipamentului
  const formatGearType = (type: string) => {
    const types: { [key: string]: string } = {
      'undita': 'Undiță',
      'mulineta': 'Mulinetă',
      'scaun': 'Scaun',
      'rucsac': 'Rucsac',
      'vesta': 'Vestă',
      'cizme': 'Cizme',
      'altceva': 'Altceva'
    };
    return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '1rem' : '2rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '0.75rem',
          padding: isMobile ? '1rem' : '1.5rem',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `2px solid ${theme.border}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: `1px solid ${theme.border}`
        }}>
          <h3 style={{
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: '600',
            color: theme.text
          }}>
            Echipamente - {authorName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Gear List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
            Se încarcă echipamentele...
          </div>
        ) : gear.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
            Nu există echipamente disponibile
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : `repeat(${columnCount}, 1fr)`,
            gap: '1rem'
          }}>
            {columns.map((column, colIndex) => (
              <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {column.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: theme.background,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: theme.text, marginBottom: '0.25rem' }}>
                      {formatGearType(item.gear_type)}
                    </div>
                    <div style={{ color: theme.text, marginBottom: '0.125rem' }}>
                      <span style={{ fontWeight: '500' }}>{item.brand}</span>
                      {item.model && <span style={{ color: theme.textSecondary }}> {item.model}</span>}
                    </div>
                    {item.quantity > 1 && (
                      <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                        Cantitate: {item.quantity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
