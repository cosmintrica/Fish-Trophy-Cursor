import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Fish, Users, Map } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Mic și elegant */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6">
              <img src="/icon_free.png" alt="Fish Trophy" className="w-16 h-16" onError={(e) => {
                console.error('Failed to load hero icon:', e);
                e.currentTarget.style.display = 'none';
              }} />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Fish Trophy
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Platforma completă pentru pescarii din România. Înregistrează-ți trofeele, 
              urmărește recordurile și explorează locațiile de pescuit.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/leaderboards"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Vezi Recordurile
            </Link>
            <Link
              to="/submission-guide"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-slate-200"
            >
              <Map className="w-5 h-5 mr-2" />
              Ghid Submisie
            </Link>
          </div>
        </div>
      </section>

      {/* Harta cu Locații - Elementul Principal */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Harta Locațiilor de Pescuit
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Explorează cele mai bune locații de pescuit din România. 
              Vezi unde au fost prinse trofeele record și descoperă noi locații.
            </p>
          </div>
          
          {/* Placeholder pentru harta Leaflet */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-300">
            <Map className="w-24 h-24 text-slate-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-slate-700 mb-4">
              Harta Interactivă
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Aici va fi integrată harta Leaflet cu toate locațiile de pescuit din România, 
              inclusiv Marea Neagră și lacurile interioare.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Marea Neagră</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Delta Dunării</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Lacurile din Transilvania</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Râurile din Munții Apuseni</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              De ce Fish Trophy?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Platforma ta completă pentru înregistrarea și gestionarea trofeelor de pescuit
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Recorduri Oficiale</h3>
              <p className="text-slate-600 leading-relaxed">
                Înregistrează-ți trofeele și urmărește recordurile oficiale din România. 
                Fiecare captură este verificată și documentată.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Fish className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Specii Complete</h3>
              <p className="text-slate-600 leading-relaxed">
                Baza de date completă cu toate speciile de pești din România. 
                Informații detaliate despre fiecare specie și habitatul său.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Comunitate</h3>
              <p className="text-slate-600 leading-relaxed">
                Conectează-te cu alți pescari din România. 
                Împărtășește experiențele și descoperă noi locații de pescuit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
            Începe să înregistrezi trofeele tale
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Alătură-te comunității Fish Trophy și fii parte din istoria pescuitului din România
          </p>
          <Link
            to="/leaderboards"
            className="inline-flex items-center justify-center px-10 py-5 bg-white text-blue-600 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Vezi Recordurile
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
