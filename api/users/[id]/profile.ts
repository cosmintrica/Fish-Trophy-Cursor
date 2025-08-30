

export default async function GET(request: any) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const userId = pathParts[pathParts.length - 1] || '';
  
  try {
    // Mock user data for now - replace with actual database call later
    const mockUser = {
      id: userId,
      display_name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      success: true,
      data: {
        displayName: mockUser.display_name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at
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


