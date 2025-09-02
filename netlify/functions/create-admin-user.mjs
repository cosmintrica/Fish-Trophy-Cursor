// netlify/functions/create-admin-user.mjs
import { neon } from '@netlify/neon';

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
        // Get admin email from environment variable for security
        const adminEmail = process.env.ADMIN_EMAIL || 'cosmin.trica@outlook.com';
        console.log('🔧 Creating admin user for secure email');
        
        // Check if user already exists
        const existingUsers = await sql`
          SELECT id, firebase_uid, email, display_name, role
          FROM users
          WHERE email = ${adminEmail}
        `;

        if (existingUsers.length > 0) {
          // User exists, just update to admin
          const updatedUsers = await sql`
            UPDATE users
            SET role = 'admin', updated_at = NOW()
            WHERE email = ${adminEmail}
            RETURNING id, firebase_uid, email, display_name, role, updated_at
          `;

          console.log(`✅ Updated existing user to admin`);

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'Existing user updated to admin role',
              data: { role: 'admin', updated: true }
            })
          };
        }

        // Create new admin user
        const newUsers = await sql`
          INSERT INTO users (firebase_uid, email, display_name, role, created_at, updated_at)
          VALUES ('admin-manual-uid', ${adminEmail}, 'Admin User', 'admin', NOW(), NOW())
          RETURNING id, firebase_uid, email, display_name, role, created_at, updated_at
        `;

        const newUser = newUsers[0];
        console.log(`✅ Created new admin user`);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            message: 'Admin user created successfully',
            data: { role: 'admin', created: true }
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
    console.error('❌ Error creating admin user:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error: ' + error.message
      })
    };
  }
}
