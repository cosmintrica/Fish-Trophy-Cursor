import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />,
    error: <XCircle style={{ width: '1.25rem', height: '1.25rem' }} />,
    info: <Info style={{ width: '1.25rem', height: '1.25rem' }} />,
    warning: <AlertCircle style={{ width: '1.25rem', height: '1.25rem' }} />
  };

  const colors = {
    success: { bg: '#10b981', border: '#059669', icon: '#ffffff' },
    error: { bg: '#ef4444', border: '#dc2626', icon: '#ffffff' },
    info: { bg: '#3b82f6', border: '#2563eb', icon: '#ffffff' },
    warning: { bg: '#f59e0b', border: '#d97706', icon: '#ffffff' }
  };

  const color = colors[type];

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'all 0.3s ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <div
        style={{
          backgroundColor: color.bg,
          border: `2px solid ${color.border}`,
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minWidth: '300px',
          maxWidth: '500px',
          color: color.icon
        }}
      >
        <div style={{ flexShrink: 0 }}>
          {icons[type]}
        </div>
        <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500', lineHeight: '1.5' }}>
          {message}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            color: color.icon,
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.25rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X style={{ width: '1rem', height: '1rem' }} />
        </button>
      </div>
    </div>
  );
}

// Hook pentru gestionarea toast-urilor
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}

