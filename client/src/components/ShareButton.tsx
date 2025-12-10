/**
 * ShareButton - Component pentru share pe social media
 * Suportă: Facebook, Twitter, WhatsApp, LinkedIn, Copy Link
 */

import { useState } from 'react';
import { Share2, Facebook, Twitter, MessageCircle, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export default function ShareButton({
  url,
  title,
  description = '',
  image = 'https://fishtrophy.ro/social-media-banner-v2.jpg',
  size = 'md',
  variant = 'default',
  showLabel = false
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `https://fishtrophy.ro${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || title);
  const encodedImage = encodeURIComponent(image);

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600 hover:bg-blue-50',
      onClick: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        );
        setShowMenu(false);
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400 hover:bg-blue-50',
      onClick: () => {
        window.open(
          `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
          '_blank',
          'width=600,height=400'
        );
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
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        );
        setShowMenu(false);
      }
    },
    {
      name: 'Copiază link',
      icon: copied ? Check : LinkIcon,
      color: 'text-gray-600 hover:bg-gray-50',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(fullUrl);
          setCopied(true);
          toast.success('Link copiat în clipboard!');
          setTimeout(() => setCopied(false), 2000);
          setShowMenu(false);
        } catch (err) {
          toast.error('Nu s-a putut copia link-ul.');
        }
      }
    }
  ];

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100'
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg flex items-center justify-center transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label="Share"
      >
        <Share2 size={iconSizes[size]} />
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={option.onClick}
                  className={`
                    w-full px-4 py-2 text-left flex items-center gap-3
                    ${option.color}
                    hover:bg-gray-50 transition-colors
                  `}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{option.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

