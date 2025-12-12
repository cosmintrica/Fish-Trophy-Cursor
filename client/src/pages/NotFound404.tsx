/**
 * Pagină 404 cu joc de pescuit pentru site-ul principal
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Fish } from 'lucide-react';

export default function NotFound404() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fishCaught, setFishCaught] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number>();
  const gameStateRef = useRef<any>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  // Load image once on mount
  useEffect(() => {
    const img = new Image();
    img.src = '/wood.jpg';
    img.onload = () => {
      backgroundImageRef.current = img;
      // Force a redraw if canvas is available and not playing
      if (canvasRef.current && !isPlaying) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = Math.min(900, window.innerWidth - 80);
      canvas.height = 500;
      // Redraw background on resize if not playing
      if (!isPlaying && backgroundImageRef.current) {
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      } else if (!isPlaying) {
        // Fallback gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(1, '#654321');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game state
    const gameState = {
      hook: { x: canvas.width / 2, y: 50, angle: 0, targetAngle: 0, speed: 0.03 },
      fish: [] as Array<{ x: number; y: number; size: number; speed: number; color: string }>,
      bubbles: [] as Array<{ x: number; y: number; size: number; speed: number }>,
      lineLength: 120,
      score: 0,
      mouseX: canvas.width / 2,
      mouseY: 50,
      lastFishSpawn: 0
    };

    gameStateRef.current = gameState;

    // Mouse/Touch controls
    const handleMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      gameState.mouseX = clientX - rect.left;
      gameState.mouseY = clientY - rect.top;

      const dx = gameState.mouseX - gameState.hook.x;
      const dy = Math.max(gameState.mouseY - gameState.hook.y, 30);
      gameState.hook.targetAngle = Math.atan2(dx, dy) * 0.6;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPlaying) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (isPlaying && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Create fish
    const createFish = () => {
      if (!isPlaying) return;

      const now = Date.now();
      if (now - gameState.lastFishSpawn > 1000 && gameState.fish.length < 8) {
        gameState.fish.push({
          x: Math.random() > 0.5 ? -30 : canvas.width + 30,
          y: canvas.height - 80 + Math.random() * 100,
          size: 20 + Math.random() * 15,
          speed: (0.8 + Math.random() * 1.2) * (Math.random() > 0.5 ? 1 : -1),
          color: `hsl(${Math.random() * 60 + 180}, 70%, ${50 + Math.random() * 20}%)`
        });
        gameState.lastFishSpawn = now;
      }
    };

    // Create bubbles
    const createBubbles = () => {
      if (!isPlaying) return;
      if (Math.random() < 0.15) {
        gameState.bubbles.push({
          x: Math.random() * canvas.width,
          y: canvas.height,
          size: 4 + Math.random() * 6,
          speed: 0.8 + Math.random() * 1.2
        });
      }
    };

    // Draw hook
    const drawHook = () => {
      ctx.save();
      ctx.translate(gameState.hook.x, gameState.hook.y);
      ctx.rotate(gameState.hook.angle);

      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, gameState.lineLength);
      ctx.stroke();

      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(0, gameState.lineLength, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, gameState.lineLength);
      ctx.lineTo(-6, gameState.lineLength + 10);
      ctx.lineTo(6, gameState.lineLength + 10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // Draw fish
    const drawFish = (fish: typeof gameState.fish[0]) => {
      ctx.save();
      const direction = fish.speed > 0 ? 1 : -1;
      ctx.translate(fish.x, fish.y);
      ctx.scale(direction, 1);

      ctx.fillStyle = fish.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-fish.size, 0);
      ctx.lineTo(-fish.size - fish.size / 2, -fish.size / 2);
      ctx.lineTo(-fish.size - fish.size / 2, fish.size / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(fish.size / 3, -fish.size / 4, fish.size / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(fish.size / 3, -fish.size / 4, fish.size / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw bubbles
    const drawBubbles = () => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      gameState.bubbles.forEach(bubble => {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.stroke();
      });
    };

    // Check collision
    const checkCollision = () => {
      if (!isPlaying) return;

      const hookEndX = gameState.hook.x + Math.sin(gameState.hook.angle) * gameState.lineLength;
      const hookEndY = gameState.hook.y + Math.cos(gameState.hook.angle) * gameState.lineLength;

      for (let i = gameState.fish.length - 1; i >= 0; i--) {
        const fish = gameState.fish[i];
        const dx = hookEndX - fish.x;
        const dy = hookEndY - fish.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < fish.size + 12) {
          gameState.fish.splice(i, 1);
          gameState.score++;
          setFishCaught(prev => prev + 1);
        }
      }
    };

    // Animation loop
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!isPlaying) {
        // Just draw background if not playing
        if (backgroundImageRef.current) {
          ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback gradient
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, '#8B4513');
          gradient.addColorStop(1, '#654321');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background (water over wood concept, or just water for game)
      // Game background is water
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#3b82f630');
      gradient.addColorStop(1, '#1e40af40');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const angleDiff = gameState.hook.targetAngle - gameState.hook.angle;
      gameState.hook.angle += angleDiff * 0.15;

      createFish();
      gameState.fish.forEach((fish) => {
        fish.x += fish.speed;
        if (fish.speed > 0 && fish.x > canvas.width + fish.size) {
          fish.x = -fish.size;
        } else if (fish.speed < 0 && fish.x < -fish.size) {
          fish.x = canvas.width + fish.size;
        }
        drawFish(fish);
      });

      createBubbles();
      gameState.bubbles.forEach(bubble => {
        bubble.y -= bubble.speed;
      });
      gameState.bubbles = gameState.bubbles.filter(bubble => bubble.y > -bubble.size);
      drawBubbles();

      drawHook();
      checkCollision();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full text-center">
        {/* 404 Title */}
        <div className="text-4xl md:text-6xl font-bold text-blue-600 mb-2">
          404
        </div>

        {/* Message */}
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-1">
          Pagină negăsită
        </h1>

        <p className="text-sm md:text-base text-gray-600 mb-6">
          Se pare că ai ajuns într-un loc unde nu există nimic... sau poate doar un pește!
        </p>

        {/* Game Canvas */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4 inline-block w-full max-w-3xl">
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-lg bg-slate-800 cursor-crosshair"
            onClick={() => {
              if (!isPlaying) {
                setIsPlaying(true);
                setFishCaught(0);
                if (gameStateRef.current) {
                  gameStateRef.current.fish = [];
                  gameStateRef.current.bubbles = [];
                  gameStateRef.current.score = 0;
                }
              }
            }}
          />

          {/* Game Controls */}
          <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) {
                  setFishCaught(0);
                  if (gameStateRef.current) {
                    gameStateRef.current.fish = [];
                    gameStateRef.current.bubbles = [];
                    gameStateRef.current.score = 0;
                  }
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <Fish size={14} />
              {isPlaying ? 'Pauză' : 'Joacă'}
            </button>

            <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
              🐟 {fishCaught}
            </div>
          </div>

          {!isPlaying && (
            <p className="mt-2 text-xs text-gray-500 italic">
              Apasă pe canvas sau butonul "Joacă" pentru a începe. Mută mouse-ul pentru a controla cârligul.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
            Înapoi
          </button>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Home size={18} />
            Acasă
          </button>
        </div>
      </div>
    </div>
  );
}

