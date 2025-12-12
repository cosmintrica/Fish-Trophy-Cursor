import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface MediaZoomViewerProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  type?: 'image' | 'video';
  className?: string;
}

export const MediaZoomViewer: React.FC<MediaZoomViewerProps> = ({
  isOpen,
  onClose,
  src,
  alt = '',
  type = 'image',
  className = ''
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle wheel zoom (desktop)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isOpen) return;
    e.preventDefault();
    
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(scale + delta, 0.5), 5);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setScale(newScale);
    });
  }, [isOpen, scale]);

  // Handle click zoom (double tap on mobile, single click on desktop)
  const handleMediaClick = useCallback((e: React.MouseEvent) => {
    if (e.detail === 2 || scale === 1) {
      // Double click or single click when zoomed out
      const newScale = scale === 1 ? 2 : 1;
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  }, [scale]);

  // Handle touch start for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && scale > 1) {
      // Single touch drag when zoomed
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  }, [scale, position]);

  // Handle touch move for pinch zoom and pan
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && isPinching) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.min(Math.max(scale * scaleChange, 0.5), 5);
        setScale(newScale);
      }
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan when zoomed
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      // Constrain to bounds
      if (mediaRef.current && containerRef.current) {
        const mediaRect = mediaRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const maxX = (mediaRect.width * scale - containerRect.width) / 2;
        const maxY = (mediaRect.height * scale - containerRect.height) / 2;
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      }
    }
  }, [isPinching, isDragging, lastTouchDistance, scale, dragStart]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    setIsDragging(false);
    setLastTouchDistance(0);
  }, []);

  // Handle mouse drag (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1 && e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      if (mediaRef.current && containerRef.current) {
        const mediaRect = mediaRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const maxX = (mediaRect.width * scale - containerRect.width) / 2;
        const maxY = (mediaRect.height * scale - containerRect.height) / 2;
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      }
    }
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add wheel event listener
  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('wheel', handleWheel);
        }
      };
    }
  }, [isOpen, handleWheel]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const transform = `translate(${position.x}px, ${position.y}px) scale(${scale})`;
  const cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === containerRef.current) {
          onClose();
        }
      }}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors touch-manipulation"
        aria-label="Închide zoom"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Zoom indicator */}
      {scale !== 1 && (
        <div className="absolute top-4 left-4 z-10 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Media container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      >
        {type === 'image' ? (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={src}
            alt={alt}
            className={`max-w-full max-h-full object-contain select-none ${className}`}
            style={{
              transform,
              transformOrigin: 'center center',
              willChange: 'transform',
              transition: isDragging || isPinching ? 'none' : 'transform 0.1s ease-out',
              cursor
            }}
            onClick={handleMediaClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            draggable={false}
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={src}
            className={`max-w-full max-h-full object-contain select-none ${className}`}
            style={{
              transform,
              transformOrigin: 'center center',
              willChange: 'transform',
              transition: isDragging || isPinching ? 'none' : 'transform 0.1s ease-out',
              cursor
            }}
            onClick={handleMediaClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            controls
            playsInline
            muted
            draggable={false}
          />
        )}
      </div>

      {/* Instructions (only show on first zoom) */}
      {scale === 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm text-center">
          <span className="hidden sm:inline">Scroll sau dublu-click pentru zoom • Click în afara pentru închidere</span>
          <span className="sm:hidden">Atinge pentru zoom • Atinge în afara pentru închidere</span>
        </div>
      )}
    </div>
  );
};

