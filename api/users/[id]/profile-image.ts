import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from '../../../../packages/db/schema';
import { eq } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL || '';
const sql = neon(databaseUrl);
const db = drizzle(sql);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
