export default async (req, context) => {
    // Check if we have geo data from Netlify
    const geo = context.geo || {};

    // Default response (fallback)
    const responseData = {
        ip: context.ip,
        country_name: geo.country?.name || "Romania",
        country_code: geo.country?.code || "RO",
        city: geo.city || "Bucharest",
        region: geo.subdivision?.name || "",
        region_code: geo.subdivision?.code || "",
        timezone: geo.timezone || "Europe/Bucharest"
    };

    return new Response(JSON.stringify(responseData), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Allow from anywhere (or restrict to your domain)
            "Cache-Control": "public, max-age=86400" // Cache for 24 hours
        }
    });
};

export const config = {
    path: "/api/geo"
};
