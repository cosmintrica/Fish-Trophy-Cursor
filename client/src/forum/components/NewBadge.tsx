/**
 * Badge "Nou" pentru mesajele necitite
 * Design ca ribbon care vine din spatele cardului, culoare albastră ca header-ul topicurilor
 */

interface NewBadgeProps {
  style?: React.CSSProperties;
  className?: string;
  isMobile?: boolean;
}

export default function NewBadge({ style = {}, className, isMobile = false }: NewBadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: '#2563eb', // Blue like topic headers
        color: 'white',
        padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
        fontSize: isMobile ? '0.625rem' : '0.75rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        lineHeight: '1',
        borderRadius: '0.25rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        ...style
      }}
    >
      Nou
    </span>
  );
}

