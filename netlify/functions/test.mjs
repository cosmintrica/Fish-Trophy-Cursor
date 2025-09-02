export async function handler(event) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      message: 'Test function works!',
      method: event.httpMethod,
      path: event.path
    })
  };
}
