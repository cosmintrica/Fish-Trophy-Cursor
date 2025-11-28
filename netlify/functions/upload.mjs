import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import busboy from 'busboy';

export const handler = async (event) => {
  console.log('🚀 Upload function started');

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
    // Get environment variables
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL;

    console.log('Environment check:', {
      accountId: R2_ACCOUNT_ID ? 'Set' : 'Missing',
      accessKey: R2_ACCESS_KEY_ID ? 'Set' : 'Missing',
      secretKey: R2_SECRET_ACCESS_KEY ? 'Set' : 'Missing',
      bucket: R2_BUCKET_NAME || 'Missing',
      publicUrl: R2_PUBLIC_URL || 'Missing'
    });

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      throw new Error('Missing R2 credentials');
    }

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
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
        console.log('📁 File field:', fieldname);
        console.log('📄 File info:', info);
        mimeType = info.mimeType;

        file.on('data', (data) => {
          fileBuffer = Buffer.concat([fileBuffer, data]);
        });
      });

      bb.on('field', (fieldname, value) => {
        console.log(`📝 Field ${fieldname}:`, value);
        if (fieldname === 'fileName') fileName = value;
        if (fieldname === 'category') category = value;
      });

      bb.on('finish', async () => {
        try {
          console.log('✅ Parsing complete');
          console.log('File size:', fileBuffer.length, 'bytes');
          console.log('File name:', fileName);
          console.log('Category:', category);

          if (!fileName || fileBuffer.length === 0) {
            throw new Error('No file received');
          }

          // Upload to R2
          const key = `${category}/${fileName}`;
          console.log('📤 Uploading to R2:', key);

          await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType
          }));

          const fileUrl = `${R2_PUBLIC_URL}/${key}`;
          console.log('✅ Upload successful:', fileUrl);

          resolve({
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              success: true,
              url: fileUrl,
              key: key
            })
          });
        } catch (error) {
          console.error('❌ Upload error:', error);
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
        }
      });

      bb.on('error', (error) => {
        console.error('❌ Busboy error:', error);
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
    console.error('🔥 Function error:', error);
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
