/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const title   = searchParams.get('title')   ?? 'FishTrophy';
  const species = searchParams.get('species') ?? 'Record Catch';
  const weight  = searchParams.get('weight')  ?? '';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(135deg,#0ea5e9,#1d4ed8)'
      }}>
        <div style={{ fontSize: 68, fontWeight: 800, color: 'white', lineHeight: 1.1, textAlign: 'center', padding: '0 60px' }}>
          {title}
        </div>
        <div style={{ marginTop: 16, fontSize: 36, color: 'white', opacity: 0.9 }}>
          {species} {weight && `• ${weight}`}
        </div>
        <div style={{ position: 'absolute', bottom: 40, fontSize: 28, color: 'white', opacity: 0.85 }}>
          fishtrophy.ro
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
