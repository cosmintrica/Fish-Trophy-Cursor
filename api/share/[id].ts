/// <reference lib="dom" />

type RecordDTO = {
  species: string;
  weight?: string | number;
  location?: string;
  date?: string;
  title?: string;
  angler?: string;
};

export default async function handler(req: Request) {
  const { pathname } = new URL(req.url);
  const id = pathname.split('/').pop()!; // /api/share/[id]
  
  try {
    // 1) iei datele recordului (titlu, specie, greutate, poză) din API-ul tău
    const response = await fetch(`https://fishtrophy.ro/api/records/${id}`);
    if (!response.ok) {
      throw new Error('Record not found');
    }
    const record = await response.json() as RecordDTO;

    const title = `${record.species} – ${record.weight} • ${record.angler}`;
    const og = `https://fishtrophy.ro/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(record.species)}&domain=FishTrophy.ro`;

    const html = `<!doctype html>
<html lang="ro"><head>
<meta charset="utf-8" />
<title>${title}</title>
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${record.location} • ${record.date}" />
<meta property="og:image" content="${og}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${record.location} • ${record.date}" />
<meta name="twitter:image" content="${og}" />
<meta http-equiv="refresh" content="0; url=/records/${id}" />
</head><body></body></html>`;

    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return new Response('Record not found', { 
      status: 404,
      headers: { 'content-type': 'text/plain' } 
    });
  }
}
