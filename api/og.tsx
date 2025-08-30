/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from '@vercel/og';

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const title    = searchParams.get('title')    ?? 'Fish Trophy';
  const subtitle = searchParams.get('subtitle') ?? 'Trofeul Pescarilor din România';
  const domain   = searchParams.get('domain')   ?? 'FishTrophy.ro';

  return new ImageResponse(
    `
    <div style="
      width: 1200px;
      height: 630px;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      position: relative;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
      font-family: Inter, system-ui, sans-serif;
      overflow: hidden;
    ">
      <div style="
        width: 120px;
        height: 120px;
        border-radius: 999px;
        background: rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 30px;
        border: 4px solid rgba(255,255,255,0.2);
      ">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      
      <div style="
        font-size: 64px;
        font-weight: 800;
        margin: 0 0 20px 0;
        text-align: center;
        text-shadow: 0 4px 8px rgba(0,0,0,0.3);
      ">
        ${title}
      </div>
      
      <div style="
        font-size: 32px;
        opacity: 0.9;
        margin: 0 0 30px 0;
        text-align: center;
        font-weight: 600;
      ">
        ${subtitle}
      </div>
      
      <div style="
        background: rgba(255,255,255,0.1);
        padding: 12px 24px;
        border-radius: 50px;
        border: 2px solid rgba(255,255,255,0.2);
        font-size: 24px;
        font-weight: 700;
      ">
        ${domain}
      </div>
      
      <div style="
        position: absolute;
        top: 40px;
        right: 40px;
        width: 100px;
        height: 100px;
        border-radius: 999px;
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.2);
      "></div>
      <div style="
        position: absolute;
        bottom: 40px;
        left: 40px;
        width: 80px;
        height: 80px;
        border-radius: 999px;
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.2);
      "></div>
    </div>
    `,
    { width: 1200, height: 630 }
  );
}
