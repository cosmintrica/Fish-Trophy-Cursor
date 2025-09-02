// netlify/functions/setup-admin.mjs
import { neon } from '@netlify/neon';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();

export async function handler(event) {
  const sql = neon();
  
  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: ''
      };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'GET') {
      console.log('🔧 Setting up admin role for cosmin.trica@outlook.com');
      
      // Find user by email
      const users = await sql`
        SELECT id, firebase_uid, email, display_name, role
        FROM users 
        WHERE email = 'cosmin.trica@outlook.com'
      `;

      if (users.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'User cosmin.trica@outlook.com not found in database'
          })
        };
      }

      const user = users[0];
      
      // Update role in database
      const updatedUsers = await sql`
        UPDATE users 
        SET role = 'admin', updated_at = NOW()
        WHERE email = 'cosmin.trica@outlook.com'
        RETURNING id, firebase_uid, email, display_name, role, updated_at
      `;

      // Update Firebase custom claims
      try {
        await auth.setCustomUserClaims(user.firebase_uid, { role: 'admin' });
        console.log(`✅ Updated Firebase custom claims for ${user.firebase_uid} to admin`);
      } catch (error) {
        console.error('❌ Error updating Firebase custom claims:', error);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to update Firebase custom claims'
          })
        };
      }

      const updatedUser = updatedUsers[0];
      console.log(`✅ Successfully set admin role for: ${updatedUser.email}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Admin role successfully assigned to cosmin.trica@outlook.com',
          data: updatedUser
        })
      };
    }

    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}
