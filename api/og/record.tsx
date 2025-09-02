/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from '@vercel/og';

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const species = searchParams.get('species') ?? 'Peste';
  const weight = searchParams.get('weight') ?? '0 kg';
  const angler = searchParams.get('angler') ?? 'Pescar';
  const location = searchParams.get('location') ?? 'România';
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('ro-RO');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 60,
          background: 'linear-gradient(135deg, #0b0c0f 0%, #1a1c24 40%, #0e1018 100%)',
          color: '#eef0f7',
          fontFamily: 'Inter, Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
            filter: 'blur(40px)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(147, 51, 234, 0.1), rgba(34, 197, 94, 0.1))',
            filter: 'blur(60px)'
          }}
        />

        {/* Main content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
            maxWidth: 900
          }}
        >
          {/* Trophy icon */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 30,
              border: '3px solid rgba(251, 191, 36, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Trophy SVG icon */}
            <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21l-1 .5A2 2 0 0 1 5.5 17.5v-1.5" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21l1 .5A2 2 0 0 0 18.5 17.5v-1.5" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>

          {/* Species name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              marginBottom: 15,
              background: 'linear-gradient(135deg, #eef0f7, #a1a6b0)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              lineHeight: 1.1
            }}
          >
            {species}
          </div>

          {/* Weight */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#fbbf24',
              marginBottom: 20,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {weight}
          </div>

          {/* Angler and location */}
          <div
            style={{
              fontSize: 28,
              color: '#a1a6b0',
              marginBottom: 15,
              fontWeight: 600
            }}
          >
            Prins de {angler}
          </div>

          <div
            style={{
              fontSize: 24,
              color: '#9ca3af',
              marginBottom: 30,
              fontWeight: 500
            }}
          >
            {location} • {date}
          </div>

          {/* Domain badge */}
          <div
            style={{
              display: 'flex',
              alignSelf: 'center',
              padding: '12px 24px',
              borderRadius: 12,
              background: 'linear-gradient(90deg, #6ee7b7, #22d3ee)',
              color: '#0b0c10',
              fontSize: 20,
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(110, 231, 183, 0.3)',
              border: '2px solid rgba(255,255,255,0.1)'
            }}
          >
            fishtrophy.ro
          </div>
        </div>

        {/* Additional decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            width: 80,
            height: 80,
            borderRadius: 999,
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            backdropFilter: 'blur(10px)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            width: 60,
            height: 60,
            borderRadius: 999,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            backdropFilter: 'blur(10px)'
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
