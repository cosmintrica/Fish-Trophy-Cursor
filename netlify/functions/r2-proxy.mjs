import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      }
    };
  }

  try {
    // Get R2 credentials
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_ENDPOINT = process.env.R2_ENDPOINT;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.error('Missing R2 credentials');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'R2 configuration missing' })
      };
    }

    // Initialize S3 client for R2
    const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      },
      forcePathStyle: false // R2 uses virtual-hosted-style URLs
    });
    // Log full event structure for debugging (only in dev)
    if (process.env.NETLIFY_DEV) {
      console.log('r2-proxy event structure:', {
        httpMethod: event.httpMethod,
        path: event.path,
        queryStringParameters: event.queryStringParameters,
        multiValueQueryStringParameters: event.multiValueQueryStringParameters,
        rawQuery: event.rawQuery,
        rawUrl: event.rawUrl,
        headers: event.headers,
        allKeys: Object.keys(event)
      });
    }

    // Get the image URL from query parameter
    // Try multiple methods to extract the URL
    let imageUrl = null;

    // Method 1: queryStringParameters (most common in production)
    if (event.queryStringParameters?.url) {
      imageUrl = event.queryStringParameters.url;
      if (process.env.NETLIFY_DEV) {
        console.log('Found URL via queryStringParameters');
        console.log('URL length:', imageUrl.length);
        console.log('Full URL:', imageUrl);
      }
    }
    // Method 2: multiValueQueryStringParameters
    else if (event.multiValueQueryStringParameters?.url?.[0]) {
      imageUrl = event.multiValueQueryStringParameters.url[0];
      if (process.env.NETLIFY_DEV) console.log('Found URL via multiValueQueryStringParameters');
    }
    // Method 3: Parse from rawQuery (common in netlify dev)
    else if (event.rawQuery) {
      const params = new URLSearchParams(event.rawQuery);
      imageUrl = params.get('url');
      if (imageUrl && process.env.NETLIFY_DEV) {
        console.log('Found URL via rawQuery');
      }
    }
    // Method 4: Parse from path if it contains query string
    else if (event.path && event.path.includes('?')) {
      const queryString = event.path.split('?')[1];
      const params = new URLSearchParams(queryString);
      imageUrl = params.get('url');
      if (imageUrl && process.env.NETLIFY_DEV) {
        console.log('Found URL via path parsing');
      }
    }
    // Method 5: Parse from rawUrl if available
    else if (event.rawUrl && event.rawUrl.includes('?')) {
      try {
        const url = new URL(event.rawUrl, 'http://localhost');
        imageUrl = url.searchParams.get('url');
        if (imageUrl && process.env.NETLIFY_DEV) {
          console.log('Found URL via rawUrl parsing');
        }
      } catch (e) {
        if (process.env.NETLIFY_DEV) console.warn('Failed to parse rawUrl:', e);
      }
    }
    // Method 6: Parse from headers (X-Forwarded-Query or similar)
    else if (event.headers) {
      // Try to get from referer or other headers
      const referer = event.headers.referer || event.headers.Referer || event.headers['x-forwarded-uri'];
      if (referer && referer.includes('?')) {
        try {
          const url = new URL(referer);
          imageUrl = url.searchParams.get('url');
          if (imageUrl && process.env.NETLIFY_DEV) {
            console.log('Found URL via headers');
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    // Decode if needed (only if URL contains encoded characters)
    // queryStringParameters already decodes the URL, so we only need to decode if it came from rawQuery
    if (imageUrl) {
      // Only decode if URL contains % (encoded characters)
      // If it came from queryStringParameters, it's already decoded
      if (imageUrl.includes('%')) {
        try {
          let decoded = decodeURIComponent(imageUrl);
          // Check if it needs another decode (double-encoded)
          if (decoded !== imageUrl && decoded.includes('%')) {
            try {
              decoded = decodeURIComponent(decoded);
            } catch (e) {
              // Already decoded
            }
          }
          imageUrl = decoded;
          if (process.env.NETLIFY_DEV) {
            console.log('Decoded URL:', imageUrl.substring(0, 100));
          }
        } catch (e) {
          // If decode fails, use original
          if (process.env.NETLIFY_DEV) {
            console.warn('Failed to decode URL:', e);
          }
        }
      } else {
        // URL is already decoded, use as is
        if (process.env.NETLIFY_DEV) {
          console.log('URL already decoded:', imageUrl.substring(0, 100));
        }
      }
    }

    if (!imageUrl) {
      const debugInfo = {
        queryStringParameters: event.queryStringParameters,
        multiValueQueryStringParameters: event.multiValueQueryStringParameters,
        rawQuery: event.rawQuery,
        rawUrl: event.rawUrl,
        path: event.path,
        httpMethod: event.httpMethod,
        allKeys: Object.keys(event),
        headers: event.headers ? Object.keys(event.headers) : null
      };

      console.error('Missing url parameter. Full event:', JSON.stringify(debugInfo, null, 2));

      // In development, return detailed debug info
      const isDev = process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development';

      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Missing url parameter',
          debug: isDev ? debugInfo : {
            hasQueryParams: !!event.queryStringParameters,
            hasMultiValue: !!event.multiValueQueryStringParameters,
            hasRawQuery: !!event.rawQuery,
            hasRawUrl: !!event.rawUrl,
            path: event.path,
            httpMethod: event.httpMethod
          }
        })
      };
    }

    // Validate that it's an R2 URL
    if (!imageUrl.includes('r2.cloudflarestorage.com') && !imageUrl.includes('cloudflare')) {
      console.error('Invalid R2 URL:', imageUrl);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid R2 URL' })
      };
    }

    // Extract key from R2 URL
    // Format from upload.mjs: ${R2_PUBLIC_URL}/${key}
    // Where R2_PUBLIC_URL might include bucket name: https://...r2.cloudflarestorage.com/fishtrophy-content
    // And key is: username/category/subCategory/fileName
    let key = imageUrl;

    // Parse URL to get pathname
    try {
      const url = new URL(imageUrl);
      let pathname = url.pathname;

      // Remove leading slash
      if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
      }

      // If pathname starts with bucket name, remove it
      // R2_PUBLIC_URL might be: https://...r2.cloudflarestorage.com/fishtrophy-content
      // So pathname might be: fishtrophy-content/username/category/...
      if (pathname.startsWith(R2_BUCKET_NAME + '/')) {
        key = pathname.substring(R2_BUCKET_NAME.length + 1); // Remove bucket name and slash
      } else {
        key = pathname; // Use pathname as is
      }
    } catch (e) {
      // Fallback: manual extraction
      if (imageUrl.includes('.r2.cloudflarestorage.com/')) {
        const parts = imageUrl.split('.r2.cloudflarestorage.com/');
        if (parts.length > 1) {
          let pathname = parts[1];
          // Remove bucket name if present
          if (pathname.startsWith(R2_BUCKET_NAME + '/')) {
            key = pathname.substring(R2_BUCKET_NAME.length + 1);
          } else {
            key = pathname;
          }
        }
      } else {
        // Try to find key after bucket name
        const urlParts = imageUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === R2_BUCKET_NAME);
        if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
          key = urlParts.slice(bucketIndex + 1).join('/');
        } else {
          // Last resort: use everything after domain
          const contentIndex = urlParts.findIndex(part => part.includes('r2.cloudflarestorage.com'));
          if (contentIndex >= 0 && contentIndex < urlParts.length - 1) {
            key = urlParts.slice(contentIndex + 1).join('/');
          }
        }
      }
    }

    if (process.env.NETLIFY_DEV) {
      console.log('Fetching image from R2 - Full URL:', imageUrl);
      console.log('R2_BUCKET_NAME:', R2_BUCKET_NAME);
      console.log('Extracted key:', key);
      console.log('Key length:', key.length);
    }

    // Validate key
    if (!key || key.length === 0) {
      console.error('Invalid key extracted from URL:', imageUrl);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid key extracted from URL' })
      };
    }

    // Fetch the image from R2 using AWS SDK with authentication
    try {
      if (process.env.NETLIFY_DEV) {
        console.log('Calling GetObjectCommand with:', { Bucket: R2_BUCKET_NAME, Key: key });
      }

      const getObjectCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
      });

      // Check if this is a video file by extension
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.wmv', '.flv', '.ogv'];
      const isVideoFile = videoExtensions.some(ext => key.toLowerCase().endsWith(ext));

      if (isVideoFile) {
        // For video files, generate a signed URL and redirect
        // This avoids memory limits and allows direct streaming from R2
        if (process.env.NETLIFY_DEV) {
          console.log('Video file detected, generating signed URL for:', key);
        }

        const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600 // 1 hour expiration
        });

        if (process.env.NETLIFY_DEV) {
          console.log('Generated signed URL for video');
        }

        // Redirect to the signed URL
        return {
          statusCode: 302,
          headers: {
            'Location': signedUrl,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'private, max-age=3500' // Cache slightly less than signed URL expiration
          },
          body: ''
        };
      }

      // For non-video files (images), continue with the original proxy logic
      const response = await s3Client.send(getObjectCommand);

      // Get the image data
      // response.Body is a stream in AWS SDK v3
      const chunks = [];
      for await (const chunk of response.Body) {
        // Convert chunk to Buffer if needed
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const imageBuffer = Buffer.concat(chunks);
      const contentType = response.ContentType || 'image/jpeg';

      // Return the image with CORS headers
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        },
        body: imageBuffer.toString('base64'),
        isBase64Encoded: true
      };
    } catch (error) {
      console.error('Error fetching image from R2:', error);
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.name || 'UnknownError';

      // Handle specific AWS errors
      let statusCode = 500;
      if (errorCode === 'NoSuchKey' || errorCode === 'NotFound') {
        statusCode = 404;
      } else if (errorCode === 'AccessDenied' || errorCode === 'Forbidden') {
        statusCode = 403;
      } else if (errorCode === 'InvalidArgument' || errorCode === 'InvalidRequest') {
        statusCode = 400;
      }

      return {
        statusCode: statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: `Failed to fetch image: ${errorMessage}`,
          code: errorCode,
          key: key.substring(0, 100) // Truncate for security
        })
      };
    }
  } catch (error) {
    console.error('Error in r2-proxy:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};




