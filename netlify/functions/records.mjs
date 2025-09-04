// netlify/functions/records.mjs
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {

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

    if (event.httpMethod === 'GET') {
      console.log('🔍 GET request for records');

      // Get query parameters
      const { user_id, species_id, status, limit = 50 } = event.queryStringParameters || {};

      // Build Supabase query
      let query = supabase
        .from('records')
        .select(`
          id, user_id, species_id, location_id,
          weight, length, date_caught, time_caught,
          image_url, status, rejection_reason,
          created_at, updated_at,
          profiles!records_user_id_fkey(display_name, photo_url),
          fish_species!records_species_id_fkey(name, scientific_name),
          fishing_locations!records_location_id_fkey(name)
        `)
        .order('date_caught', { ascending: false })
        .limit(parseInt(limit));

      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      if (species_id) {
        query = query.eq('species_id', species_id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: records, error } = await query;

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log(`✅ Found ${records?.length || 0} records`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: records || []
        })
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('🆕 POST request for new record');

      const recordData = JSON.parse(event.body || '{}');
      const {
        user_id, species_id, location_id,
        weight, length, date_caught, time_caught,
        image_url, species_name, location_name
      } = recordData;

      // Validate required fields
      if (!user_id || !species_id || !weight || !date_caught) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: user_id, species_id, weight, date_caught'
          })
        };
      }

      // Insert new record using Supabase
      const { data: newRecord, error } = await supabase
        .from('records')
        .insert({
          user_id,
          species_id,
          location_id: location_id || null,
          weight,
          length: length || null,
          date_caught,
          time_caught: time_caught || null,
          image_url: image_url || null,
          species_name: species_name || null,
          location_name: location_name || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log(`✅ Created new record with ID: ${newRecord.id}`);

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: newRecord
        })
      };
    }

    if (event.httpMethod === 'PUT') {
      console.log('🔄 PUT request for record update');

      // Extract record ID from path
      const pathParts = event.path.split('/');
      const recordId = pathParts[pathParts.length - 1];

      if (!recordId || recordId === 'records') {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Record ID is required'
          })
        };
      }

      const updateData = JSON.parse(event.body || '{}');
      const {
        weight, length, date_caught, time_caught,
        image_url, status, rejection_reason
      } = updateData;

      // Build update object for Supabase
      const updateFields = {};

      if (weight !== undefined) updateFields.weight = weight;
      if (length !== undefined) updateFields.length = length;
      if (date_caught !== undefined) updateFields.date_caught = date_caught;
      if (time_caught !== undefined) updateFields.time_caught = time_caught;
      if (image_url !== undefined) updateFields.image_url = image_url;
      if (status !== undefined) updateFields.status = status;
      if (rejection_reason !== undefined) updateFields.rejection_reason = rejection_reason;

      if (Object.keys(updateFields).length === 0) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'No fields to update'
          })
        };
      }

      // Update record using Supabase
      const { data: updatedRecord, error } = await supabase
        .from('records')
        .update(updateFields)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      if (!updatedRecord) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Record not found'
          })
        };
      }

      console.log(`✅ Updated record with ID: ${updatedRecord.id}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: updatedRecord
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
    console.error('❌ Error handling records:', error);
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
