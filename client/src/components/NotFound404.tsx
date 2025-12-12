/**
 * Pagină 404 unificată cu joc de pescuit complet refăcut
 * Mecanică: Click pentru a lansa cârligul (Crane Style)
 * Include: Vieți, Scor, Sunete, Leaderboard
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Trophy, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
// Importăm doar tipurile, nu hook-urile care depind de context
import type { User } from '@supabase/supabase-js';
import { useTheme } from '@/contexts/ThemeContext';

// --- SOUND ENGINE (Simple Oscillator Synth) ---
const playSound = (type: 'catch' | 'miss' | 'gameover' | 'start' | 'hit') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Create new context (browsers require interaction first, so we assume playing starts after interaction)
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'catch') {
      // Happy high pitched ping
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else if (type === 'miss') {
      // Short low thud
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.linearRampToValueAtTime(100, now + 0.1);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else if (type === 'hit') {
      // Explosion-ish noise
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else if (type === 'start') {
      // Power up
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(600, now + 0.2);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
    } else if (type === 'gameover') {
      // Sad trombone-ish
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.linearRampToValueAtTime(300, now + 0.3);
      oscillator.frequency.linearRampToValueAtTime(200, now + 0.6);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.6);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
      oscillator.start(now);
      oscillator.stop(now + 0.8);
    }
  } catch (e) {
    console.error('Audio error:', e);
  }
};

// Hook pentru a detecta dacă suntem în context forum
const useIsForumContext = () => {
  const location = useLocation();
  const pathWithoutHash = location.pathname;
  return pathWithoutHash.startsWith('/forum');
};

export default function NotFound404() {
  const navigate = useNavigate();
  const isForum = useIsForumContext();
  const [user, setUser] = useState<User | null>(null);
  const { isDarkMode } = useTheme();

  // Derived theme mode from global context
  const themeMode = isDarkMode ? 'dark' : 'light';

  // Old effect removed as we rely on global context now

  // Define themes
  const themes = {
    light: {
      primary: '#2563eb', // Blue 600
      secondary: '#10b981', // Emerald 500
      background: '#f8fafc', // Slate 50
      surface: '#ffffff',
      text: '#0f172a', // Slate 900
      textSecondary: '#64748b', // Slate 500
      border: '#e2e8f0', // Slate 200
      error: '#ef4444'
    },
    dark: {
      primary: '#3b82f6', // Blue 500
      secondary: '#10b981',
      background: '#0f172a', // Slate 900
      surface: '#1e293b', // Slate 800
      text: '#f1f5f9', // Slate 50
      textSecondary: '#94a3b8', // Slate 400
      border: '#334155', // Slate 700
      error: '#f87171' // Red 400
    }
  };

  const currentTheme = themes[themeMode];

  // Safe Auth Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const animationFrameRef = useRef<number>();
  const gameStateRef = useRef<any>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  // Leaderboard state
  const [highScores, setHighScores] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load Leaderboard
  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('score, created_at, user_id')
        .eq('game_id', '404_fishing_reloaded') // New game ID for new mechanics
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      const userIds = [...new Set(data?.map(s => s.user_id) || [])];
      let usersMap = new Map();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        usersMap = new Map(users?.map(u => [u.id, u.username]));
      }

      const formattedScores = data?.map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        username: usersMap.get(entry.user_id) || 'Anonim',
        date: new Date(entry.created_at).toLocaleDateString('ro-RO')
      }));

      setHighScores(formattedScores || []);
      setShowLeaderboard(true);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  // Save Score
  const saveScore = async (finalScore: number) => {
    if (!user || finalScore === 0) return;
    try {
      await supabase.from('game_scores').insert({
        user_id: user.id,
        game_id: '404_fishing_reloaded',
        score: finalScore,
        metadata: { timestamp: new Date().toISOString() }
      });
      // Do not force reload here to avoid visual jarring, user can click button
    } catch (err) {
      console.error('Error saving score:', err);
    }
  };

  // Load Image
  useEffect(() => {
    const img = new Image();
    img.src = '/wood.jpg';
    img.onload = () => {
      backgroundImageRef.current = img;
    };
  }, []);

  // --- GAME LOGIC ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    const resizeCanvas = () => {
      // Use more screen space
      canvas.width = Math.min(1000, window.innerWidth - 40);
      canvas.height = 600;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial State
    gameStateRef.current = {
      hook: { x: canvas.width / 2, y: 50, state: 'IDLE', speedY: 15, length: 0 },
      mouseX: canvas.width / 2,
      entities: [] as any[], // Fish & Bombs
      particles: [] as any[], // Visual effects
      lastSpawn: 0,
      difficulty: 1,
      score: 0,
      lives: 3
    };

    // Constants
    const HOOK_ORIGIN_Y = 50;

    // Draw Background with "Object Cover" logic
    const drawBackground = () => {
      if (backgroundImageRef.current) {
        const img = backgroundImageRef.current;
        // Calculations to mimic object-cover
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          drawWidth = canvas.height * imgRatio;
          drawHeight = canvas.height;
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        }
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Overlay Semi-transparent Water
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      grad.addColorStop(1, 'rgba(30, 58, 138, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Entity Factory
    const spawnEntity = (difficulty: number) => {
      const isBomb = Math.random() < (0.1 + difficulty * 0.02); // Bomb chance increases with difficulty
      const isRare = Math.random() < 0.1;

      const size = isBomb ? 25 : (20 + Math.random() * 20);
      const direction = Math.random() > 0.5 ? 1 : -1; // 1 = right, -1 = left

      gameStateRef.current.entities.push({
        type: isBomb ? 'BOMB' : (isRare ? 'RARE' : 'FISH'),
        x: direction === 1 ? -50 : canvas.width + 50,
        y: 100 + Math.random() * (canvas.height - 150),
        speed: (Math.random() * 2 + 1 + difficulty * 0.2) * direction,
        size: size,
        color: isBomb ? '#EF4444' : (isRare ? '#FCD34D' : `hsl(${Math.random() * 360}, 70%, 50%)`),
        points: isBomb ? -1 : (isRare ? 5 : 1)
      });
    };

    const createExplosion = (x: number, y: number, color: string) => {
      for (let i = 0; i < 10; i++) {
        gameStateRef.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 1.0,
          color
        });
      }
    };

    // --- GAME LOOP ---
    const animate = () => {
      // Logic Update
      if (isPlaying && !isGameOver) {
        const state = gameStateRef.current;

        // Difficulty scaling
        state.difficulty = 1 + Math.floor(state.score / 10);

        // Update Hook
        if (state.hook.state === 'IDLE') {
          // Move with mouse (clamped)
          state.hook.x += (state.mouseX - state.hook.x) * 0.2;
          state.hook.length = 0;
        } else if (state.hook.state === 'DROPPING') {
          state.hook.length += state.hook.speedY;

          // Hit bottom?
          if (HOOK_ORIGIN_Y + state.hook.length >= canvas.height) {
            state.hook.state = 'RETRACTING';
            if (soundEnabled) playSound('miss');
          }

          // Collision Check
          const hookX = state.hook.x;
          const hookY = HOOK_ORIGIN_Y + state.hook.length;

          for (let i = state.entities.length - 1; i >= 0; i--) {
            const ent = state.entities[i];
            // Simple circle collision
            const dist = Math.sqrt(Math.pow(hookX - ent.x, 2) + Math.pow(hookY - ent.y, 2));
            if (dist < ent.size + 10) {
              // HIT!
              if (ent.type === 'BOMB') {
                // Bad hit
                createExplosion(ent.x, ent.y, '#EF4444');
                state.entities.splice(i, 1);
                state.lives -= 1;
                state.hook.state = 'RETRACTING';
                if (soundEnabled) playSound('hit');

                if (state.lives <= 0) {
                  setIsGameOver(true);
                  playSound('gameover');
                  saveScore(state.score);
                }
              } else {
                // Good Hit
                createExplosion(ent.x, ent.y, '#FFFFFF');
                state.score += ent.points;
                setScore(state.score);
                state.entities.splice(i, 1);
                state.hook.state = 'RETRACTING';
                if (soundEnabled) playSound('catch');
                // Visual +1 text effect could go here
              }
            }
          }

        } else if (state.hook.state === 'RETRACTING') {
          state.hook.length -= 20; // Fast retract
          if (state.hook.length <= 0) {
            state.hook.length = 0;
            state.hook.state = 'IDLE';
          }
        }

        // Spawn Entities
        if (Date.now() - state.lastSpawn > Math.max(500, 1500 - state.difficulty * 100)) {
          spawnEntity(state.difficulty);
          state.lastSpawn = Date.now();
        }

        // Move Entities
        state.entities.forEach((ent: any) => {
          ent.x += ent.speed;
        });
        // Cleanup offscreen
        state.entities = state.entities.filter((ent: any) => ent.x > -100 && ent.x < canvas.width + 100);

        // Particles
        state.particles.forEach((p: any) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.05;
        });
        state.particles = state.particles.filter((p: any) => p.life > 0);

        setLives(state.lives); // Sync UI
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Background
      drawBackground();

      // 2. Game Elements
      const state = gameStateRef.current;

      // Draw Line
      ctx.beginPath();
      ctx.moveTo(state.hook.x, HOOK_ORIGIN_Y);
      ctx.lineTo(state.hook.x, HOOK_ORIGIN_Y + state.hook.length);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Hook
      const hookY = HOOK_ORIGIN_Y + state.hook.length;
      ctx.save();
      ctx.translate(state.hook.x, hookY);

      // Cool Anchor/Hook Shape
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFF00';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-10, 10, -10, -5);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, 10, 10, -5);
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Draw Entities
      state.entities.forEach((ent: any) => {
        ctx.save();
        ctx.translate(ent.x, ent.y);
        if (ent.speed < 0) ctx.scale(-1, 1); // Face direction

        if (ent.type === 'BOMB') {
          // Draw Bomb
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(0, 0, ent.size, 0, Math.PI * 2);
          ctx.fill();
          // Fuse
          ctx.strokeStyle = '#FFA500';
          ctx.beginPath();
          ctx.moveTo(0, -ent.size);
          ctx.quadraticCurveTo(5, -ent.size - 10, 10, -ent.size - 5);
          ctx.stroke();
        } else {
          // Draw Fish
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, ent.size, ent.size / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.moveTo(-ent.size, 0);
          ctx.lineTo(-ent.size - 10, -10);
          ctx.lineTo(-ent.size - 10, 10);
          ctx.fill();
          // Eye
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(ent.size / 2, -5, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ent.size / 2 + 1, -5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Particles
      state.particles.forEach((p: any) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start Loop
    animate();

    // Event Handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.mouseX = e.clientX - rect.left;
    };

    // Game Click Action
    const handleClick = (e: MouseEvent) => {
      if (!isPlaying || isGameOver) return;
      if (gameStateRef.current.hook.state === 'IDLE') {
        gameStateRef.current.hook.state = 'DROPPING';
        // playSound('drop'); // Optional sound
      }
    };

    // Touch support similar
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlaying || isGameOver) return;
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        gameStateRef.current.mouseX = e.touches[0].clientX - rect.left;
      }
      if (gameStateRef.current.hook.state === 'IDLE') {
        gameStateRef.current.hook.state = 'DROPPING';
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, isGameOver, soundEnabled]);
  // Re-bind when game state basic modes change, but largely refs handle inside loop

  // --- RENDER UI ---
  // Note: This component is rendered inside Layout, so header/footer get dark mode automatically
  // We only need to style the 404 content area
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        backgroundColor: 'transparent', // Let Layout handle background
        color: currentTheme.text,
        fontFamily: 'system-ui, sans-serif'
      }}
    >

      {/* Header Info */}
      <h1 style={{ fontSize: '3rem', fontWeight: '800', color: currentTheme.primary, marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: currentTheme.textSecondary, marginBottom: '2rem', fontSize: '1.2rem' }}>
        Pagina nu a fost găsită, dar peștii sunt aici!
      </p>

      {/* GAME CONTAINER POOLED */}
      <div style={{
        position: 'relative',
        maxWidth: '1000px',
        width: '100%',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: `4px solid ${currentTheme.surface}`,
        backgroundColor: '#000'
      }}>
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'none' }}
        />

        {/* UI OVERLAY */}
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} className="text-yellow-400" />
            {score}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ❤️ {lives}
          </div>
        </div>

        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        {/* START / GAMEOVER SCREEN */}
        {(!isPlaying || isGameOver) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            backdropFilter: 'blur(4px)'
          }}>
            {isGameOver ? (
              <>
                <h2 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#EF4444', marginBottom: '1rem' }}>GAME OVER</h2>
                <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Scor final: {score}</p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Fish Trophy: The Game</h2>
                <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Prinde peștii 🐟, evită bombele 💣!</p>
              </>
            )}

            <button
              onClick={() => {
                setIsPlaying(true);
                setIsGameOver(false);
                setScore(0);
                setLives(3);
                gameStateRef.current.score = 0;
                gameStateRef.current.lives = 3;
                gameStateRef.current.entities = [];
                if (soundEnabled) playSound('start');
              }}
              style={{
                padding: '1rem 3rem',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(to right, #2563eb, #3b82f6)',
                border: 'none',
                borderRadius: '3rem',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(37, 99, 235, 0.5)',
                transition: 'transform 0.1s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isGameOver ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RefreshCw /> Încearcă din nou</span> : 'START JOC'}
            </button>

            {!user && (
              <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', opacity: 0.7 }}>
                *Autentifică-te pentru a apărea în clasament.
              </p>
            )}

            {/* Leaderboard Button */}
            <button
              onClick={() => {
                if (!showLeaderboard) loadLeaderboard();
                setShowLeaderboard(!showLeaderboard);
              }}
              style={{ marginTop: '2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}
            >
              🏆 Vezi Clasament
            </button>
          </div>
        )}

        {/* LEADERBOARD OVERLAY */}
        {showLeaderboard && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: currentTheme.surface,
            color: currentTheme.text,
            padding: '2rem',
            overflowY: 'auto',
            zIndex: 20
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy className="text-yellow-500" /> Clasament
                </h2>
                <button onClick={() => setShowLeaderboard(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: currentTheme.text }}>✕</button>
              </div>

              {highScores.length === 0 ? (
                <p>Se încarcă sau nu există scoruri...</p>
              ) : (
                highScores.map((s, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderBottom: `1px solid ${currentTheme.border}`,
                    background: idx < 3 ? (currentTheme.background) : 'transparent',
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '30px', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : currentTheme.textSecondary }}>#{idx + 1}</span>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{s.username}</div>
                        <div style={{ fontSize: '0.8rem', color: currentTheme.textSecondary }}>{s.date}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: currentTheme.primary }}>
                      {s.score}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Navigation Buttons */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '0.75rem 1.5rem',
            background: currentTheme.surface,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: currentTheme.text,
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={18} /> Înapoi
        </button>

        <button
          onClick={() => navigate(isForum ? '/forum' : '/')}
          style={{
            padding: '0.75rem 1.5rem',
            background: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          <Home size={18} /> {isForum ? 'Forum' : 'Acasă'}
        </button>
      </div>
    </div>
  );
}
