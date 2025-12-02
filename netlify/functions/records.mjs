// Records API - CRUD operations for fishing records
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
});

// Helper to get cache headers based on method
const getCacheHeaders = (method) => {
  if (method === 'GET') {
    return {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300'
    };
  }
  // POST/PUT/DELETE should not be cached
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
};

const ok = (data, init = {}, method = 'GET') => ({
  statusCode: 200,
  headers: {
    ...cors(),
    ...getCacheHeaders(method)
  },
  body: JSON.stringify(data),
  ...init
});

const bad = (message, status = 400) => ({
  statusCode: status,
  headers: cors(),
  body: JSON.stringify({ success: false, error: message })
});

const parseBody = async (event) => {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
};

// Verify JWT token and get user
const verifyAuth = async (event) => {
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: 'Invalid token' };
  }

  return { user };
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors()
    };
  }

  const method = event.httpMethod;
  const pathSegments = event.path.replace(/^\/api\//, '').split('/');

  try {
    // GET /api/records - List records with filters
    if (method === 'GET' && pathSegments[0] === 'records') {
      const queryParams = event.queryStringParameters || {};

      let query = supabase
        .from('records')
        .select(`
          *,
          fish_species!inner(common_ro, scientific_name),
          profiles!inner(display_name),
          fishing_locations!inner(name, type, county)
        `)
        .eq('status', 'verified')
        .order('weight', { ascending: false });

      // Apply filters
      if (queryParams.species_id) {
        query = query.eq('species_id', queryParams.species_id);
      }

      if (queryParams.location_id) {
        query = query.eq('location_id', queryParams.location_id);
      }

      if (queryParams.county) {
        query = query.eq('fishing_locations.county', queryParams.county);
      }

      if (queryParams.limit) {
        query = query.limit(parseInt(queryParams.limit));
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching records:', error);
        return bad('Failed to fetch records', 500);
      }

      return ok({ success: true, data: data || [] }, {}, 'GET');
    }

    // POST /api/records - Create new record
    if (method === 'POST' && pathSegments[0] === 'records') {
      const auth = await verifyAuth(event);
      if (auth.error) {
        return bad(auth.error, 401);
      }

      const body = await parseBody(event);
      if (!body) {
        return bad('Invalid JSON body', 400);
      }

      // Validate required fields
      const requiredFields = ['species_id', 'weight_kg', 'length_cm', 'location_id', 'captured_at'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return bad(`Missing required field: ${field}`, 400);
        }
      }

      // Create record with pending status
      const recordData = {
        user_id: auth.user.id,
        species_id: body.species_id,
        species_name: body.species_name || 'Unknown',
        weight: parseFloat(body.weight_kg),
        length: parseInt(body.length_cm),
        location_id: body.location_id,
        location_name: body.location_name || 'Unknown',
        date_caught: body.captured_at.split('T')[0], // Extract date part
        time_caught: body.captured_at.split('T')[1] || null, // Extract time part
        image_url: body.photo_url || null,
        video_url: body.video_url || null,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('records')
        .insert([recordData])
        .select()
        .single();

      if (error) {
        console.error('Error creating record:', error);
        return bad('Failed to create record', 500);
      }

      return ok({ success: true, data }, {}, 'POST');
    }

    // PUT /api/records/:id/approve - Approve record (admin/moderator)
    if (method === 'PUT' && pathSegments[0] === 'records' && pathSegments[2] === 'approve') {
      const auth = await verifyAuth(event);
      if (auth.error) {
        return bad(auth.error, 401);
      }

      // Check if user is admin or moderator
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single();

      if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        return bad('Insufficient permissions', 403);
      }

      const recordId = pathSegments[1];
      if (!recordId) {
        return bad('Record ID required', 400);
      }

      const { data, error } = await supabase
        .from('records')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: auth.user.id
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error approving record:', error);
        return bad('Failed to approve record', 500);
      }

      return ok({ success: true, data }, {}, 'PUT');
    }

    // PUT /api/records/:id - Update record (owner or admin)
    if (method === 'PUT' && pathSegments[0] === 'records' && pathSegments[1] && !pathSegments[2]) {
      const auth = await verifyAuth(event);
      if (auth.error) {
        return bad(auth.error, 401);
      }

      const recordId = pathSegments[1];
      const body = await parseBody(event);

      if (!body) {
        return bad('Invalid JSON body', 400);
      }

      // Check if user owns the record or is admin/moderator
      const { data: record } = await supabase
        .from('fishing_records')
        .select('user_id')
        .eq('id', recordId)
        .single();

      if (!record) {
        return bad('Record not found', 404);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single();

      const isOwner = record.user_id === auth.user.id;
      const isAdminOrModerator = profile && ['admin', 'moderator'].includes(profile.role);

      if (!isOwner && !isAdminOrModerator) {
        return bad('Insufficient permissions', 403);
      }

      // Validate required fields
      const requiredFields = ['species_id', 'weight', 'length_cm', 'location_id', 'captured_at'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return bad(`Missing required field: ${field}`, 400);
        }
      }

      const { data, error } = await supabase
        .from('fishing_records')
        .update({
          species_id: body.species_id,
          weight: parseFloat(body.weight),
          length_cm: parseFloat(body.length_cm),
          location_id: body.location_id,
          captured_at: body.captured_at,
          notes: body.notes || null,
          photo_url: body.photo_url || null,
          video_url: body.video_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating record:', error);
        return bad('Failed to update record', 500);
      }

      return ok({ success: true, data }, {}, 'PUT');
    }

    // PUT /api/records/:id/reject - Reject record (admin/moderator)
    if (method === 'PUT' && pathSegments[0] === 'records' && pathSegments[2] === 'reject') {
      const auth = await verifyAuth(event);
      if (auth.error) {
        return bad(auth.error, 401);
      }

      // Check if user is admin or moderator
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single();

      if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        return bad('Insufficient permissions', 403);
      }

      const recordId = pathSegments[1];
      if (!recordId) {
        return bad('Record ID required', 400);
      }

      const body = await parseBody(event);
      const rejectionReason = body?.reason || 'No reason provided';

      const { data, error } = await supabase
        .from('records')
        .update({
          status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: auth.user.id,
          rejection_reason: rejectionReason
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting record:', error);
        return bad('Failed to reject record', 500);
      }

      return ok({ success: true, data }, {}, 'PUT');
    }

    return bad('Not found', 404);

  } catch (error) {
    console.error('Records API error:', error);
    return bad('Internal server error', 500);
  }
};
