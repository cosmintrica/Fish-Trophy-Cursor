// netlify/functions/user-register.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { firebase_uid, email, display_name, photo_url } = JSON.parse(event.body || '{}');

    // CRITICAL: Strict validation
    if (!firebase_uid || firebase_uid.length < 10) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Valid Firebase UID is required'
        })
      };
    }

    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Valid email is required'
        })
      };
    }

    console.log(`🆕 Registering new user: ${firebase_uid}, email: ${email}`);

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE firebase_uid = ${firebase_uid} OR email = ${email}
    `;

    if (existingUsers.length > 0) {
      console.log(`❌ User already exists: ${firebase_uid}`);
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'User already exists'
        })
      };
    }

    // Create new user with standard bio for non-admin users
    const isAdmin = email === 'cosmin.trica@outlook.com';
    const standardBio = isAdmin ? 'Administrator Fish Trophy' : 'Pescar pasionat din România!';
    const userRole = isAdmin ? 'admin' : 'user';

    const newUsers = await sql`
      INSERT INTO users (
        firebase_uid, 
        email, 
        display_name, 
        photo_url, 
        role, 
        bio,
        created_at, 
        updated_at
      )
      VALUES (
        ${firebase_uid}, 
        ${email}, 
        ${display_name || ''}, 
        ${photo_url || ''}, 
        ${userRole},
        ${standardBio},
        NOW(), 
        NOW()
      )
      RETURNING id, firebase_uid, email, display_name, photo_url, role, bio, created_at, updated_at
    `;

    if (newUsers.length === 0) {
      throw new Error('Failed to create user');
    }

    const newUser = newUsers[0];
    console.log(`✅ Created new user: ${newUser.id}, role: ${newUser.role}`);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          id: newUser.id,
          firebase_uid: newUser.firebase_uid,
          email: newUser.email,
          displayName: newUser.display_name || '',
          photo_url: newUser.photo_url || '',
          role: newUser.role,
          bio: newUser.bio,
          created_at: newUser.created_at,
          updated_at: newUser.updated_at
        }
      })
    };

  } catch (error) {
    console.error('❌ Error registering user:', error);
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
