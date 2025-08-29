import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Fish, Users, Map } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section - Modern, Centered */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-indigo-800/90"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-32 text-center">
          {/* Logo & Title */}
          <div className="mb-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl mb-8">
              <img 
                src="/icon_free.png" 
                alt="Fish Trophy" 
                className="w-16 h-16"
              />
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 tracking-tight">
              Fish Trophy
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Platforma completă pentru pescarii din România
            </p>
            <p className="text-lg text-blue-200 mb-16 max-w-4xl mx-auto leading-relaxed">
              Descoperă cele mai bune locații de pescuit, urmărește recordurile și conectează-te cu comunitatea pescarilor din România.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="/black-sea"
                className="group bg-white text-blue-900 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:bg-blue-50 hover:scale-105 shadow-2xl hover:shadow-blue-500/25"
              >
                <span className="flex items-center space-x-3">
                  <Map className="w-6 h-6" />
                  <span>Explorează Marea Neagră</span>
                </span>
              </Link>
              <Link
                to="/leaderboards"
                className="group border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm"
              >
                Vezi Recordurile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Clean, Modern */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
                  <Map className="w-6 h-6 text-blue-600" />
                </div>
                Harta Locurilor de Pescuit
              </h2>
              
              {/* Filter Buttons - Modern Design */}
              <div className="flex flex-wrap gap-3 mb-8">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-blue-700 transition-all duration-200 shadow-lg">
                  <Map className="w-4 h-4" />
                  <span>Toate</span>
                </button>
                <button className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-slate-200 transition-all duration-200">
                  <span className="text-lg">🌊</span>
                  <span>Râuri</span>
                </button>
                <button className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-slate-200 transition-all duration-200">
                  <span className="text-lg">🏞️</span>
                  <span>Lacuri</span>
                </button>
                <button className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-slate-200 transition-all duration-200">
                  <span className="text-lg">💧</span>
                  <span>Bălți</span>
                </button>
                <button className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-slate-200 transition-all duration-200">
                  <span className="text-lg">🏖️</span>
                  <span>Litoral</span>
                </button>
              </div>
              
              <p className="text-slate-600 text-sm mb-8">
                Faceți click pe orice marker pentru a înregistra un record la acea locație
              </p>
              
              {/* Map Placeholder - Modern */}
              <div className="bg-gradient-to-br from-slate-100 to-blue-100 rounded-2xl h-96 flex items-center justify-center border-2 border-dashed border-slate-300">
                <div className="text-center text-slate-500">
                  <div className="w-20 h-20 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <Map className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium">Harta interactivă</p>
                  <p className="text-sm">În curând va fi disponibilă</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Side Panels */}
          <div className="lg:col-span-1 space-y-8">
            {/* Quick Statistics */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mr-3">
                  <span className="text-xl">⚡</span>
                </div>
                Statistici Rapide
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600">Locuri înregistrate</span>
                  <span className="text-3xl font-bold text-blue-600">5</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600">Recorduri totale</span>
                  <span className="text-3xl font-bold text-green-600">0</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-600">Pescari activi</span>
                  <span className="text-3xl font-bold text-purple-600">0</span>
                </div>
              </div>
            </div>

            {/* Recent Records */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center mr-3">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
                Recorduri Recente
              </h3>
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-600 mb-6">Nu există recorduri recente</p>
                <div className="text-center">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl text-blue-600">+</span>
                  </div>
                  <p className="text-sm text-slate-500">Conectează-te pentru a adăuga recorduri</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section - Modern Cards */}
        <div className="mt-32 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            Caracteristici Principale
          </h2>
          <p className="text-xl text-slate-600 mb-16 max-w-3xl mx-auto">
            Tot ce ai nevoie pentru o experiență completă de pescuit
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <Map className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Hărți Interactive</h3>
              <p className="text-slate-600">Hărți detaliate cu ape, locații și amenități pentru pescuit</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
                <Trophy className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Recorduri</h3>
              <p className="text-slate-600">Sistem complet de recorduri cu moderare și leaderboards</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                <Fish className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Catalog Specii</h3>
              <p className="text-slate-600">Informații detaliate despre toate speciile de pești</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors">
                <Users className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Comunitate</h3>
              <p className="text-slate-600">Conectează-te cu alți pescari și împărtășește experiențele</p>
            </div>
          </div>
        </div>

        {/* Leaderboards Section - Modern */}
        <div className="mt-32">
          <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">Clasamente</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center items-center">
            <select className="px-6 py-3 border border-slate-300 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg">
              <option>Național</option>
            </select>
            <select className="px-6 py-3 border border-slate-300 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg">
              <option>Toate speciile</option>
            </select>
            <select className="px-6 py-3 border border-slate-300 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg">
              <option>Toate județele</option>
            </select>
            <select className="px-6 py-3 border border-slate-300 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg">
              <option>Toate tipurile de apă</option>
            </select>
            <div className="relative">
              <input
                type="text"
                placeholder="Caută după nume utilizator..."
                className="pl-12 pr-6 py-3 border border-slate-300 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg w-72"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300">
              <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🏁</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Clasament Național</h3>
              <p className="text-slate-600">Nu există recorduri disponibile</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Regiunea București</h3>
              <p className="text-slate-600">Nu există recorduri disponibile</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🌊</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Clasament Local</h3>
              <p className="text-slate-600">Nu există recorduri disponibile</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
