import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import busboy from 'busboy';

// Minimal debug version
export const handler = async (event) => {
  console.log('🚀 Function started');
  console.log('Event headers:', JSON.stringify(event.headers));

  // Handle CORS
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
    // Check if dependencies are loaded
    console.log('Checking dependencies...');
    console.log('Busboy type:', typeof busboy);
    console.log('S3Client type:', typeof S3Client);

    // Check env vars
    console.log('Checking env vars...');
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;
    console.log('Bucket:', R2_BUCKET_NAME);

    // If we got here, basic setup is OK.
    // Let's try to return a simple success to verify we can send JSON.

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Debug mode active',
        env: {
          bucket: R2_BUCKET_NAME ? 'Set' : 'Missing',
          accountId: (process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID) ? 'Set' : 'Missing'
        }
      })
    };

  } catch (error) {
    console.error('🔥 CRITICAL ERROR:', error);
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
