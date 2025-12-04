/**
 * Read Status Marker Component
 * Marker vizual pentru status-ul read/unread folosind iconread.png
 * Colorat când sunt mesaje necitite, greyed când sunt toate citite
 */

interface ReadStatusMarkerProps {
  hasUnread: boolean;
  size?: number; // Dacă nu e specificat, folosește 90-95% din înălțimea row-ului
  className?: string;
  style?: React.CSSProperties;
}

export default function ReadStatusMarker({ 
  hasUnread, 
  size,
  className,
  style = {} 
}: ReadStatusMarkerProps) {
  // Dacă size nu e specificat, folosim 90-95% din înălțimea row-ului (cam 50-55px pentru topic/subcategorie)
  const defaultSize = size || 52;
  
  return (
    <img
      src="/iconread.png"
      alt={hasUnread ? 'Mesaje necitite' : 'Toate mesajele citite'}
      className={className}
      style={{
        width: `${defaultSize}px`,
        height: `${defaultSize}px`,
        objectFit: 'contain',
        filter: hasUnread ? 'none' : 'grayscale(100%) opacity(0.5)',
        transition: 'filter 0.2s ease',
        flexShrink: 0,
        ...style
      }}
    />
  );
}

