/**
 * Pagină 404 frumoasă cu mini joc de pescuit
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Fish } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout from '../components/ForumLayout';

export default function NotFound404() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [fishCaught, setFishCaught] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number>();
  const gameStateRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size - MAI MARE pentru joc
    const resizeCanvas = () => {
      canvas.width = Math.min(900, window.innerWidth - 80);
      canvas.height = 500;
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
      
      // Calculate target angle based on mouse position
      const dx = gameState.mouseX - gameState.hook.x;
      const dy = Math.max(gameState.mouseY - gameState.hook.y, 30);
      gameState.hook.targetAngle = Math.atan2(dx, dy) * 0.6; // Limit angle
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

    // Create fish - mai mulți pești
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
      
      // Line
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, gameState.lineLength);
      ctx.stroke();

      // Hook
      ctx.fillStyle = theme.text;
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

      // Body
      ctx.fillStyle = fish.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-fish.size, 0);
      ctx.lineTo(-fish.size - fish.size / 2, -fish.size / 2);
      ctx.lineTo(-fish.size - fish.size / 2, fish.size / 2);
      ctx.closePath();
      ctx.fill();

      // Eye
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

      // Iterate backwards to safely remove items
      for (let i = gameState.fish.length - 1; i >= 0; i--) {
        const fish = gameState.fish[i];
        const dx = hookEndX - fish.x;
        const dy = hookEndY - fish.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < fish.size + 12) {
          // Caught!
          gameState.fish.splice(i, 1);
          gameState.score++;
          setScore(gameState.score);
          setFishCaught(prev => prev + 1);
        }
      }
    };

    // Animation loop
    const animate = () => {
      if (!isPlaying) {
        // Draw wood background when not playing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.src = '/wood.jpg';
        img.onload = () => {
          if (!isPlaying && canvas) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.onerror = () => {
          // Fallback gradient if image fails
          if (!isPlaying && canvas) {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#8B4513');
            gradient.addColorStop(1, '#654321');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient (water)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, theme.primary + '30');
      gradient.addColorStop(1, theme.secondary + '40');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update hook - smoothly interpolate to target angle
      const angleDiff = gameState.hook.targetAngle - gameState.hook.angle;
      gameState.hook.angle += angleDiff * 0.15;

      // Update and draw fish
      createFish();
      gameState.fish.forEach((fish) => {
        fish.x += fish.speed;
        // Wrap around screen
        if (fish.speed > 0 && fish.x > canvas.width + fish.size) {
          fish.x = -fish.size;
        } else if (fish.speed < 0 && fish.x < -fish.size) {
          fish.x = canvas.width + fish.size;
        }
        drawFish(fish);
      });

      // Update and draw bubbles
      createBubbles();
      gameState.bubbles.forEach(bubble => {
        bubble.y -= bubble.speed;
      });
      gameState.bubbles = gameState.bubbles.filter(bubble => bubble.y > -bubble.size);
      drawBubbles();

      // Draw hook
      drawHook();

      // Check collision
      checkCollision();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initial draw of wood image
    const img = new Image();
    img.src = '/wood.jpg';
    img.onload = () => {
      if (canvas && !isPlaying) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
    img.onerror = () => {
      if (canvas && !isPlaying) {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(1, '#654321');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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
  }, [theme, isPlaying]);

  return (
    <ForumLayout>
      <div style={{
        maxWidth: '1000px',
        margin: '1rem auto',
        padding: '1rem',
        textAlign: 'center'
      }}>
        {/* 404 Title - MAI MIC */}
        <div style={{
          fontSize: 'clamp(2rem, 8vw, 4rem)',
          fontWeight: '700',
          color: theme.primary,
          marginBottom: '0.5rem',
          lineHeight: '1'
        }}>
          404
        </div>

        {/* Message - MAI COMPACT */}
        <h1 style={{
          fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
          fontWeight: '600',
          color: theme.text,
          marginBottom: '0.25rem'
        }}>
          Pagină negăsită
        </h1>

        <p style={{
          fontSize: '0.875rem',
          color: theme.textSecondary,
          marginBottom: '1rem'
        }}>
          Se pare că ai ajuns într-un loc unde nu există nimic... sau poate doar un pește!
        </p>

        {/* Game Canvas - MAI MARE */}
        <div style={{
          backgroundColor: theme.surface,
          border: `2px solid ${theme.border}`,
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'inline-block',
          width: '100%',
          maxWidth: '900px'
        }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              borderRadius: '0.5rem',
              backgroundColor: '#1a1a2e',
              cursor: isPlaying ? 'crosshair' : 'pointer'
            }}
            onClick={() => {
              if (!isPlaying) {
                setIsPlaying(true);
                setFishCaught(0);
                setScore(0);
                if (gameStateRef.current) {
                  gameStateRef.current.fish = [];
                  gameStateRef.current.bubbles = [];
                  gameStateRef.current.score = 0;
                }
              }
            }}
          />
          
          {/* Game Controls - MAI COMPACT */}
          <div style={{
            marginTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) {
                  setFishCaught(0);
                  setScore(0);
                  if (gameStateRef.current) {
                    gameStateRef.current.fish = [];
                    gameStateRef.current.bubbles = [];
                    gameStateRef.current.score = 0;
                  }
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isPlaying ? theme.error : theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Fish size={14} />
              {isPlaying ? 'Pauză' : 'Joacă'}
            </button>

            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: theme.background,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              color: theme.text,
              fontWeight: '500'
            }}>
              🐟 {fishCaught}
            </div>
          </div>

          {!isPlaying && (
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: theme.textSecondary,
              fontStyle: 'italic'
            }}>
              Apasă pe canvas sau butonul "Joacă" pentru a începe. Mută mouse-ul pentru a controla cârligul.
            </p>
          )}
        </div>

        {/* Actions - MAI COMPACT */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              color: theme.text,
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.surfaceHover;
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.surface;
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            <ArrowLeft size={16} />
            Înapoi
          </button>

          <button
            onClick={() => navigate('/forum')}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: theme.primary,
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Home size={16} />
            Acasă
          </button>
        </div>
      </div>
    </ForumLayout>
  );
}
