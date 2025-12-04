import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get environment variables
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_ENDPOINT = process.env.R2_ENDPOINT;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      throw new Error('Missing R2 credentials');
    }

    const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      },
      forcePathStyle: false
    });

    // Parse query parameters
    const { fileUrl, prefix } = JSON.parse(event.body || '{}');

    if (!fileUrl && !prefix) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing fileUrl or prefix parameter' })
      };
    }

    // If prefix is provided, delete all files with that prefix
    if (prefix) {
      const deletedFiles = [];
      let continuationToken = undefined;

      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          Prefix: prefix,
          ContinuationToken: continuationToken
        });

        const listResponse = await s3Client.send(listCommand);

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deletePromises = listResponse.Contents.map(async (object) => {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: object.Key
            });
            await s3Client.send(deleteCommand);
            return object.Key;
          });

          const deleted = await Promise.all(deletePromises);
          deletedFiles.push(...deleted);
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          success: true,
          deletedCount: deletedFiles.length,
          deletedFiles
        })
      };
    }

    // If fileUrl is provided, extract the key from the URL
    if (fileUrl) {
      // Extract key from R2 URL using the same logic as r2-proxy.mjs
      // Format from upload.mjs: ${R2_PUBLIC_URL}/${key}
      // Where R2_PUBLIC_URL might include bucket name: https://...r2.cloudflarestorage.com/fishtrophy-content
      // And key is: username/category/subCategory/fileName
      let key = fileUrl;
      
      const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
      
      // Parse URL to get pathname
      try {
        const url = new URL(fileUrl);
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
        if (fileUrl.includes('.r2.cloudflarestorage.com/')) {
          const parts = fileUrl.split('.r2.cloudflarestorage.com/');
          if (parts.length > 1) {
            let pathname = parts[1];
            // Remove bucket name if present
            if (pathname.startsWith(R2_BUCKET_NAME + '/')) {
              key = pathname.substring(R2_BUCKET_NAME.length + 1);
            } else {
              key = pathname;
            }
          }
        } else if (fileUrl.includes(R2_PUBLIC_URL)) {
          // If R2_PUBLIC_URL is in the fileUrl, extract key after it
          const index = fileUrl.indexOf(R2_PUBLIC_URL);
          if (index >= 0) {
            key = fileUrl.substring(index + R2_PUBLIC_URL.length);
            // Remove leading slash
            if (key.startsWith('/')) {
              key = key.substring(1);
            }
            // Remove bucket name if present
            if (key.startsWith(R2_BUCKET_NAME + '/')) {
              key = key.substring(R2_BUCKET_NAME.length + 1);
            }
          }
        } else {
          // Last resort: try to find key after bucket name or domain
          const urlParts = fileUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part === R2_BUCKET_NAME);
          if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
            key = urlParts.slice(bucketIndex + 1).join('/');
          } else {
            // Try to extract from common patterns (username/category/subCategory/fileName)
            const contentIndex = urlParts.findIndex(part => part.includes('r2'));
            if (contentIndex >= 0 && contentIndex < urlParts.length - 1) {
              key = urlParts.slice(contentIndex + 1).join('/');
              // Remove bucket name if present in key
              if (key.startsWith(R2_BUCKET_NAME + '/')) {
                key = key.substring(R2_BUCKET_NAME.length + 1);
              }
            } else {
              // Assume it's already a key (username/category/subCategory/fileName)
              key = fileUrl;
            }
          }
        }
      }
      
      // Final cleanup: remove any leading/trailing slashes
      key = key.replace(/^\/+|\/+$/g, '');
      
      // Log for debugging (only in dev)
      if (process.env.NETLIFY_DEV) {
        console.log('Deleting file from R2:');
        console.log('  Original URL:', fileUrl);
        console.log('  Extracted Key:', key);
        console.log('  Bucket:', R2_BUCKET_NAME);
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
      });

      await s3Client.send(deleteCommand);
      
      if (process.env.NETLIFY_DEV) {
        console.log('✅ Successfully deleted file from R2:', key);
      }

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          success: true,
          deletedKey: key
        })
      };
    }

  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to delete file',
        message: error.message
      })
    };
  }
};


