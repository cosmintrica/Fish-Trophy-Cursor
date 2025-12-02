import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import busboy from 'busboy';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      }
    };
  }

  try {
    // Get environment variables (use R2_* format, no VITE_ prefix needed in Netlify functions)
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const R2_ENDPOINT = process.env.R2_ENDPOINT;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      throw new Error('Missing R2 credentials');
    }

    // Use R2_ENDPOINT if provided, otherwise construct from ACCOUNT_ID
    // R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
    const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      },
      forcePathStyle: false // R2 uses virtual-hosted-style URLs
    });

    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    return new Promise((resolve) => {
      const bb = busboy({ headers: { 'content-type': contentType } });
      let fileBuffer = Buffer.from([]);
      let fileName = '';
      let category = 'submissions';
      let mimeType = '';

      bb.on('file', (fieldname, file, info) => {
        mimeType = info.mimeType;

        file.on('data', (data) => {
          fileBuffer = Buffer.concat([fileBuffer, data]);
        });
      });

      let username = '';
      let subCategory = '';

      bb.on('field', (fieldname, value) => {
        if (fieldname === 'fileName') fileName = value;
        if (fieldname === 'category') category = value;
        if (fieldname === 'subCategory') subCategory = value;
        if (fieldname === 'username') username = value;
      });

      bb.on('finish', async () => {
        try {
          if (!fileName || fileBuffer.length === 0) {
            throw new Error('No file received');
          }

          if (!username) {
            throw new Error('Username is required');
          }

          // New structure: username/category/subCategory/fileName
          // Examples:
          // - username/records/images/record-1_timestamp_file.jpg
          // - username/journal/videos/catch-2_timestamp_file.mp4
          // - username/forum/posts/post-3_timestamp_file.jpg
          let key;
          if (subCategory) {
            key = `${username}/${category}/${subCategory}/${fileName}`;
          } else {
            // Fallback for old structure (backward compatibility)
            key = `${category}/${fileName}`;
          }

          const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType || 'application/octet-stream'
          });

          await s3Client.send(putCommand);

          const fileUrl = `${R2_PUBLIC_URL}/${key}`;

          resolve({
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({
              success: true,
              url: fileUrl,
              key: key
            })
          });
        } catch (error) {
          // More detailed error information for debugging
          const errorMessage = error.message || 'Unknown error';
          const errorCode = error.Code || error.code || 'UNKNOWN';
          
          resolve({
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              success: false,
              error: errorMessage,
              code: errorCode,
              details: error.Code === 'AccessDenied' 
                ? 'Check R2 credentials and bucket permissions. Verify R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are correct.'
                : undefined
            })
          });
        }
      });

      bb.on('error', (error) => {
        resolve({
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        });
      });

      // Write the body to busboy
      const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
      bb.write(bodyBuffer);
      bb.end();
    });

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
