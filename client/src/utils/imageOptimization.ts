// Image optimization utilities for better SEO and performance

export const imageUtils = {
  // Generate responsive image sources
  generateImageSources: (baseUrl: string, sizes: number[] = [320, 640, 1024, 1920]) => {
    return sizes.map(size => ({
      src: `${baseUrl}?w=${size}&q=80&f=webp`,
      width: size,
      type: 'image/webp'
    }));
  },

  // Generate srcset for responsive images
  generateSrcSet: (baseUrl: string, sizes: number[] = [320, 640, 1024, 1920]) => {
    return sizes
      .map(size => `${baseUrl}?w=${size}&q=80&f=webp ${size}w`)
      .join(', ');
  },

  // Generate fallback srcset for older browsers
  generateFallbackSrcSet: (baseUrl: string, sizes: number[] = [320, 640, 1024, 1920]) => {
    return sizes
      .map(size => `${baseUrl}?w=${size}&q=80 ${size}w`)
      .join(', ');
  },

  // Optimize image for different use cases
  optimizeForUse: (baseUrl: string, use: 'thumbnail' | 'card' | 'hero' | 'gallery') => {
    const configs = {
      thumbnail: { width: 150, height: 150, quality: 80, format: 'webp' },
      card: { width: 400, height: 300, quality: 85, format: 'webp' },
      hero: { width: 1920, height: 1080, quality: 90, format: 'webp' },
      gallery: { width: 800, height: 600, quality: 85, format: 'webp' }
    };

    const config = configs[use];
    return `${baseUrl}?w=${config.width}&h=${config.height}&q=${config.quality}&f=${config.format}`;
  },

  // Generate placeholder for lazy loading
  generatePlaceholder: (width: number, height: number, color: string = '#f3f4f6') => {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">
          Loading...
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  },

  // Check if WebP is supported
  isWebPSupported: (): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  },

  // Get optimal image format
  getOptimalFormat: async (): Promise<'webp' | 'jpeg' | 'png'> => {
    const supportsWebP = await imageUtils.isWebPSupported();
    return supportsWebP ? 'webp' : 'jpeg';
  }
};

// SEO-friendly image component props
export interface SEOImageProps {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
  sizes?: string;
  srcSet?: string;
  use?: 'thumbnail' | 'card' | 'hero' | 'gallery';
}

// Generate SEO-optimized image props
export const generateSEOImageProps = async (
  baseUrl: string,
  alt: string,
  options: Partial<SEOImageProps> = {}
): Promise<SEOImageProps> => {
  const use = options.use || 'card';
  
  return {
    src: imageUtils.optimizeForUse(baseUrl, use),
    alt,
    title: options.title || alt,
    width: options.width || 400,
    height: options.height || 300,
    loading: options.loading || 'lazy',
    className: options.className || '',
    sizes: options.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    srcSet: imageUtils.generateSrcSet(baseUrl),
    ...options
  };
};
