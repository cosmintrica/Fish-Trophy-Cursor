// netlify/functions/admin-role.mjs
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

    // Verify admin authorization
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Authorization header required'
        })
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid token'
        })
      };
    }

    // Check if user is admin
    const userRole = decodedToken.role || 'user';
    if (userRole !== 'admin') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Admin access required'
        })
      };
    }

    if (event.httpMethod === 'GET') {
      console.log('🔍 GET request for user roles');
      
      // Get all users with their roles
      const users = await sql`
        SELECT 
          u.id, u.firebase_uid, u.email, u.display_name, u.role, u.created_at,
          COUNT(r.id) as record_count
        FROM users u
        LEFT JOIN records r ON r.user_id = u.id
        GROUP BY u.id, u.firebase_uid, u.email, u.display_name, u.role, u.created_at
        ORDER BY u.created_at DESC
      `;
      
      console.log(`✅ Found ${users.length} users`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: users
        })
      };
    }

    if (event.httpMethod === 'PUT') {
      console.log('🔄 PUT request for role assignment');
      
      const { firebase_uid, role } = JSON.parse(event.body || '{}');
      
      if (!firebase_uid || !role) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'firebase_uid and role are required'
          })
        };
      }

      if (!['user', 'moderator', 'admin'].includes(role)) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid role. Must be user, moderator, or admin'
          })
        };
      }

      // Update role in database
      const updatedUsers = await sql`
        UPDATE users 
        SET role = ${role}, updated_at = NOW()
        WHERE firebase_uid = ${firebase_uid}
        RETURNING id, firebase_uid, email, display_name, role, updated_at
      `;

      if (updatedUsers.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'User not found'
          })
        };
      }

      // Update Firebase custom claims
      try {
        await auth.setCustomUserClaims(firebase_uid, { role });
        console.log(`✅ Updated Firebase custom claims for ${firebase_uid} to role: ${role}`);
      } catch (error) {
        console.error('❌ Error updating Firebase custom claims:', error);
        // Continue anyway - database is updated
      }

      const updatedUser = updatedUsers[0];
      console.log(`✅ Updated user role: ${updatedUser.email} -> ${role}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
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
    console.error('❌ Error handling admin role:', error);
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
