/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const title    = searchParams.get('title')    ?? 'Fish Trophy';
  const subtitle = searchParams.get('subtitle') ?? 'Trofeul Pescarilor din România';
  const domain   = searchParams.get('domain')   ?? 'FishTrophy.ro';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          position: 'relative',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
          fontFamily: 'Inter, system-ui, sans-serif',
          overflow: 'hidden'
        }}
      >
        {/* Icon container */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 30,
            border: '4px solid rgba(255,255,255,0.2)'
          }}
        >
          {/* SVG icon (vector, alb) */}
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>

        {/* Titlu */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            margin: '0 0 20px 0',
            textAlign: 'center',
            textShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          {title}
        </div>

        {/* Subtitlu */}
        <div
          style={{
            fontSize: 32,
            opacity: 0.9,
            margin: '0 0 30px 0',
            textAlign: 'center',
            fontWeight: 600
          }}
        >
          {subtitle}
        </div>

        {/* Domeniu */}
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '12px 24px',
            borderRadius: 50,
            border: '2px solid rgba(255,255,255,0.2)',
            fontSize: 24,
            fontWeight: 700
          }}
        >
          {domain}
        </div>

        {/* Elemente decorative */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            width: 100,
            height: 100,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            width: 80,
            height: 80,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
