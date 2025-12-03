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
      // Extract key from R2 URL
      // Format: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<key>
      // Or: https://<public-url>/<key>
      let key = fileUrl;
      
      // Remove domain and bucket name if present
      if (fileUrl.includes('.r2.cloudflarestorage.com/')) {
        const parts = fileUrl.split('.r2.cloudflarestorage.com/');
        if (parts.length > 1) {
          key = parts[1].split('/').slice(1).join('/'); // Remove bucket name
        }
      } else if (fileUrl.includes('/')) {
        // Assume it's a relative path or full path
        const urlParts = fileUrl.split('/');
        // Find the part after 'fishtrophy-content' or use the last parts
        const contentIndex = urlParts.findIndex(part => part === 'fishtrophy-content');
        if (contentIndex >= 0 && contentIndex < urlParts.length - 1) {
          key = urlParts.slice(contentIndex + 1).join('/');
        } else {
          // Try to extract from common patterns
          key = urlParts.slice(-3).join('/'); // username/journal/images or videos
        }
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
      });

      await s3Client.send(deleteCommand);

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


