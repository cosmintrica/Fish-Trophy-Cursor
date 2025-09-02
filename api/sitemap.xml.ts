export default async function handler() {
  const baseUrl = 'https://fishtrophy.ro';
  const currentDate = new Date().toISOString();

  // Static pages
  const staticPages = [
    {
      url: '',
      changefreq: 'daily',
      priority: '1.0',
      lastmod: currentDate
    },
    {
      url: '/black-sea',
      changefreq: 'weekly',
      priority: '0.9',
      lastmod: currentDate
    },
    {
      url: '/species',
      changefreq: 'weekly',
      priority: '0.9',
      lastmod: currentDate
    },
    {
      url: '/leaderboards',
      changefreq: 'daily',
      priority: '0.8',
      lastmod: currentDate
    },
    {
      url: '/submission-guide',
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: currentDate
    },
    {
      url: '/fishing-shops',
      changefreq: 'weekly',
      priority: '0.6',
      lastmod: currentDate
    }
  ];

  // TODO: Add dynamic pages (species, records, users) when API is ready
  // const species = await fetchSpecies();
  // const records = await fetchRecords();
  // const users = await fetchUsers();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
