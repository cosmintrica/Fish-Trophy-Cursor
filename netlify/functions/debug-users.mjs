import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export const handler = async (event) => {
  // Handle CORS
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

  try {
    if (event.httpMethod === 'GET') {
      // Get all users to debug
      const users = await sql`
        SELECT id, firebase_uid, email, display_name, bio, location, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
      `;

      console.log(`🔍 Found ${users.length} users in database:`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Firebase UID: ${user.firebase_uid}, Email: ${user.email}, Display Name: ${user.display_name}, Bio: ${user.bio}`);
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            totalUsers: users.length,
            users: users
          }
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const { action } = JSON.parse(event.body || '{}');
      
      if (action === 'check-duplicates') {
        // Check for duplicate firebase_uid
        const duplicates = await sql`
          SELECT firebase_uid, COUNT(*) as count
          FROM users 
          GROUP BY firebase_uid
          HAVING COUNT(*) > 1
        `;

        console.log(`🔍 Duplicate firebase_uid check: ${duplicates.length} duplicates found`);
        duplicates.forEach(dup => {
          console.log(`Duplicate firebase_uid: ${dup.firebase_uid} appears ${dup.count} times`);
        });

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: {
              duplicates: duplicates
            }
          })
        };
      }

      if (action === 'clean-duplicates') {
        // Remove duplicate users, keeping the most recent one
        const cleaned = await sql`
          DELETE FROM users 
          WHERE id NOT IN (
            SELECT DISTINCT ON (firebase_uid) id
            FROM users 
            ORDER BY firebase_uid, updated_at DESC
          )
        `;

        console.log(`🧹 Cleaned ${cleaned.length} duplicate users`);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            message: `Cleaned ${cleaned.length} duplicate users`,
            data: { cleaned: cleaned.length }
          })
        };
      }
    }

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Invalid action. Supported actions: check-duplicates, clean-duplicates'
      })
    };

  } catch (error) {
    console.error('❌ Error in debug-users function:', error);
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
};
