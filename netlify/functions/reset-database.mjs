// netlify/functions/reset-database.mjs
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

    if (event.httpMethod === 'POST') {
      console.log('🧹 Resetting database - removing duplicate users');
      
      // First, let's see what users we have
      const allUsers = await sql`
        SELECT id, firebase_uid, email, display_name, role, created_at
        FROM users
        ORDER BY created_at ASC
      `;
      
      console.log(`📊 Found ${allUsers.length} users in database`);
      
      // Group users by email to find duplicates
      const usersByEmail = {};
      allUsers.forEach(user => {
        if (!usersByEmail[user.email]) {
          usersByEmail[user.email] = [];
        }
        usersByEmail[user.email].push(user);
      });
      
      // Find duplicates
      const duplicates = Object.entries(usersByEmail).filter(([email, users]) => users.length > 1);
      console.log(`🔍 Found ${duplicates.length} duplicate email groups`);
      
      // Keep only the first user for each email (oldest by created_at)
      const usersToDelete = [];
      duplicates.forEach(([email, users]) => {
        // Sort by created_at and keep the first one
        const sortedUsers = users.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const keepUser = sortedUsers[0];
        const deleteUsers = sortedUsers.slice(1);
        
        console.log(`📧 Email ${email}: keeping user ${keepUser.id} (${keepUser.firebase_uid}), deleting ${deleteUsers.length} duplicates`);
        usersToDelete.push(...deleteUsers);
      });
      
      // Delete duplicate users
      if (usersToDelete.length > 0) {
        const deleteIds = usersToDelete.map(user => user.id);
        
        // Delete records first (foreign key constraint)
        await sql`
          DELETE FROM records 
          WHERE user_id = ANY(${deleteIds})
        `;
        
        // Delete users
        await sql`
          DELETE FROM users 
          WHERE id = ANY(${deleteIds})
        `;
        
        console.log(`🗑️ Deleted ${usersToDelete.length} duplicate users and their records`);
      }
      
      // Also clean up users with empty emails
      const emptyEmailUsers = await sql`
        SELECT id FROM users WHERE email = '' OR email IS NULL
      `;
      
      if (emptyEmailUsers.length > 0) {
        const emptyIds = emptyEmailUsers.map(user => user.id);
        
        // Delete records first
        await sql`
          DELETE FROM records 
          WHERE user_id = ANY(${emptyIds})
        `;
        
        // Delete users
        await sql`
          DELETE FROM users 
          WHERE id = ANY(${emptyIds})
        `;
        
        console.log(`🗑️ Deleted ${emptyEmailUsers.length} users with empty emails`);
      }
      
      // Get final count
      const finalUsers = await sql`
        SELECT id, firebase_uid, email, display_name, role, created_at
        FROM users
        ORDER BY created_at ASC
      `;
      
      console.log(`✅ Database cleanup complete. Final user count: ${finalUsers.length}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Database reset completed successfully',
          data: {
            initialCount: allUsers.length,
            duplicatesFound: duplicates.length,
            usersDeleted: usersToDelete.length + emptyEmailUsers.length,
            finalCount: finalUsers.length,
            users: finalUsers
          }
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
    console.error('❌ Error resetting database:', error);
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
