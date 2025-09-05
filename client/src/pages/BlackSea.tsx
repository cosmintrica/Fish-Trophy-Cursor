import { Fish, Waves, Ship, Compass, Navigation, Clock, MapPin, Trophy } from 'lucide-react';

export default function BlackSea() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Marea Neagră
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Secțiunea dedicată pescuitului în Marea Neagră va fi disponibilă în curând!
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-2xl mx-auto mb-12 bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl text-gray-900 mb-2">În Dezvoltare</h2>
            <p className="text-lg text-gray-600 mb-6">
              Lucrăm la o experiență completă pentru pescuitul în Marea Neagră
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Fish className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Specii Marine</h3>
                <p className="text-sm text-gray-600">
                  Catalog complet cu speciile din Marea Neagră
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Locații Speciale</h3>
                <p className="text-sm text-gray-600">
                  Puncte de pescuit optimale pe coasta românească
                </p>
              </div>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">Ce vei găsi aici:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Hărți interactive cu locațiile de pescuit</li>
                <li>• Ghiduri pentru speciile marine</li>
                <li>• Recorduri și clasamente speciale</li>
                <li>• Informații despre sezonalitate</li>
                <li>• Comunitate dedicată pescuitului marin</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Până atunci, explorează celelalte funcționalități ale platformei!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Înapoi la Acasă
            </a>
            <a
              href="/species"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Fish className="w-4 h-4 mr-2" />
              Explorează Speciile
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Vrei să fii primul care află când va fi disponibilă? 
            <br />
            Urmărește-ne pentru actualizări!
          </p>
        </div>
      </div>
    </div>
  );
}