import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Generate SVG-based Open Graph image
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Fish Icon -->
        <g transform="translate(540, 200)">
          <path d="M20 40C20 40 30 20 60 20C90 20 100 40 100 40C100 40 90 60 60 60C30 60 20 40 20 40Z" fill="#3B82F6"/>
          <circle cx="75" cy="35" r="4" fill="white"/>
          <path d="M15 40L25 35L25 45L15 40Z" fill="#1E40AF"/>
          <path d="M85 30L105 25L95 40L105 55L85 50" fill="#1E40AF" stroke="#1E40AF" stroke-width="2"/>
        </g>
        
        <!-- Title -->
        <text x="600" y="350" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="bold">
          ${title}
        </text>
        
        <!-- Subtitle -->
        <text x="600" y="400" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="24">
          ${subtitle}
        </text>
        
        <!-- Domain -->
        <text x="600" y="450" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="18">
          ${domain}
        </text>
      </svg>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: svgContent,
    };
  } catch (error) {
    console.error('Error generating OG image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate image' }),
    };
  }
};
