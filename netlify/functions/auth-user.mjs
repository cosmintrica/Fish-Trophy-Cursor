// netlify/functions/auth-user.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL
  
  try {
    if (event.httpMethod === 'POST') {
      console.log('🔐 POST request for user creation/authentication');
      
      const { firebase_uid, email, display_name, photo_url } = JSON.parse(event.body || '{}');

      if (!firebase_uid || !email) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Firebase UID and email are required' })
        };
      }

      // Check if user already exists
      const existingUsers = await sql`
        SELECT id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        FROM users 
        WHERE firebase_uid = ${firebase_uid}
      `;

      if (existingUsers.length > 0) {
        // User exists, return existing data
        const userData = existingUsers[0];
        console.log(`✅ Found existing user: ${userData.display_name || userData.email}`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({
            id: userData.id,
            firebase_uid: userData.firebase_uid,
            email: userData.email,
            display_name: userData.display_name || '',
            photo_url: userData.photo_url || '',
            phone: userData.phone || '',
            role: userData.role,
            bio: userData.bio || '',
            location: userData.location || '',
            website: userData.website || '',
            created_at: userData.created_at,
            updated_at: userData.updated_at
          })
        };
      }

      // Create new user
      const newUsers = await sql`
        INSERT INTO users (firebase_uid, email, display_name, photo_url)
        VALUES (${firebase_uid}, ${email}, ${display_name || null}, ${photo_url || null})
        RETURNING id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
      `;

      const newUser = newUsers[0];
      console.log(`✅ Created new user: ${newUser.display_name || newUser.email}`);

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({
          id: newUser.id,
          firebase_uid: newUser.firebase_uid,
          email: newUser.email,
          display_name: newUser.display_name || '',
          photo_url: newUser.photo_url || '',
          phone: newUser.phone || '',
          role: newUser.role,
          bio: newUser.bio || '',
          location: newUser.location || '',
          website: newUser.website || '',
          created_at: newUser.created_at,
          updated_at: newUser.updated_at
        })
      };
    }

    // Handle OPTIONS for CORS
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

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('❌ Error handling user authentication:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}
