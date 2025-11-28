import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Save, X } from 'lucide-react';

interface InlineCoverEditorProps {
  coverUrl: string;
  initialPosition: { x: number; y: number; scale: number; rotation: number };
  onSave: (position: { x: number; y: number; scale: number; rotation: number }) => void;
  onCancel: () => void;
}

export const InlineCoverEditor = ({
  coverUrl,
  initialPosition,
  onSave,
  onCancel
}: InlineCoverEditorProps) => {
  const [position, setPosition] = useState({
    x: initialPosition.x,
    y: initialPosition.y,
    scale: Math.max(100, initialPosition.scale)
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const updatePosition = (newX: number, newY: number) => {
    setPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // INSTANT SCROLL BLOCK
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const percentX = (deltaX / rect.width) * 100 * 0.8;
    const percentY = (deltaY / rect.height) * 100 * 0.8;

    updatePosition(
      dragStartRef.current.startPosX - percentX,
      dragStartRef.current.startPosY - percentY
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    // INSTANT SCROLL RESTORE
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.userSelect = '';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // INSTANT SCROLL BLOCK
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';

    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;

    const percentX = (deltaX / rect.width) * 100 * 0.8;
    const percentY = (deltaY / rect.height) * 100 * 0.8;

    updatePosition(
      dragStartRef.current.startPosX - percentX,
      dragStartRef.current.startPosY - percentY
    );
  };

  const handleZoom = (delta: number) => {
    setPosition(prev => ({
      ...prev,
      scale: Math.max(100, Math.min(300, prev.scale + delta))
    }));
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -5 : 5;
    handleZoom(delta);
  };

  useEffect(() => {
    const handleMouseMoveWrapper = (e: MouseEvent) => handleMouseMove(e);
    const handleTouchMoveWrapper = (e: TouchEvent) => handleTouchMove(e);
    const handleWheelWrapper = (e: WheelEvent) => handleWheel(e);
    const handleMouseUpWrapper = () => handleMouseUp();

    const container = containerRef.current;

    if (container) {
      container.addEventListener('wheel', handleWheelWrapper, { passive: false });
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMoveWrapper, { passive: false });
      window.addEventListener('mouseup', handleMouseUpWrapper);
      window.addEventListener('touchmove', handleTouchMoveWrapper, { passive: false });
      window.addEventListener('touchend', handleMouseUpWrapper);
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheelWrapper);
      }
      window.removeEventListener('mousemove', handleMouseMoveWrapper);
      window.removeEventListener('mouseup', handleMouseUpWrapper);
      window.removeEventListener('touchmove', handleTouchMoveWrapper);
      window.removeEventListener('touchend', handleMouseUpWrapper);
    };
  }, [isDragging]);

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-move touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          backgroundImage: `url(${coverUrl})`,
          backgroundPosition: `${position.x}% ${position.y}%`,
          backgroundSize: `${position.scale}% auto`,
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => handleZoom(-10)}
          className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
          disabled={position.scale <= 100}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(10)}
          className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
          disabled={position.scale >= 300}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="bg-white/90 hover:bg-white backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
        >
          <X className="w-4 h-4 inline mr-1" />
          Anulează
        </button>
        <button
          onClick={() => onSave({ ...position, rotation: 0 })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
        >
          <Save className="w-4 h-4 inline mr-1" />
          Salvează
        </button>
      </div>
    </>
  );
};
