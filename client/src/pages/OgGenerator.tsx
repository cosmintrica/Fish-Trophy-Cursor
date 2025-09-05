import { useMemo, useState } from 'react';

export default function OgGenerator() {
  const [title, setTitle] = useState('Fish Trophy');
  const [subtitle, setSubtitle] = useState('Platforma Pescarilor din România');
  const [domain, setDomain] = useState('fishtrophy.ro');

  const url = useMemo(() => {
    const params = new URLSearchParams({ title, subtitle, domain });
    return `/api/og?${params.toString()}`;
  }, [title, subtitle, domain]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Generator Banner Social (Open Graph)</h1>
        <p className="text-gray-600 mb-8">Creează banner-uri frumoase pentru partajarea pe rețelele sociale</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow border">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titlu</label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="Introduceți titlul..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtitlu</label>
                <input 
                  value={subtitle} 
                  onChange={(e) => setSubtitle(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="Introduceți subtitlul..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Domeniu</label>
                <input 
                  value={domain} 
                  onChange={(e) => setDomain(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="Introduceți domeniul..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Deschide Imagine
                </a>
                <a 
                  href={url} 
                  download={`og-${Date.now()}.png`} 
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descarcă PNG
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">Previzualizare</div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">1200x630</div>
            </div>
            <div className="w-full aspect-[1200/630] rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
              <img 
                src={url} 
                alt="Previzualizare OG" 
                className="w-full h-full object-cover transition-all duration-300 hover:scale-105" 
              />
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              Banner-ul se actualizează automat când modifici textul
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

