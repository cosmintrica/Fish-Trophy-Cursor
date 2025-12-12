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
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 0, y: 0 });

  // Sync refs with state for performance
  useEffect(() => {
    scaleRef.current = scale;
    positionRef.current = position;
  }, [scale, position]);

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      scaleRef.current = 1;
      positionRef.current = { x: 0, y: 0 };
    }
  }, [isOpen]);

  // GPU-optimized update function
  const updateTransform = useCallback(() => {
    if (mediaRef.current) {
      const transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0) scale3d(${scaleRef.current}, ${scaleRef.current}, 1)`;
      mediaRef.current.style.transform = transform;
    }
  }, []);

  // Handle wheel zoom (desktop) - GPU optimized
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isOpen) return;
    e.preventDefault();
    
    const zoomSpeed = 0.003;
    const delta = e.deltaY * -zoomSpeed;
    const currentScale = scaleRef.current;
    const newScale = Math.min(Math.max(currentScale + delta, 0.5), 8);
    
    scaleRef.current = newScale;
    setScale(newScale);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(updateTransform);
  }, [isOpen, updateTransform]);

  // Handle click zoom (double tap on mobile, single click on desktop)
  const handleMediaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) {
      const currentScale = scaleRef.current;
      const newScale = currentScale === 1 ? 3 : 1;
      scaleRef.current = newScale;
      setScale(newScale);
      if (newScale === 1) {
        positionRef.current = { x: 0, y: 0 };
        setPosition({ x: 0, y: 0 });
      }
      requestAnimationFrame(updateTransform);
    }
  }, [updateTransform]);

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
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - positionRef.current.x,
        y: e.touches[0].clientY - positionRef.current.y
      });
    }
  }, []);

  // Handle touch move for pinch zoom and pan - GPU optimized
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const currentScale = scaleRef.current;
        const newScale = Math.min(Math.max(currentScale * scaleChange, 0.5), 8);
        scaleRef.current = newScale;
        setScale(newScale);
        requestAnimationFrame(updateTransform);
      }
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && scaleRef.current > 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      if (mediaRef.current && containerRef.current) {
        const mediaRect = mediaRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const maxX = (mediaRect.width * scaleRef.current - containerRect.width) / 2;
        const maxY = (mediaRect.height * scaleRef.current - containerRect.height) / 2;
        
        const constrainedX = Math.max(-maxX, Math.min(maxX, newX));
        const constrainedY = Math.max(-maxY, Math.min(maxY, newY));
        
        positionRef.current = { x: constrainedX, y: constrainedY };
        setPosition({ x: constrainedX, y: constrainedY });
        requestAnimationFrame(updateTransform);
      }
    }
  }, [isPinching, isDragging, lastTouchDistance, dragStart, updateTransform]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    setIsDragging(false);
    setLastTouchDistance(0);
  }, []);

  // Handle mouse drag (desktop) - GPU optimized
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scaleRef.current > 1 && e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scaleRef.current > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      if (mediaRef.current && containerRef.current) {
        const mediaRect = mediaRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const maxX = (mediaRect.width * scaleRef.current - containerRect.width) / 2;
        const maxY = (mediaRect.height * scaleRef.current - containerRect.height) / 2;
        
        const constrainedX = Math.max(-maxX, Math.min(maxX, newX));
        const constrainedY = Math.max(-maxY, Math.min(maxY, newY));
        
        positionRef.current = { x: constrainedX, y: constrainedY };
        setPosition({ x: constrainedX, y: constrainedY });
        requestAnimationFrame(updateTransform);
      }
    }
  }, [isDragging, dragStart, updateTransform]);

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

  // Update transform on scale/position change
  useEffect(() => {
    updateTransform();
  }, [scale, position, updateTransform]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center"
      onClick={(e) => {
        // Close on backdrop click - only if click is directly on container, not on media
        const target = e.target as HTMLElement;
        if (target === containerRef.current || (target.classList.contains('zoom-backdrop') && !target.closest('img, video'))) {
          onClose();
        }
      }}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
        willChange: 'contents'
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-opacity duration-200 touch-manipulation"
        aria-label="Închide zoom"
        style={{ willChange: 'opacity' }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Zoom indicator */}
      {scale !== 1 && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-semibold">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Media container - GPU optimized */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden zoom-backdrop"
        style={{ 
          touchAction: 'none',
          willChange: 'transform'
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          // If click is on the container itself (not on media), close
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {type === 'image' ? (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={src}
            alt={alt}
            className={`max-w-full max-h-full object-contain select-none ${className}`}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale3d(${scale}, ${scale}, 1)`,
              transformOrigin: 'center center',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              perspective: 1000,
              WebkitBackfaceVisibility: 'hidden',
              imageRendering: scale > 2 ? 'crisp-edges' : 'auto',
              cursor,
              transition: 'none', // No CSS transitions for maximum performance
              pointerEvents: 'auto' // Re-enable pointer events on media
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent backdrop click
              handleMediaClick(e);
            }}
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
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale3d(${scale}, ${scale}, 1)`,
              transformOrigin: 'center center',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              perspective: 1000,
              WebkitBackfaceVisibility: 'hidden',
              cursor,
              transition: 'none', // No CSS transitions for maximum performance
              pointerEvents: 'auto' // Re-enable pointer events on media
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent backdrop click
              handleMediaClick(e);
            }}
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-3 rounded-xl text-sm text-center">
          <span className="hidden sm:inline">🖱️ Scroll sau dublu-click pentru zoom • Click în afara pentru închidere</span>
          <span className="sm:hidden">👆 Pinch sau dublu-tap pentru zoom • Tap în afara pentru închidere</span>
        </div>
      )}
    </div>
  );
};
