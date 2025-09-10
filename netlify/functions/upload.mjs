// Upload API - Cloudflare R2 integration for photos and videos

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.VITE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME || 'fishtrophy-content';
const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL;

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
});

const ok = (data, init = {}) => ({
  statusCode: 200,
  headers: cors(),
  body: JSON.stringify(data),
  ...init
});

const bad = (message, status = 400) => ({
  statusCode: status,
  headers: cors(),
  body: JSON.stringify({ success: false, error: message })
});

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors()
    };
  }

  if (event.httpMethod !== 'POST') {
    return bad('Method not allowed', 405);
  }

  try {
    // Parse form data
    const formData = new FormData();
    const boundary = event.headers['content-type']?.split('boundary=')[1];

    if (!boundary) {
      return bad('Invalid content type');
    }

    // Parse multipart form data
    const parts = event.body.split(`--${boundary}`);
    let file = null;
    let category = null;
    let fileName = null;

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        if (part.includes('name="file"')) {
          const fileMatch = part.match(/filename="([^"]+)"/);
          const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
          if (fileMatch && contentTypeMatch) {
            const fileContent = part.split('\r\n\r\n')[1];
            file = {
              name: fileMatch[1],
              type: contentTypeMatch[1],
              content: fileContent
            };
          }
        } else if (part.includes('name="category"')) {
          category = part.split('\r\n\r\n')[1].trim();
        } else if (part.includes('name="fileName"')) {
          fileName = part.split('\r\n\r\n')[1].trim();
        }
      }
    }

    if (!file || !category || !fileName) {
      return bad('Missing required fields');
    }

    // Upload to Cloudflare R2
    const key = `${category}/${fileName}`;
    const buffer = Buffer.from(file.content, 'base64');

    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read'
    });

    await s3Client.send(uploadCommand);

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return ok({
      success: true,
      url: publicUrl,
      key: key
    });

  } catch (error) {
    console.error('Upload error:', error);
    return bad('Upload failed: ' + error.message, 500);
  }
};
