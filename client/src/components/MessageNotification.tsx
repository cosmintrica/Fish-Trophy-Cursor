import { useEffect } from 'react';
import { X } from 'lucide-react';

interface MessageNotificationProps {
  senderName: string;
  senderAvatar?: string;
  onClick: () => void;
  onClose: () => void;
  duration?: number;
}

export function MessageNotification({
  senderName,
  senderAvatar,
  onClick,
  onClose,
  duration = 5000
}: MessageNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={handleClick}
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 w-[260px] sm:w-[300px] bg-white rounded-lg shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-200"
      style={{
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <div className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {senderAvatar ? (
              <img
                src={senderAvatar}
                alt={senderName}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-blue-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-blue-100">
                        <span class="text-white text-sm font-semibold">${senderName.charAt(0).toUpperCase()}</span>
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-blue-100">
                <span className="text-white text-sm font-semibold">{senderName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
              Mesaj nou
            </div>
            <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">
              {senderName}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
            aria-label="Închide"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

