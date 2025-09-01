import { db, users } from '@fishtrophy/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const firebaseUid = pathname.split('/').pop()!; // /api/users/[id] - id este firebase_uid
  
  try {
    console.log(`🔍 GET request for user: ${firebaseUid}`);
    
    // Caută utilizatorul în baza de date
    const user = await db.select().from(users).where(eq(users.firebase_uid, firebaseUid)).limit(1);
    
    if (user.length === 0) {
      // Dacă utilizatorul nu există, îl creează automat
      console.log(`👤 Creating new user: ${firebaseUid}`);
      const newUser = await db.insert(users).values({
        firebase_uid: firebaseUid,
        email: '', // Va fi actualizat când utilizatorul va salva profilul
        display_name: null,
        phone: null,
        location: null,
        bio: null,
        role: 'user'
      }).returning();
      
      console.log(`✅ Created new user: ${firebaseUid}`);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          displayName: newUser[0].display_name || '',
          email: newUser[0].email || '',
          phone: newUser[0].phone || '',
          location: newUser[0].location || '',
          bio: newUser[0].bio || 'Pescar pasionat din România!'
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Returnează datele utilizatorului existent
    const userData = user[0];
    console.log(`✅ Found existing user: ${firebaseUid}`);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        displayName: userData.display_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        location: userData.location || '',
        bio: userData.bio || 'Pescar pasionat din România!'
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch user profile'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function PUT(request: Request) {
  const { pathname } = new URL(request.url);
  const firebaseUid = pathname.split('/').pop()!; // /api/users/[id] - id este firebase_uid
  
  try {
    const body = await request.json();
    const { displayName, email, phone, location, bio } = body;

    console.log(`💾 PUT request for user: ${firebaseUid}`);
    console.log('📝 Received data:', { displayName, email, phone, location, bio });

    // Actualizează utilizatorul în baza de date
    const updatedUser = await db.update(users)
      .set({
        display_name: displayName,
        email: email,
        phone: phone,
        location: location,
        bio: bio,
        updated_at: new Date()
      })
      .where(eq(users.firebase_uid, firebaseUid))
      .returning();

    if (updatedUser.length === 0) {
      // Dacă utilizatorul nu există, îl creează
      console.log(`👤 Creating new user: ${firebaseUid}`);
      const newUser = await db.insert(users).values({
        firebase_uid: firebaseUid,
        email: email || '',
        display_name: displayName || null,
        phone: phone || null,
        location: location || null,
        bio: bio || null,
        role: 'user'
      }).returning();
      
      console.log(`✅ Created and updated new user: ${firebaseUid}`);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          displayName: newUser[0].display_name || '',
          email: newUser[0].email || '',
          phone: newUser[0].phone || '',
          location: newUser[0].location || '',
          bio: newUser[0].bio || 'Pescar pasionat din România!'
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    console.log(`✅ Updated existing user: ${firebaseUid}`);
    console.log('💾 Updated data:', updatedUser[0]);

    return new Response(JSON.stringify({
      success: true,
      data: {
        displayName: updatedUser[0].display_name || '',
        email: updatedUser[0].email || '',
        phone: updatedUser[0].phone || '',
        location: updatedUser[0].location || '',
        bio: updatedUser[0].bio || 'Pescar pasionat din România!'
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update user profile'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}