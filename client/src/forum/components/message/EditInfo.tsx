/**
 * Component pentru afișarea informațiilor despre editare
 * Format: "Ultima modificare făcută de [user]; [data] la [ora]. Motiv: [motiv]"
 * Exact ca în screenshot: ora în roșu, restul text normal
 */

import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface EditInfoProps {
  editedAt?: string;
  editedByUsername?: string;
  editReason?: string;
}

export default function EditInfo({ editedAt, editedByUsername, editReason }: EditInfoProps) {
  const { theme } = useTheme();

  if (!editedAt) return null;

  // Format smart: dacă e azi → doar ora, dacă > 24h → data + ora (FĂRĂ secunde)
  const formatSmartDateTime = (dateString: string) => {
    if (!dateString) return { date: '', time: '' };
    const date = new Date(dateString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    if (isToday) {
      // Dacă e azi → doar ora
      return { date: '', time };
    } else {
      // Dacă > 24h → data + ora
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return { date: `${day}.${month}.${year}`, time };
    }
  };

  const { date, time } = formatSmartDateTime(editedAt);
  const displayUsername = editedByUsername || 'Utilizator necunoscut';

  return (
    <div style={{
      fontSize: '0.75rem',
      color: theme.textSecondary,
      marginTop: '0.5rem',
      paddingTop: '0.5rem',
      borderTop: `1px solid ${theme.border}`,
      fontStyle: 'italic'
    }}>
      Ultima modificare făcută de{' '}
      {editedByUsername ? (
        <Link
          to={`/forum/user/${encodeURIComponent(editedByUsername)}`}
          style={{
            color: theme.primary,
            textDecoration: 'none',
            fontStyle: 'italic',
            fontWeight: '500',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {displayUsername}
        </Link>
      ) : (
        <span style={{ fontStyle: 'italic' }}>{displayUsername}</span>
      )}
      ; {date && `${date} la `}
      <span style={{ color: '#dc2626' }}>{time}</span>
      {editReason && (
        <>
          . Motiv: {editReason}
        </>
      )}
    </div>
  );
}
