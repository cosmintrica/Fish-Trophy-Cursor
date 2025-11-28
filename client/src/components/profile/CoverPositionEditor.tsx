import { useState, useRef, useEffect } from 'react';
import { Move, ZoomIn, ZoomOut, RotateCw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoverPositionEditorProps {
  coverUrl: string;
  onSave: (position: { x: number; y: number; scale: number; rotation: number }) => void;
  onCancel: () => void;
}

export const CoverPositionEditor = ({ coverUrl, onSave, onCancel }: CoverPositionEditorProps) => {
  const [position, setPosition] = useState({ x: 50, y: 50 }); // Percentage
  const [scale, setScale] = useState(100); // Percentage
  const [rotation, setRotation] = useState(0); // Degrees
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(200, prev + 10));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(50, prev - 10));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Poziționează cover-ul</h3>
            <div className="flex gap-2">
              <Button onClick={onCancel} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Anulează
              </Button>
              <Button onClick={() => onSave({ ...position, scale, rotation })} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Salvează
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Drag pentru a muta</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                disabled={scale <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[60px] text-center">{scale}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                disabled={scale >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <div className="ml-auto text-sm text-gray-600">
              Rotire: {rotation}°
            </div>
          </div>

          {/* Preview */}
          <div
            ref={containerRef}
            className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div
              ref={imageRef}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${coverUrl})`,
                backgroundPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.2s'
              }}
            />
            <div className="absolute inset-0 border-2 border-blue-500 border-dashed pointer-events-none" />
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              X: {position.x.toFixed(1)}% Y: {position.y.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

