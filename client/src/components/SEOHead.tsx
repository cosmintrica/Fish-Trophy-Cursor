import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  structuredData?: Record<string, unknown>;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export default function SEOHead({
  title = 'Fish Trophy - Platforma Pescarilor din România',
  description = 'Descoperă cele mai bune locații de pescuit din România, urmărește recordurile și concurează cu alții pescari pasionați. Hărți interactive, ghiduri complete și comunitate activă.',
  keywords = 'pescuit, romania, locatii pescuit, recorduri pescuit, harta pescuit, marea neagra, rauri romania, lacuri romania, balti pescuit, specii pesti, tehnici pescuit, echipament pescuit',
  image = 'https://fishtrophy.ro/api/og?title=Fish%20Trophy&subtitle=Platforma%20Pescarilor%20din%20Rom%C3%A2nia&domain=fishtrophy.ro',
  url = 'https://fishtrophy.ro',
  type = 'website',
  author = 'Fish Trophy',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  structuredData,
  canonical,
  noindex = false,
  nofollow = false
}: SEOHeadProps) {
  const fullTitle = title.includes('Fish Trophy') ? title : `${title} | Fish Trophy`;
  const fullUrl = canonical || url;
  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow',
    'max-snippet:-1',
    'max-image-preview:large',
    'max-video-preview:-1'
  ].join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="bingbot" content={robotsContent} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="Fish Trophy" />
      <meta property="og:locale" content="ro_RO" />
      <meta property="og:locale:alternate" content="en_US" />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@fishtrophy" />
      <meta name="twitter:creator" content="@fishtrophy" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={title} />

      {/* Article specific meta tags */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#3b82f6" />
      <meta name="msapplication-TileColor" content="#3b82f6" />
      <meta name="apple-mobile-web-app-title" content="Fish Trophy" />
      <meta name="application-name" content="Fish Trophy" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Geo Meta Tags */}
      <meta name="geo.region" content="RO" />
      <meta name="geo.country" content="Romania" />
      <meta name="geo.placename" content="Romania" />
      <meta name="ICBM" content="45.9432, 24.9668" />

      {/* Language and Content */}
      <meta httpEquiv="content-language" content="ro" />
      <meta name="language" content="Romanian" />
      <meta name="revisit-after" content="1 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
