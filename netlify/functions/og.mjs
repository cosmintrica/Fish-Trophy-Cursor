export const handler = async (event) => {
  try {
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Generate SVG-based Open Graph image with beautiful design
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Ocean gradient background -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0c4a6e;stop-opacity:1" />
            <stop offset="30%" style="stop-color:#0369a1;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#0284c7;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:1" />
          </linearGradient>

          <!-- Title gradient -->
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#f0f9ff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e0f2fe;stop-opacity:1" />
          </linearGradient>

          <!-- Subtitle gradient -->
          <linearGradient id="subtitleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
          </linearGradient>

          <!-- Glow effect -->
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Drop shadow -->
          <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.3"/>
          </filter>
        </defs>

        <!-- Background with ocean gradient -->
        <rect width="1200" height="630" fill="url(#bgGradient)"/>

        <!-- Water waves pattern -->
        <path d="M0,200 Q150,150 300,200 T600,200 T900,200 T1200,200 L1200,630 L0,630 Z" fill="#0ea5e9" opacity="0.3"/>
        <path d="M0,250 Q200,200 400,250 T800,250 T1200,250 L1200,630 L0,630 Z" fill="#0284c7" opacity="0.2"/>
        <path d="M0,300 Q250,250 500,300 T1000,300 T1200,300 L1200,630 L0,630 Z" fill="#0369a1" opacity="0.15"/>

        <!-- Decorative bubbles -->
        <circle cx="150" cy="120" r="25" fill="#ffffff" opacity="0.1"/>
        <circle cx="1050" cy="180" r="35" fill="#ffffff" opacity="0.08"/>
        <circle cx="200" cy="400" r="20" fill="#ffffff" opacity="0.12"/>
        <circle cx="1000" cy="450" r="30" fill="#ffffff" opacity="0.1"/>
        <circle cx="300" cy="500" r="15" fill="#ffffff" opacity="0.15"/>
        <circle cx="900" cy="350" r="22" fill="#ffffff" opacity="0.09"/>

        <!-- Fishing rod silhouette -->
        <path d="M100 100 L120 80 L140 100 L160 80 L180 100 L200 80 L220 100 L240 80 L260 100 L280 80 L300 100 L320 80 L340 100 L360 80 L380 100 L400 80 L420 100 L440 80 L460 100 L480 80 L500 100 L520 80 L540 100 L560 80 L580 100 L600 80 L620 100 L640 80 L660 100 L680 80 L700 100 L720 80 L740 100 L760 80 L780 100 L800 80 L820 100 L840 80 L860 100 L880 80 L900 100 L920 80 L940 100 L960 80 L980 100 L1000 80 L1020 100 L1040 80 L1060 100 L1080 80 L1100 100 L1120 80 L1140 100 L1160 80 L1180 100 L1200 80" stroke="#ffffff" stroke-width="1" opacity="0.2"/>

        <!-- Fish silhouettes -->
        <ellipse cx="200" cy="350" rx="40" ry="20" fill="#fbbf24" opacity="0.6" transform="rotate(-15 200 350)"/>
        <ellipse cx="1000" cy="380" rx="35" ry="18" fill="#f59e0b" opacity="0.7" transform="rotate(20 1000 380)"/>
        <ellipse cx="150" cy="480" rx="30" ry="15" fill="#fbbf24" opacity="0.5" transform="rotate(-30 150 480)"/>
        <ellipse cx="1050" cy="520" rx="25" ry="12" fill="#f59e0b" opacity="0.6" transform="rotate(25 1050 520)"/>

        <!-- Main title with glow -->
        <text x="600" y="200" text-anchor="middle" fill="url(#titleGradient)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="900" letter-spacing="-0.02em" filter="url(#glow)">
          ${title}
        </text>

        <!-- Subtitle with shadow -->
        <text x="600" y="260" text-anchor="middle" fill="url(#subtitleGradient)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="700" letter-spacing="-0.01em" filter="url(#dropshadow)">
          ${subtitle}
        </text>

        <!-- Domain with subtle styling -->
        <text x="600" y="320" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="500" opacity="0.9">
          ${domain}
        </text>

        <!-- Decorative line with gradient -->
        <line x1="400" y1="380" x2="800" y2="380" stroke="url(#subtitleGradient)" stroke-width="4" opacity="0.8"/>

        <!-- Fishing hook icon -->
        <g transform="translate(600, 450)">
          <path d="M-30 -20 L-20 -30 L-10 -20 L0 -30 L10 -20 L20 -30 L30 -20 L40 -30 L50 -20 L60 -30 L70 -20 L80 -30 L90 -20 L100 -30 L110 -20 L120 -30 L130 -20 L140 -30 L150 -20 L160 -30 L170 -20 L180 -30 L190 -20 L200 -30 L210 -20 L220 -30 L230 -20 L240 -30 L250 -20 L260 -30 L270 -20 L280 -30 L290 -20 L300 -30 L310 -20 L320 -30 L330 -20 L340 -30 L350 -20 L360 -30 L370 -20 L380 -30 L390 -20 L400 -30 L410 -20 L420 -30 L430 -20 L440 -30 L450 -20 L460 -30 L470 -20 L480 -30 L490 -20 L500 -30 L510 -20 L520 -30 L530 -20 L540 -30 L550 -20 L560 -30 L570 -20 L580 -30 L590 -20 L600 -30 L610 -20 L620 -30 L630 -20 L640 -30 L650 -20 L660 -30 L670 -20 L680 -30 L690 -20 L700 -30 L710 -20 L720 -30 L730 -20 L740 -30 L750 -20 L760 -30 L770 -20 L780 -30 L790 -20 L800 -30 L810 -20 L820 -30 L830 -20 L840 -30 L850 -20 L860 -30 L870 -20 L880 -30 L890 -20 L900 -30 L910 -20 L920 -30 L930 -20 L940 -30 L950 -20 L960 -30 L970 -20 L980 -30 L990 -20 L1000 -30 L1010 -20 L1020 -30 L1030 -20 L1040 -30 L1050 -20 L1060 -30 L1070 -20 L1080 -30 L1090 -20 L1100 -30 L1110 -20 L1120 -30 L1130 -20 L1140 -30 L1150 -20 L1160 -30 L1170 -20 L1180 -30 L1190 -20 L1200 -30" stroke="#fbbf24" stroke-width="2" opacity="0.4"/>
        </g>

        <!-- Trophy icon -->
        <g transform="translate(600, 520)">
          <path d="M-40 -15 L-30 -25 L-20 -15 L-10 -25 L0 -15 L10 -25 L20 -15 L30 -25 L40 -15 L35 -5 L25 5 L15 10 L5 10 L-5 10 L-15 10 L-25 5 L-35 -5 Z" fill="#fbbf24" opacity="0.9"/>
          <circle cx="0" cy="0" r="8" fill="#ffffff"/>
          <path d="M-15 -5 L-10 0 L-15 5 M10 -5 L15 0 L10 5" stroke="#f59e0b" stroke-width="2" fill="none"/>
        </g>
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
