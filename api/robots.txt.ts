export default async function handler() {
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://fishtrophy.ro/api/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /profile/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /black-sea
Allow: /species
Allow: /leaderboards
Allow: /submission-guide
Allow: /fishing-shops

# Block common bot traps
Disallow: /*.json$
Disallow: /*?*
Disallow: /*#

# Allow social media crawlers
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

# Block bad bots
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: SemrushBot
Disallow: /`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
