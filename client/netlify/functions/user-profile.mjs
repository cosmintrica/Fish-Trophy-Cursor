// netlify/functions/user-profile.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  console.log('🔍 User Profile function called');
  
  try {
    const sql = neon(); // automatically uses NETLIFY_DATABASE_URL
    console.log('✅ Database connection created');
  
    // Extract firebase_uid from path: /.netlify/functions/user-profile/[firebase_uid]
    const pathParts = event.path.split('/');
    const firebaseUid = pathParts[pathParts.length - 1];
    
    console.log('Firebase UID:', firebaseUid);
    console.log('HTTP Method:', event.httpMethod);
    
    if (!firebaseUid || firebaseUid === 'user-profile') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Firebase UID is required' })
      };
    }
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

    if (event.httpMethod === 'GET') {
      console.log(`🔍 GET request for user profile: ${firebaseUid}`);
      
      const users = await sql`
        SELECT id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        FROM users 
        WHERE firebase_uid = ${firebaseUid}
      `;

      if (users.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      const userData = users[0];
      console.log(`✅ Found user: ${userData.display_name || userData.email}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          data: {
            id: userData.id,
            firebase_uid: userData.firebase_uid,
            email: userData.email,
            displayName: userData.display_name || '',
            photo_url: userData.photo_url || '',
            phone: userData.phone || '',
            role: userData.role,
            bio: userData.bio || '',
            location: userData.location || '',
            website: userData.website || '',
            created_at: userData.created_at,
            updated_at: userData.updated_at
          }
        })
      };
    }

    if (event.httpMethod === 'PUT') {
      console.log(`🔄 PUT request for user profile: ${firebaseUid}`);
      
      const { displayName, display_name, bio, location, website, phone } = JSON.parse(event.body || '{}');
      
      // Map displayName to display_name for database compatibility
      const displayNameToSave = displayName || display_name;

      // Check if user exists first
      const existingUsers = await sql`
        SELECT id FROM users WHERE firebase_uid = ${firebaseUid}
      `;

      if (existingUsers.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      // Update user profile
      const updatedUsers = await sql`
        UPDATE users 
        SET display_name = ${displayNameToSave}, 
            bio = ${bio}, 
            location = ${location}, 
            website = ${website}, 
            phone = ${phone}, 
            updated_at = NOW()
        WHERE firebase_uid = ${firebaseUid}
        RETURNING id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
      `;

      const updatedUser = updatedUsers[0];
      console.log(`✅ Updated user: ${updatedUser.display_name || updatedUser.email}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            id: updatedUser.id,
            firebase_uid: updatedUser.firebase_uid,
            email: updatedUser.email,
            displayName: updatedUser.display_name || '',
            photo_url: updatedUser.photo_url || '',
            phone: updatedUser.phone || '',
            role: updatedUser.role,
            bio: updatedUser.bio || '',
            location: updatedUser.location || '',
            website: updatedUser.website || '',
            created_at: updatedUser.created_at,
            updated_at: updatedUser.updated_at
          }
        })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('❌ Error handling user profile:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
}
