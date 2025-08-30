export const config = { runtime: 'edge' };

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';

// Simplified schema for Edge Runtime
const users = {
  id: 'string',
  display_name: 'string',
  email: 'string',
  role: 'string',
  created_at: 'Date',
  updated_at: 'Date'
};

const databaseUrl = process.env.DATABASE_URL || '';
const sql = neon(databaseUrl);
const db = drizzle(sql);

export default async function GET(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const userId = pathParts[pathParts.length - 1] || '';
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        displayName: user[0].display_name,
        email: user[0].email,
        role: user[0].role,
        createdAt: user[0].created_at,
        updatedAt: user[0].updated_at
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


