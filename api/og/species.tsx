/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from '@vercel/og';

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const species = searchParams.get('species') ?? 'Peste';
  const scientificName = searchParams.get('scientific') ?? '';
  const description = searchParams.get('description') ?? 'Informații despre această specie de pește';

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
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(34, 197, 94, 0.1))',
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
            background: 'linear-gradient(45deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))',
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
          {/* Fish icon */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(34, 197, 94, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 30,
              border: '3px solid rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Fish SVG icon */}
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 12c.94-1.06 2.44-1.5 3.5-1.5s2.56.44 3.5 1.5" />
              <path d="M17 12c-.94-1.06-2.44-1.5-3.5-1.5s-2.56.44-3.5 1.5" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 6v12" />
              <path d="M6 12h12" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>

          {/* Species name */}
          <div
            style={{
              fontSize: 64,
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

          {/* Scientific name */}
          {scientificName && (
            <div
              style={{
                fontSize: 28,
                color: '#9ca3af',
                marginBottom: 20,
                fontStyle: 'italic',
                fontWeight: 500
              }}
            >
              {scientificName}
            </div>
          )}

          {/* Description */}
          <div
            style={{
              fontSize: 24,
              color: '#a1a6b0',
              marginBottom: 30,
              fontWeight: 500,
              lineHeight: 1.4,
              maxWidth: 800
            }}
          >
            {description}
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
            width: 100,
            height: 100,
            borderRadius: 999,
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            backdropFilter: 'blur(10px)'
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
