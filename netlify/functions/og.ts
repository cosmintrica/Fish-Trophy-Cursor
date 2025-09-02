import { Handler } from '@netlify/functions';
import { ImageResponse } from '@vercel/og';

export const handler: Handler = async (event) => {
  try {
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Custom fish SVG icon
    const fishSvg = `<svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 40C20 40 30 20 60 20C90 20 100 40 100 40C100 40 90 60 60 60C30 60 20 40 20 40Z" fill="#3B82F6"/>
      <circle cx="75" cy="35" r="4" fill="white"/>
      <path d="M15 40L25 35L25 45L15 40Z" fill="#1E40AF"/>
      <path d="M85 30L105 25L95 40L105 55L85 50" fill="#1E40AF" stroke="#1E40AF" stroke-width="2"/>
    </svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: await new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
              }}
              dangerouslySetInnerHTML={{ __html: fishSvg }}
            />
            <div
              style={{
                fontSize: '54px',
                fontWeight: 'bold',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '10px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#94a3b8',
                textAlign: 'center',
                marginBottom: '20px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {subtitle}
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#64748b',
                textAlign: 'center',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {domain}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      ).arrayBuffer(),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error generating OG image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate image' }),
    };
  }
};
