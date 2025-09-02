// netlify/functions/records.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL
  
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
      
      let query = `
        SELECT 
          r.id, r.user_id, r.species_id, r.water_body_id, r.location_id,
          r.weight_kg, r.length_cm, r.captured_at, r.coordinates, 
          r.photo_url, r.notes, r.status, r.rejected_reason,
          r.created_at, r.updated_at,
          u.display_name, u.photo_url as user_photo_url,
          s.name as species_name, s.common_name_ro,
          wb.name as water_body_name
        FROM records r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN species s ON s.id = r.species_id
        LEFT JOIN water_bodies wb ON wb.id = r.water_body_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (user_id) {
        query += ` AND r.user_id = $${paramIndex}`;
        params.push(user_id);
        paramIndex++;
      }
      
      if (species_id) {
        query += ` AND r.species_id = $${paramIndex}`;
        params.push(species_id);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND r.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY r.captured_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
      
      const records = await sql.unsafe(query, params);
      
      console.log(`✅ Found ${records.length} records`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: records
        })
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('🆕 POST request for new record');
      
      const recordData = JSON.parse(event.body || '{}');
      const {
        user_id, species_id, water_body_id, location_id,
        weight_kg, length_cm, captured_at, coordinates,
        photo_url, notes
      } = recordData;
      
      // Validate required fields
      if (!user_id || !species_id || !weight_kg || !captured_at) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: user_id, species_id, weight_kg, captured_at'
          })
        };
      }
      
      // Insert new record
      const newRecords = await sql`
        INSERT INTO records (
          user_id, species_id, water_body_id, location_id,
          weight_kg, length_cm, captured_at, coordinates,
          photo_url, notes, status, created_at, updated_at
        )
        VALUES (
          ${user_id}, ${species_id}, ${water_body_id || null}, ${location_id || null},
          ${weight_kg}, ${length_cm || null}, ${captured_at}, ${coordinates || null},
          ${photo_url || null}, ${notes || null}, 'pending', NOW(), NOW()
        )
        RETURNING id, user_id, species_id, water_body_id, location_id,
                  weight_kg, length_cm, captured_at, coordinates,
                  photo_url, notes, status, created_at, updated_at
      `;
      
      const newRecord = newRecords[0];
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
        weight_kg, length_cm, captured_at, coordinates,
        photo_url, notes, status, rejected_reason
      } = updateData;
      
      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (weight_kg !== undefined) {
        updateFields.push(`weight_kg = $${paramIndex}`);
        updateValues.push(weight_kg);
        paramIndex++;
      }
      
      if (length_cm !== undefined) {
        updateFields.push(`length_cm = $${paramIndex}`);
        updateValues.push(length_cm);
        paramIndex++;
      }
      
      if (captured_at !== undefined) {
        updateFields.push(`captured_at = $${paramIndex}`);
        updateValues.push(captured_at);
        paramIndex++;
      }
      
      if (coordinates !== undefined) {
        updateFields.push(`coordinates = $${paramIndex}`);
        updateValues.push(coordinates);
        paramIndex++;
      }
      
      if (photo_url !== undefined) {
        updateFields.push(`photo_url = $${paramIndex}`);
        updateValues.push(photo_url);
        paramIndex++;
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(notes);
        paramIndex++;
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(status);
        paramIndex++;
      }
      
      if (rejected_reason !== undefined) {
        updateFields.push(`rejected_reason = $${paramIndex}`);
        updateValues.push(rejected_reason);
        paramIndex++;
      }
      
      if (updateFields.length === 0) {
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
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(recordId);
      
      const query = `
        UPDATE records 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, user_id, species_id, water_body_id, location_id,
                  weight_kg, length_cm, captured_at, coordinates,
                  photo_url, notes, status, rejected_reason,
                  created_at, updated_at
      `;
      
      const updatedRecords = await sql.unsafe(query, updateValues);
      
      if (updatedRecords.length === 0) {
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
      
      const updatedRecord = updatedRecords[0];
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
