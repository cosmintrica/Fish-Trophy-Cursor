export const config = { runtime: 'edge' };

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';

// Simplified schema for Edge Runtime
const users = {
  id: 'string',
  updated_at: 'Date'
};

const databaseUrl = process.env.DATABASE_URL || '';
const sql = neon(databaseUrl);
const db = drizzle(sql);

export default async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1] || '';
    
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No image file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'File must be an image' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size must be less than 5MB' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Here you would typically upload the file to a storage service (e.g., AWS S3, Cloudinary)
    // For now, we'll just return a success response
    // In production, you should:
    // 1. Upload file to storage service
    // 2. Get the URL
    // 3. Update user profile with image URL
    // 4. Return the image URL

    const imageUrl = `https://example.com/profile-images/${userId}/${file.name}`;

    // Update user profile with image URL
    const updatedUser = await db
      .update(users)
      .set({
        updated_at: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        imageUrl
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
