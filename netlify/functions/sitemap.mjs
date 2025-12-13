// Dynamic sitemap generator
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Helper to format date for sitemap
const formatDate = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper to escape XML
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const handler = async (event) => {
  try {
    const baseUrl = 'https://fishtrophy.ro';
    const currentDate = new Date().toISOString().split('T')[0];
    
    let urls = [];

    // Static pages
    urls.push({
      loc: `${baseUrl}/`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '1.0'
    });

    urls.push({
      loc: `${baseUrl}/records`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '0.9'
    });

    urls.push({
      loc: `${baseUrl}/species`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8'
    });

    urls.push({
      loc: `${baseUrl}/fishing-shops`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.5'
    });

    urls.push({
      loc: `${baseUrl}/submission-guide`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.5'
    });

    // Privacy & Legal pages
    urls.push({
      loc: `${baseUrl}/privacy`,
      lastmod: currentDate,
      changefreq: 'yearly',
      priority: '0.3'
    });

    urls.push({
      loc: `${baseUrl}/cookies`,
      lastmod: currentDate,
      changefreq: 'yearly',
      priority: '0.3'
    });

    // Forum static pages
    urls.push({
      loc: `${baseUrl}/forum`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '0.9'
    });

    urls.push({
      loc: `${baseUrl}/forum/recent`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '0.8'
    });

    urls.push({
      loc: `${baseUrl}/forum/members`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.7'
    });

    urls.push({
      loc: `${baseUrl}/forum/rules`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.6'
    });

    // Dynamic content from Supabase
    if (supabase) {
      try {
        // 1. Verified Records (with global_id for deep linking)
        const { data: records, error: recordsError } = await supabase
          .from('records')
          .select('id, global_id, updated_at')
          .eq('status', 'verified')
          .not('global_id', 'is', null)
          .limit(1000); // Limit to prevent timeout

        if (!recordsError && records) {
          records.forEach(record => {
            if (record.global_id) {
              urls.push({
                loc: `${baseUrl}/records#record-${record.global_id}`,
                lastmod: formatDate(record.updated_at),
                changefreq: 'monthly',
                priority: '0.8'
              });
            }
          });
        }

        // 2. Forum Topics (with slug) - Simplified query
        // First get topics with basic info
        const { data: topics, error: topicsError } = await supabase
          .from('forum_topics')
          .select('id, slug, subcategory_id, subforum_id, updated_at')
          .eq('is_deleted', false)
          .not('slug', 'is', null)
          .limit(1000);

        if (!topicsError && topics && topics.length > 0) {
          // Get subcategory IDs
          const subcategoryIds = [...new Set(topics.filter(t => t.subcategory_id).map(t => t.subcategory_id))];
          const subforumIds = [...new Set(topics.filter(t => t.subforum_id).map(t => t.subforum_id))];

          // Fetch subcategories with their category slugs
          let subcategoriesMap = new Map();
          if (subcategoryIds.length > 0) {
            const { data: subcategories } = await supabase
              .from('forum_subcategories')
              .select('id, slug, category_id, forum_categories(slug)')
              .in('id', subcategoryIds);

            if (subcategories) {
              subcategories.forEach(subcat => {
                const cat = Array.isArray(subcat.forum_categories) ? subcat.forum_categories[0] : subcat.forum_categories;
                if (cat?.slug && subcat.slug) {
                  subcategoriesMap.set(subcat.id, { subcatSlug: subcat.slug, catSlug: cat.slug });
                }
              });
            }
          }

          // Fetch subforums with their category slugs
          let subforumsMap = new Map();
          if (subforumIds.length > 0) {
            const { data: subforums } = await supabase
              .from('forum_subforums')
              .select('id, slug, category_id, forum_categories(slug)')
              .in('id', subforumIds);

            if (subforums) {
              subforums.forEach(subforum => {
                const cat = Array.isArray(subforum.forum_categories) ? subforum.forum_categories[0] : subforum.forum_categories;
                if (cat?.slug && subforum.slug) {
                  subforumsMap.set(subforum.id, { subforumSlug: subforum.slug, catSlug: cat.slug });
                }
              });
            }
          }

          // Build URLs for topics
          topics.forEach(topic => {
            if (topic.slug) {
              let path = '';
              if (topic.subcategory_id && subcategoriesMap.has(topic.subcategory_id)) {
                const { subcatSlug, catSlug } = subcategoriesMap.get(topic.subcategory_id);
                path = `/forum/${catSlug}/${subcatSlug}/${topic.slug}`;
              } else if (topic.subforum_id && subforumsMap.has(topic.subforum_id)) {
                const { subforumSlug, catSlug } = subforumsMap.get(topic.subforum_id);
                path = `/forum/${catSlug}/${subforumSlug}/${topic.slug}`;
              }

              if (path) {
                urls.push({
                  loc: `${baseUrl}${path}`,
                  lastmod: formatDate(topic.updated_at),
                  changefreq: 'weekly',
                  priority: '0.7'
                });
              }
            }
          });
        }

        // 3. Public Profiles (with username)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, updated_at')
          .not('username', 'is', null)
          .limit(500); // Limit to prevent timeout

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            if (profile.username) {
              urls.push({
                loc: `${baseUrl}/profile/${escapeXml(profile.username)}`,
                lastmod: formatDate(profile.updated_at),
                changefreq: 'weekly',
                priority: '0.6'
              });
            }
          });
        }
      } catch (dbError) {
        console.error('Error fetching dynamic content:', dbError);
        // Continue with static pages if DB fails
      }
    }

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*'
      },
      body: sitemap
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to generate sitemap' })
    };
  }
};
