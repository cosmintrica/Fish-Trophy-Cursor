// Mock API pentru testare - va fi înlocuit cu conexiunea reală la baza de date
export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const firebaseUid = pathname.split('/').pop()!; // /api/users/[id] - id este firebase_uid
  
  try {
    console.log(`🔍 GET request for user: ${firebaseUid}`);
    
    // Mock data pentru testare - va fi înlocuit cu query real la baza de date
    const mockUser = {
      displayName: 'Cosmin Trica',
      email: 'cosmin.trica@outlook.com',
      phone: '0729380830',
      location: 'Slatina',
      bio: 'Pescar pasionat din România!'
    };

    console.log(`✅ Returning mock data for user: ${firebaseUid}`);

    return new Response(JSON.stringify({
      success: true,
      data: mockUser,
      message: 'Mock data - database connection pending'
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

    // Mock update - în realitate va fi salvat în baza de date
    const updatedUser = {
      displayName: displayName || 'Cosmin Trica',
      email: email || 'cosmin.trica@outlook.com',
      phone: phone || '0729380830',
      location: location || 'Slatina',
      bio: bio || 'Pescar pasionat din România!'
    };

    console.log(`✅ Mock update successful for user: ${firebaseUid}`);
    console.log('💾 Updated data:', updatedUser);

    return new Response(JSON.stringify({
      success: true,
      data: updatedUser,
      message: 'Mock update successful - database connection pending'
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