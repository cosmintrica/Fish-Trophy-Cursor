import { useMemo, useState } from 'react';

export default function OgGenerator() {
  const [title, setTitle] = useState('Fish Trophy');
  const [subtitle, setSubtitle] = useState('Platforma Pescarilor din România');
  const [domain, setDomain] = useState('FishTrophy.ro');

  const url = useMemo(() => {
    const params = new URLSearchParams({ title, subtitle, domain });
    return `/api/og?${params.toString()}`;
  }, [title, subtitle, domain]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Generator Banner Social (Open Graph)</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow border">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domeniu</label>
                <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div className="flex gap-3 pt-2">
                <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Deschide Imagine</a>
                <a href={url} download={`og-${Date.now()}.png`} className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-50">Descarcă PNG</a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow border">
            <div className="text-sm text-gray-600 mb-3">Previzualizare (1200x630)</div>
            <div className="w-full aspect-[1200/630] rounded-xl overflow-hidden border">
              <img src={url} alt="Previzualizare OG" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

