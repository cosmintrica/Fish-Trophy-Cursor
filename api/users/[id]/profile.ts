// Mock API pentru testare - va fi înlocuit cu conexiunea reală la baza de date
export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const firebaseUid = pathname.split('/').pop()!; // /api/users/[id] - id este firebase_uid
  
  try {
    // Mock data pentru testare
    const mockUser = {
      displayName: 'Cosmin Trica',
      email: 'cosmin.trica@outlook.com',
      phone: '0729380830',
      location: 'Slatina',
      bio: 'Pescar pasionat din România!'
    };

    return new Response(JSON.stringify({
      success: true,
      data: mockUser
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
    console.error('Error fetching user profile:', error);
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

    // Mock update - în realitate va fi salvat în baza de date
    const updatedUser = {
      displayName: displayName || 'Cosmin Trica',
      email: email || 'cosmin.trica@outlook.com',
      phone: phone || '0729380830',
      location: location || 'Slatina',
      bio: bio || 'Pescar pasionat din România!'
    };

    return new Response(JSON.stringify({
      success: true,
      data: updatedUser
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
    console.error('Error updating user profile:', error);
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