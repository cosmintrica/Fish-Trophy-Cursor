/**
 * ShareButton - Component pentru share pe social media
 * Suportă: Facebook, Twitter, WhatsApp, LinkedIn, Copy Link
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Facebook, MessageCircle, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';

// Helper to check if element is in a modal
const isInModal = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  let current: HTMLElement | null = element;
  while (current) {
    // Check for modal indicators
    if (
      current.classList.contains('fixed') &&
      (current.style.zIndex || getComputedStyle(current).zIndex) &&
      parseInt(getComputedStyle(current).zIndex) >= 100
    ) {
      return true;
    }
    // Also check for modal-like containers
    if (current.classList.contains('modal') || current.getAttribute('role') === 'dialog') {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};
// X logo pentru Twitter (X)
const XIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'full';
  showLabel?: boolean;
  className?: string; // Allow custom className for matching other buttons
}

export default function ShareButton({
  url,
  title,
  description = '',
  image = 'https://fishtrophy.ro/social-media-banner-v2.jpg',
  size = 'md',
  variant = 'default',
  showLabel = false,
  className = ''
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullUrl = url.startsWith('http') ? url : `https://fishtrophy.ro${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || title);
  const encodedImage = encodeURIComponent(image);

  // Window features for desktop only (mobile doesn't support popup windows)
  // Detect mobile at click time, not at render time
  const getWindowFeatures = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined;
    const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    if (isMobile) {
      return undefined; // Mobile: no features, just open in new tab
    }
    return 'width=600,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes';
  };

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600 hover:bg-blue-50',
      onClick: () => {
        const features = getWindowFeatures();
        if (features) {
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            '_blank',
            features
          );
        } else {
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            '_blank'
          );
        }
        setShowMenu(false);
      }
    },
    {
      name: 'X (Twitter)',
      icon: XIcon,
      color: 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700',
      onClick: () => {
        const features = getWindowFeatures();
        if (features) {
          window.open(
            `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            '_blank',
            features
          );
        } else {
          window.open(
            `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            '_blank'
          );
        }
        setShowMenu(false);
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600 hover:bg-green-50',
      onClick: () => {
        const text = `${title}${description ? ` - ${description}` : ''} ${fullUrl}`;
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text)}`,
          '_blank'
        );
        setShowMenu(false);
      }
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'text-blue-700 hover:bg-blue-50',
      onClick: () => {
        const features = getWindowFeatures();
        if (features) {
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            '_blank',
            features
          );
        } else {
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            '_blank'
          );
        }
        setShowMenu(false);
      }
    },
    {
      name: 'Copiază link',
      icon: copied ? Check : LinkIcon,
      color: 'text-gray-600 hover:bg-gray-50',
      onClick: async () => {
        try {
          // Încearcă navigator.clipboard (nu funcționează pe toate mobile browsers)
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            toast.success('Link copiat în clipboard!');
            setTimeout(() => setCopied(false), 2000);
            setShowMenu(false);
          } else {
            // Fallback pentru mobile - creează input temporar
            const textArea = document.createElement('textarea');
            textArea.value = fullUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              setCopied(true);
              toast.success('Link copiat în clipboard!');
              setTimeout(() => setCopied(false), 2000);
              setShowMenu(false);
            } catch (err) {
              toast.error('Nu s-a putut copia link-ul.');
            }
            document.body.removeChild(textArea);
          }
        } catch (err) {
          // Fallback pentru mobile
          try {
            const textArea = document.createElement('textarea');
            textArea.value = fullUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            toast.success('Link copiat în clipboard!');
            setTimeout(() => setCopied(false), 2000);
            setShowMenu(false);
          } catch (fallbackErr) {
            toast.error('Nu s-a putut copia link-ul.');
          }
        }
      }
    }
  ];

  const sizeClasses = {
    sm: className ? '' : 'w-8 h-8', // Use className if provided, otherwise use default sizes
    md: className ? '' : 'w-10 h-10',
    lg: className ? '' : 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    outline: 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700',
    ghost: 'text-white hover:text-white bg-transparent border-none',
    full: 'w-full bg-blue-600 text-white hover:bg-blue-700 rounded-xl py-3 shadow-lg hover:shadow-xl transition-all font-bold gap-2' // Premium full width button
  };

  // When className is provided, use it fully and ignore variant styles
  const buttonClassName = className 
    ? className 
    : `${sizeClasses[size]} ${variantClasses[variant]} rounded-lg shadow-sm`;

  // No position calculation needed - using absolute positioning relative to container

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.share-button-container') && !target.closest('.share-menu-portal')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showMenu]);

  // Check if in modal - calculate directly in render to avoid async issues
  const inModal = buttonRef.current ? isInModal(buttonRef.current) : false;

  // Render menu content - shared between modal and portal
  const renderMenuContent = () => (
    <>
      {shareOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.name}
            onClick={option.onClick}
            className={`
              w-full px-4 py-2 text-left flex items-center gap-3
              ${option.color}
              hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors
            `}
          >
            <Icon size={18} />
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{option.name}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div ref={buttonRef} className="relative inline-block share-button-container">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`
          ${buttonClassName}
          flex items-center justify-center transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label="Share"
      >
        <Share2 size={className ? 20 : iconSizes[size]} />
        {/* Always show label for full variant, or if showLabel is true */}
        {(variant === 'full' || showLabel) && (
          <span className={variant === 'full' ? 'text-sm' : 'ml-2 text-sm font-medium'}>
            Distribuie
          </span>
        )}
      </button>

      {showMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setShowMenu(false)}
          />
          <div
            ref={menuRef}
            className="fixed z-[99999] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-1 w-48 share-menu-portal text-left"
            style={{
              top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().bottom + 4}px` : '0px',
              right: buttonRef.current ? `${document.documentElement.clientWidth - buttonRef.current.getBoundingClientRect().right}px` : '0px',
              left: 'auto'
            }}
          >
            {renderMenuContent()}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

